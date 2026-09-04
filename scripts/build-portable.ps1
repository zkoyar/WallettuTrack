param(
  [ValidateSet("amd64", "arm64", "all")]
  [string]$Architecture = "all",
  [string]$Version = "",
  [string]$SourceUrl = ""
)

$ErrorActionPreference = "Stop"
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$templateRoot = Join-Path $PSScriptRoot "portable"
$releaseRoot = Join-Path $projectRoot ".release-tmp"
$utf8NoBom = New-Object Text.UTF8Encoding($false)

function Assert-ChildPath {
  param([string]$Root, [string]$Target)

  $rootPath = [IO.Path]::GetFullPath($Root).TrimEnd("\", "/") + [IO.Path]::DirectorySeparatorChar
  $targetPath = [IO.Path]::GetFullPath($Target)
  if (-not $targetPath.StartsWith($rootPath, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Invalid release path: $targetPath"
  }
}

function Invoke-Docker {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments)

  & docker @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Docker command failed: docker $($Arguments -join ' ')"
  }
}

function Invoke-TextCommand {
  param(
    [Parameter(Mandatory = $true)][string]$FilePath,
    [Parameter(ValueFromRemainingArguments = $true)][string[]]$ArgumentList
  )

  $output = & $FilePath @ArgumentList
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed: $FilePath $($ArgumentList -join ' ')"
  }
  return ($output -join "`n")
}

function Write-Template {
  param(
    [string]$Source,
    [string]$Destination,
    [string]$TargetArchitecture,
    [string]$ReleaseVersion,
    [string]$SourceRevision,
    [string]$ReleaseSourceUrl,
    [string]$BuildTimestamp
  )

  $content = [IO.File]::ReadAllText($Source)
  $content = $content.Replace("__VERSION__", $ReleaseVersion)
  $content = $content.Replace("__ARCH__", $TargetArchitecture)
  $content = $content.Replace("__SOURCE_REVISION__", $SourceRevision)
  $content = $content.Replace("__SOURCE_URL__", $ReleaseSourceUrl)
  $content = $content.Replace("__BUILD_TIMESTAMP__", $BuildTimestamp)
  [IO.File]::WriteAllText($Destination, $content, $utf8NoBom)
}

