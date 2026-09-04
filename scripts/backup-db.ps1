param(
  [string]$OutputDirectory = (Join-Path $PSScriptRoot "..\backups"),
  [ValidateRange(1, 3650)]
  [int]$RetentionDays = 30,
  [string]$ContainerId = $env:MYSQL_CONTAINER
)

$ErrorActionPreference = "Stop"
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$outputPath = [IO.Path]::GetFullPath($OutputDirectory)
New-Item -ItemType Directory -Path $outputPath -Force | Out-Null

$resolvedContainerId = ([string]$ContainerId).Trim()
if (-not $resolvedContainerId) {
  $resolvedContainerId = ((& docker compose --project-directory $projectRoot ps -q mysql) |
    Select-Object -First 1).Trim()
}
if (-not $resolvedContainerId) {
  throw "The MySQL container is not running."
}

$timestamp = (Get-Date).ToUniversalTime().ToString("yyyyMMdd-HHmmssfff")
$fileName = "wallettutrack-$timestamp.sql.gz"
$destination = Join-Path $outputPath $fileName
$temporarySuffix = [Guid]::NewGuid().ToString("N")
$containerSql = "/tmp/wallettutrack-backup-$temporarySuffix.sql"
$hostSql = Join-Path $outputPath ".$fileName-$temporarySuffix.sql"
$partialArchive = "$destination.partial-$temporarySuffix"
$completed = $false

try {
  & docker exec $resolvedContainerId sh -lc @'
set -eu
umask 077
MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysqldump --user=root --single-transaction --quick --routines --events --hex-blob --no-tablespaces "$MYSQL_DATABASE" > "$1"
'@ -- $containerSql
  if ($LASTEXITCODE -ne 0) { throw "The database dump could not be created." }

  & docker cp "${resolvedContainerId}:${containerSql}" $hostSql
  if ($LASTEXITCODE -ne 0) { throw "The backup could not be copied." }

  $inputStream = [IO.File]::OpenRead($hostSql)
  try {
    $outputStream = [IO.File]::Open(
      $partialArchive,
      [IO.FileMode]::CreateNew,
      [IO.FileAccess]::Write,
      [IO.FileShare]::None
    )
    try {
      $gzipStream = [IO.Compression.GZipStream]::new(
        $outputStream,
        [IO.Compression.CompressionLevel]::Optimal,
        $true
      )
      try {
        $inputStream.CopyTo($gzipStream)
      } finally {
        $gzipStream.Dispose()
      }
    } finally {
      $outputStream.Dispose()
    }
  } finally {
    $inputStream.Dispose()
  }

  # Read the whole compressed stream before publishing it. This catches a
  # truncated or otherwise invalid archive while the file is still temporary.
  $verifyInput = [IO.File]::OpenRead($partialArchive)
  try {
    $verifyGzip = [IO.Compression.GZipStream]::new(
      $verifyInput,
      [IO.Compression.CompressionMode]::Decompress
    )
    try {
      $buffer = New-Object byte[] 81920
      while ($verifyGzip.Read($buffer, 0, $buffer.Length) -gt 0) {}
    } finally {
      $verifyGzip.Dispose()
    }
  } finally {
    $verifyInput.Dispose()
  }

  [IO.File]::Move($partialArchive, $destination)

  $hash = (Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash.ToLowerInvariant()
  [IO.File]::WriteAllText(
    "$destination.sha256",
    "$hash  $fileName`n",
    (New-Object Text.UTF8Encoding($false))
  )
  $completed = $true
} finally {
  & docker exec $resolvedContainerId rm -f -- $containerSql 2>$null
  foreach ($temporaryPath in @($hostSql, $partialArchive)) {
    if (Test-Path -LiteralPath $temporaryPath -PathType Leaf) {
      Remove-Item -LiteralPath $temporaryPath -Force
    }
  }
  if (-not $completed) {
    foreach ($incompletePath in @($destination, "$destination.sha256")) {
      if (Test-Path -LiteralPath $incompletePath -PathType Leaf) {
        Remove-Item -LiteralPath $incompletePath -Force
      }
    }
  }
}

$cutoff = (Get-Date).ToUniversalTime().AddDays(-$RetentionDays)
Get-ChildItem -LiteralPath $outputPath -File -Filter "wallettutrack-*.sql.gz" |
  Where-Object { $_.LastWriteTimeUtc -lt $cutoff } |
  ForEach-Object {
    $resolved = [IO.Path]::GetFullPath($_.FullName)
    if (-not $resolved.StartsWith($outputPath, [StringComparison]::OrdinalIgnoreCase)) {
      throw "Unsafe backup path: $resolved"
    }
    Remove-Item -LiteralPath $resolved -Force
    $sidecar = "$resolved.sha256"
    if (Test-Path -LiteralPath $sidecar -PathType Leaf) {
      Remove-Item -LiteralPath $sidecar -Force
    }
  }

Write-Host "Backup created: $destination" -ForegroundColor Green
Write-Host "SHA-256: $hash"
