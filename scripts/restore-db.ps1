param(
  [Parameter(Mandatory = $true)]
  [string]$BackupFile,
  [Parameter(Mandatory = $true)]
  [ValidateSet("RESTORE")]
  [string]$Confirm,
  [switch]$SkipSafetyBackup,
  [string]$SafetyBackupDirectory = (Join-Path $PSScriptRoot "..\backups"),
  [string]$ContainerId = $env:MYSQL_CONTAINER
)

$ErrorActionPreference = "Stop"
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$backupPath = (Resolve-Path -LiteralPath $BackupFile).Path
if (-not $backupPath.EndsWith(".sql.gz", [StringComparison]::OrdinalIgnoreCase)) {
  throw "The backup file must have the .sql.gz extension."
}

$sidecar = "$backupPath.sha256"
if (-not (Test-Path -LiteralPath $sidecar -PathType Leaf)) {
  throw "The required checksum file is missing: $sidecar"
}
$expected = ((Get-Content -LiteralPath $sidecar -Raw).Trim() -split "\s+")[0]
if ($expected -notmatch '^[a-fA-F0-9]{64}$') {
  throw "The backup checksum file is malformed."
}
$actual = (Get-FileHash -LiteralPath $backupPath -Algorithm SHA256).Hash
if (-not $actual.Equals($expected, [StringComparison]::OrdinalIgnoreCase)) {
  throw "The backup SHA-256 checksum is invalid."
}

$resolvedContainerId = ([string]$ContainerId).Trim()
if (-not $resolvedContainerId) {
  $resolvedContainerId = ((& docker compose --project-directory $projectRoot ps -q mysql) |
    Select-Object -First 1).Trim()
}
if (-not $resolvedContainerId) { throw "The MySQL container is not running." }
$databaseName = ((& docker exec $resolvedContainerId printenv MYSQL_DATABASE) |
  Select-Object -First 1).Trim()
if ($LASTEXITCODE -ne 0 -or $databaseName -notmatch '^[A-Za-z0-9_]+$') {
  throw "The configured MySQL database name is missing or unsafe."
}
$rootPassword = ((& docker exec $resolvedContainerId printenv MYSQL_ROOT_PASSWORD) |
  Select-Object -First 1).Trim()
if ($LASTEXITCODE -ne 0 -or -not $rootPassword) {
  throw "The configured MySQL root credential is missing."
}

$temporarySuffix = [Guid]::NewGuid().ToString("N")
$containerTemporary = "/tmp/wallettutrack-restore-$temporarySuffix.sql"
$hostTemporary = Join-Path ([IO.Path]::GetTempPath()) "wallettutrack-restore-$temporarySuffix.sql"
$restoreStarted = $false
$restoreCompleted = $false

try {
  try {
    $inputStream = [IO.File]::OpenRead($backupPath)
    try {
      $gzipStream = [IO.Compression.GZipStream]::new(
        $inputStream,
        [IO.Compression.CompressionMode]::Decompress
      )
      try {
        $outputStream = [IO.File]::Open(
          $hostTemporary,
          [IO.FileMode]::CreateNew,
          [IO.FileAccess]::Write,
          [IO.FileShare]::None
        )
        try {
          $gzipStream.CopyTo($outputStream)
        } finally {
          $outputStream.Dispose()
        }
      } finally {
        $gzipStream.Dispose()
      }
    } finally {
      $inputStream.Dispose()
    }
    if ((Get-Item -LiteralPath $hostTemporary).Length -eq 0) {
      throw "The decompressed backup is empty."
    }
  } catch {
    throw "The backup gzip archive is invalid: $($_.Exception.Message)"
  }

  & docker cp $hostTemporary "${resolvedContainerId}:${containerTemporary}"
  if ($LASTEXITCODE -ne 0) { throw "The backup could not be copied." }

  & docker compose --project-directory $projectRoot stop --timeout 30 app
  if ($LASTEXITCODE -ne 0) { throw "The application could not be stopped safely." }
  $restoreStarted = $true

  if (-not $SkipSafetyBackup) {
    & (Join-Path $PSScriptRoot "backup-db.ps1") `
      -OutputDirectory $SafetyBackupDirectory `
      -ContainerId $resolvedContainerId
  }

  $recreateSql = "DROP DATABASE IF EXISTS ``$databaseName``; CREATE DATABASE ``$databaseName`` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;"
  & docker exec `
    --env "MYSQL_PWD=$rootPassword" `
    $resolvedContainerId `
    mysql `
    --user=root `
    "--execute=$recreateSql"
  if ($LASTEXITCODE -ne 0) { throw "The target database could not be recreated." }

  $sourceSql = "SOURCE $containerTemporary"
  & docker exec `
    --env "MYSQL_PWD=$rootPassword" `
    $resolvedContainerId `
    mysql `
    --user=root `
    $databaseName `
    "--execute=$sourceSql"
  if ($LASTEXITCODE -ne 0) { throw "The database could not be restored." }

  & docker compose --project-directory $projectRoot run --rm --no-deps migrate
  if ($LASTEXITCODE -ne 0) {
    throw "The database was restored, but deployment migrations failed."
  }

  & docker compose --project-directory $projectRoot up -d --no-deps --force-recreate app
  if ($LASTEXITCODE -ne 0) {
    throw "The database was restored, but the application could not be restarted."
  }

  $appContainerId = ((& docker compose --project-directory $projectRoot ps -q app) |
    Select-Object -First 1).Trim()
  $health = ""
  for ($attempt = 1; $attempt -le 60; $attempt++) {
    if ($appContainerId) {
      $health = ((& docker inspect --format "{{.State.Health.Status}}" $appContainerId 2>$null) |
        Select-Object -First 1).Trim()
    }
    if ($health -eq "healthy") { break }
    Start-Sleep -Seconds 2
  }
  if ($health -ne "healthy") {
    & docker compose --project-directory $projectRoot logs --tail 100 app
    & docker compose --project-directory $projectRoot stop --timeout 30 app
    throw "The restored application did not become healthy and was stopped."
  }
  $restoreCompleted = $true
} finally {
  & docker exec $resolvedContainerId rm -f -- $containerTemporary 2>$null
  if (Test-Path -LiteralPath $hostTemporary -PathType Leaf) {
    Remove-Item -LiteralPath $hostTemporary -Force
  }
  if ($restoreStarted -and -not $restoreCompleted) {
    Write-Warning "Restore did not complete; the application remains stopped to avoid serving a partial database."
  }
}

Write-Host "Database restored, migrations applied, and application restarted." -ForegroundColor Green