function Build-PortableArchive {
  param(
    [string]$TargetArchitecture,
    [string]$ReleaseVersion,
    [string]$SourceRevision,
    [string]$ReleaseSourceUrl,
    [string]$BuildTimestamp,
    [string]$ReleaseRunRoot
  )

  $platform = "linux/$TargetArchitecture"
  $appImage = "wallettutrack-app:$ReleaseVersion-$TargetArchitecture"
  $migrateImage = "wallettutrack-migrate:$ReleaseVersion-$TargetArchitecture"
  $mysqlImage = "wallettutrack-mysql:8.4.12-$TargetArchitecture"
  $mysqlBaseImages = @{
    amd64 = "container-registry.oracle.com/mysql/community-server:8.4.12@sha256:7dcc4add9183664de3a214daf85a50c3ba6cccfd7534f700b6561bf5b41885be"
    arm64 = "container-registry.oracle.com/mysql/community-server:8.4.12-aarch64@sha256:b47aed6d0a79fbb71d55ca0d0a928bf6f9427b17310635e8c4945814559c2b06"
  }
  $mysqlBaseImage = $mysqlBaseImages[$TargetArchitecture]
  if (-not $mysqlBaseImage) {
    throw "No pinned MySQL image is configured for $TargetArchitecture."
  }
  $mysqlDockerfile = Join-Path $templateRoot "mysql.Dockerfile"
  $stage = Join-Path $ReleaseRunRoot $TargetArchitecture
  $artifactOutputRoot = Join-Path $ReleaseRunRoot "artifacts"
  Assert-ChildPath -Root $ReleaseRunRoot -Target $stage
  Assert-ChildPath -Root $ReleaseRunRoot -Target $artifactOutputRoot

  if (Test-Path -LiteralPath $stage) {
    Remove-Item -LiteralPath $stage -Recurse -Force
  }
  New-Item -ItemType Directory -Path $stage | Out-Null
  New-Item -ItemType Directory -Path $artifactOutputRoot -Force | Out-Null

  $sourceArchiveName = "wallettutrack-source-$ReleaseVersion.zip"
  $sourceArchive = Join-Path $stage $sourceArchiveName
  & git -C $projectRoot archive --format=zip --output=$sourceArchive HEAD
  if ($LASTEXITCODE -ne 0) {
    throw "Unable to create the corresponding-source archive."
  }

  $sbomName = "wallettutrack-runtime-sbom.spdx.json"
  $sbomPath = Join-Path $stage $sbomName
  Push-Location $projectRoot
  try {
    $sbom = Invoke-TextCommand npm sbom `
      --package-lock-only `
      --omit=dev `
      --sbom-format=spdx `
      --sbom-type=application
  } finally {
    Pop-Location
  }
  [IO.File]::WriteAllText($sbomPath, "$sbom`n", $utf8NoBom)
  try {
    $sbomDocument = $sbom | ConvertFrom-Json
  } catch {
    throw "npm produced an invalid SPDX JSON document: $($_.Exception.Message)"
  }
  if ($sbomDocument.spdxVersion -ne "SPDX-2.3") {
    throw "Unexpected SPDX version in the generated SBOM: $($sbomDocument.spdxVersion)"
  }

  Write-Host ""
  Write-Host "Building application image ($platform)..." -ForegroundColor Cyan
  $appBuildMetadata = Join-Path $stage "buildkit-application.metadata.json"
  Invoke-Docker buildx build `
    --platform $platform `
    --target application `
    --tag $appImage `
    --build-arg "APP_VERSION=$ReleaseVersion" `
    --build-arg "SOURCE_REVISION=$SourceRevision" `
    --build-arg "SOURCE_URL=$ReleaseSourceUrl" `
    --metadata-file $appBuildMetadata `
    --load `
    $projectRoot

  Write-Host "Building migration image ($platform)..." -ForegroundColor Cyan
  $migrateBuildMetadata = Join-Path $stage "buildkit-migrations.metadata.json"
  Invoke-Docker buildx build `
    --platform $platform `
    --target migrations `
    --tag $migrateImage `
    --build-arg "APP_VERSION=$ReleaseVersion" `
    --build-arg "SOURCE_REVISION=$SourceRevision" `
    --build-arg "SOURCE_URL=$ReleaseSourceUrl" `
    --metadata-file $migrateBuildMetadata `
    --load `
    $projectRoot

  Write-Host "Preparing MySQL image ($platform)..." -ForegroundColor Cyan
  $mysqlBuildMetadata = Join-Path $stage "buildkit-mysql.metadata.json"
  Invoke-Docker buildx build `
    --platform $platform `
    --file $mysqlDockerfile `
    --tag $mysqlImage `
    --build-arg "MYSQL_BASE_IMAGE=$mysqlBaseImage" `
    --metadata-file $mysqlBuildMetadata `
    --load `
    $projectRoot

  $actualAppArchitecture = (& docker image inspect --format "{{.Architecture}}" $appImage).Trim()
  $actualMigrateArchitecture = (& docker image inspect --format "{{.Architecture}}" $migrateImage).Trim()
  $actualMysqlArchitecture = (& docker image inspect --format "{{.Architecture}}" $mysqlImage).Trim()
  if (
    $actualAppArchitecture -ne $TargetArchitecture -or
    $actualMigrateArchitecture -ne $TargetArchitecture -or
    $actualMysqlArchitecture -ne $TargetArchitecture
  ) {
    throw "Unexpected image architecture: app=$actualAppArchitecture, migrate=$actualMigrateArchitecture, mysql=$actualMysqlArchitecture"
  }

  $imageArchiveName = "wallettutrack-images-$TargetArchitecture.tar"
  $imageArchive = Join-Path $stage $imageArchiveName
  Write-Host "Exporting images..." -ForegroundColor Cyan
  Invoke-Docker save --output $imageArchive $appImage $migrateImage $mysqlImage

  $templates = @{
    "compose.yaml.template" = "compose.yaml"
    "start.ps1.template" = "start.ps1"
    "start.bat.template" = "start.bat"
    "start.sh.template" = "start.sh"
    "stop.bat.template" = "stop.bat"
    "stop.sh.template" = "stop.sh"
    "verify.ps1.template" = "verify.ps1"
    "verify.sh.template" = "verify.sh"
    "configuration.env.example.template" = "configuration.env.example"
    "README.txt.template" = "README.txt"
    "THIRD-PARTY-NOTICES.txt.template" = "THIRD-PARTY-NOTICES.txt"
    "VERSION.txt.template" = "VERSION.txt"
  }
  foreach ($template in $templates.GetEnumerator()) {
    Write-Template `
      -Source (Join-Path $templateRoot $template.Key) `
      -Destination (Join-Path $stage $template.Value) `
      -TargetArchitecture $TargetArchitecture `
      -ReleaseVersion $ReleaseVersion `
      -SourceRevision $SourceRevision `
      -ReleaseSourceUrl $ReleaseSourceUrl `
      -BuildTimestamp $BuildTimestamp
  }

  Copy-Item -LiteralPath (Join-Path $projectRoot "LICENSE") -Destination (Join-Path $stage "LICENSE")

  $sourceArchiveHash = (Get-FileHash -LiteralPath $sourceArchive -Algorithm SHA256).Hash.ToLowerInvariant()
  $imageDetails = @()
  foreach ($imageReference in @($appImage, $migrateImage, $mysqlImage)) {
    $inspectJson = Invoke-TextCommand docker image inspect $imageReference
    $inspect = @($inspectJson | ConvertFrom-Json)[0]
    $imageDetails += [ordered]@{
      reference = $imageReference
      id = $inspect.Id
      repoDigests = @($inspect.RepoDigests)
      created = $inspect.Created
      os = $inspect.Os
      architecture = $inspect.Architecture
      variant = $inspect.Variant
      size = $inspect.Size
      labels = $inspect.Config.Labels
    }
  }

  $releaseMetadata = [ordered]@{
    schemaVersion = 1
    project = "WallettuTrack"
    version = $ReleaseVersion
    platform = $platform
    sourceRevision = $SourceRevision
    sourceUrl = $ReleaseSourceUrl
    sourceArchive = [ordered]@{
      file = $sourceArchiveName
      sha256 = $sourceArchiveHash
    }
    builtAt = $BuildTimestamp
    images = $imageDetails
  } | ConvertTo-Json -Depth 10
  [IO.File]::WriteAllText(
    (Join-Path $stage "BUILD-METADATA.json"),
    "$releaseMetadata`n",
    $utf8NoBom
  )

  $checksumLines = Get-ChildItem -LiteralPath $stage -File |
    Where-Object { $_.Name -ne "SHA256SUMS.txt" } |
    Sort-Object -Property Name |
    ForEach-Object {
      $hash = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
      "$hash  $($_.Name)"
    }
  [IO.File]::WriteAllText(
    (Join-Path $stage "SHA256SUMS.txt"),
    "$($checksumLines -join "`n")`n",
    $utf8NoBom
  )

  $zipName = "WallettuTrack-Portable-$ReleaseVersion-$TargetArchitecture.zip"
  $zipPath = Join-Path $artifactOutputRoot $zipName
  if (Test-Path -LiteralPath $zipPath) {
    throw "Release artifact already exists and will not be overwritten: $zipPath"
  }

  Write-Host "Creating $zipName..." -ForegroundColor Cyan
  Compress-Archive `
    -Path (Join-Path $stage "*") `
    -DestinationPath $zipPath `
    -CompressionLevel Optimal

  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $zip = [IO.Compression.ZipFile]::OpenRead($zipPath)
  try {
    $entryNames = @($zip.Entries | ForEach-Object { $_.FullName.Replace("\", "/") })
    foreach ($required in @(
      "compose.yaml",
      "start.ps1",
      "start.sh",
      "verify.ps1",
      "verify.sh",
      "LICENSE",
      "THIRD-PARTY-NOTICES.txt",
      "BUILD-METADATA.json",
      "buildkit-application.metadata.json",
      "buildkit-migrations.metadata.json",
      "buildkit-mysql.metadata.json",
      $sbomName,
      $sourceArchiveName,
      $imageArchiveName,
      "SHA256SUMS.txt"
    )) {
      if ($entryNames -notcontains $required) {
        throw "File $required is missing from archive $zipName"
      }
    }
  } finally {
    $zip.Dispose()
  }

  $zipHash = (Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash.ToLowerInvariant()
  [IO.File]::WriteAllText(
    "$zipPath.sha256",
    "$zipHash  $zipName`n",
    $utf8NoBom
  )

  Remove-Item -LiteralPath $stage -Recurse -Force
  Write-Host "Prepared: $zipPath" -ForegroundColor Green
  Write-Host "SHA256: $zipHash"
}

