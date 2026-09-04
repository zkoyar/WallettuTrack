$ErrorActionPreference = "Stop"
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path

$configurationJson = (& docker compose --project-directory $projectRoot config --format json) -join "`n"
if ($LASTEXITCODE -ne 0) {
  throw "The Docker Compose configuration is invalid. Check the .env file."
}

$configuration = $configurationJson | ConvertFrom-Json
$volumeName = ([string]$configuration.volumes.mysql_data.name).Trim()
if ($volumeName -notmatch '^[A-Za-z0-9][A-Za-z0-9_.-]+$') {
  throw "The configured MySQL volume name is missing or unsafe."
}

& docker volume inspect $volumeName *> $null
if ($LASTEXITCODE -ne 0) {
  & docker volume create $volumeName *> $null
  if ($LASTEXITCODE -ne 0) {
    throw "The MySQL volume could not be created: $volumeName"
  }
  Write-Host "Created protected Docker volume: $volumeName"
}