$package = Get-Content -LiteralPath (Join-Path $projectRoot "package.json") -Raw |
  ConvertFrom-Json
if (-not $Version) {
  $Version = $package.version
}
if ($Version -notmatch '^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$') {
  throw "Invalid version: $Version"
}
if ($Version -ne $package.version) {
  throw "Release version $Version does not match package.json version $($package.version)."
}
$targets = if ($Architecture -eq "all") {
  @("amd64", "arm64")
} else {
  @($Architecture)
}
foreach ($target in $targets) {
  $artifactName = "WallettuTrack-Portable-$Version-$target.zip"
  foreach ($artifactPath in @(
    (Join-Path $projectRoot $artifactName),
    (Join-Path $projectRoot "$artifactName.sha256")
  )) {
    if (Test-Path -LiteralPath $artifactPath) {
      throw "Release artifact already exists and will not be overwritten: $artifactPath"
    }
  }
}

foreach ($requiredCommand in @("git", "npm", "docker")) {
  if (-not (Get-Command $requiredCommand -ErrorAction SilentlyContinue)) {
    throw "$requiredCommand is not available."
  }
}

$gitStatus = Invoke-TextCommand git -C $projectRoot status --porcelain=v1 --untracked-files=all
if ($gitStatus) {
  throw "The Git worktree must be clean before packaging so images and bundled source correspond exactly."
}
$sourceRevision = (Invoke-TextCommand git -C $projectRoot rev-parse HEAD).Trim()
if ($sourceRevision -notmatch '^[0-9a-f]{40}$') {
  throw "Unable to determine the full source revision."
}
if (-not $SourceUrl) {
  $originUrlOutput = & git -C $projectRoot config --get remote.origin.url
  if ($LASTEXITCODE -eq 0) {
    $originUrl = ($originUrlOutput -join "`n").Trim()
    if ($originUrl -match '^git@([^:]+):(.+?)(?:\.git)?$') {
      $SourceUrl = "https://$($Matches[1])/$($Matches[2])"
    } elseif ($originUrl -match '^https://') {
      $originUri = [Uri]$originUrl
      if (-not $originUri.UserInfo) {
        $SourceUrl = $originUrl
      } else {
        Write-Warning "The origin URL contains credentials and will not be embedded in the release."
      }
    }
  } elseif ($LASTEXITCODE -ne 1) {
    throw "Unable to read the Git origin URL."
  }
}
if ($SourceUrl) {
  $sourceUri = $null
  if (
    -not [Uri]::TryCreate($SourceUrl, [UriKind]::Absolute, [ref]$sourceUri) -or
    $sourceUri.Scheme -ne "https" -or
    $sourceUri.UserInfo
  ) {
    throw "SourceUrl must be a credential-free absolute HTTPS URL."
  }
}
$buildTimestamp = [DateTime]::UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ")

Invoke-Docker info *> $null
Invoke-Docker buildx version *> $null

if (-not (Test-Path -LiteralPath $templateRoot -PathType Container)) {
  throw "Portable templates not found: $templateRoot"
}
New-Item -ItemType Directory -Path $releaseRoot -Force | Out-Null
$releaseRunRoot = Join-Path $releaseRoot ("run-" + [Guid]::NewGuid().ToString("N"))
Assert-ChildPath -Root $releaseRoot -Target $releaseRunRoot
New-Item -ItemType Directory -Path $releaseRunRoot | Out-Null

if ($null -eq $env:BUILDX_METADATA_PROVENANCE) {
  $previousBuildxMetadataProvenance = $null
} else {
  $previousBuildxMetadataProvenance = $env:BUILDX_METADATA_PROVENANCE
}
$env:BUILDX_METADATA_PROVENANCE = "max"
try {
  foreach ($target in $targets) {
    Build-PortableArchive `
      -TargetArchitecture $target `
      -ReleaseVersion $Version `
      -SourceRevision $sourceRevision `
      -ReleaseSourceUrl $SourceUrl `
      -BuildTimestamp $buildTimestamp `
      -ReleaseRunRoot $releaseRunRoot
  }

  foreach ($target in $targets) {
    $artifactName = "WallettuTrack-Portable-$Version-$target.zip"
    foreach ($fileName in @($artifactName, "$artifactName.sha256")) {
      $preparedPath = Join-Path (Join-Path $releaseRunRoot "artifacts") $fileName
      $publishedPath = Join-Path $projectRoot $fileName
      if (-not (Test-Path -LiteralPath $preparedPath -PathType Leaf)) {
        throw "Prepared release artifact is missing: $preparedPath"
      }
      if (Test-Path -LiteralPath $publishedPath) {
        throw "Release artifact appeared during packaging and will not be overwritten: $publishedPath"
      }
      [IO.File]::Move($preparedPath, $publishedPath)
      Write-Host "Published: $publishedPath" -ForegroundColor Green
    }
  }
} finally {
  if ($null -eq $previousBuildxMetadataProvenance) {
    Remove-Item Env:BUILDX_METADATA_PROVENANCE -ErrorAction SilentlyContinue
  } else {
    $env:BUILDX_METADATA_PROVENANCE = $previousBuildxMetadataProvenance
  }
}

if (Test-Path -LiteralPath $releaseRunRoot) {
  Remove-Item -LiteralPath $releaseRunRoot -Recurse -Force
}

if ((Get-ChildItem -LiteralPath $releaseRoot -Force | Measure-Object).Count -eq 0) {
  Remove-Item -LiteralPath $releaseRoot -Force
}
