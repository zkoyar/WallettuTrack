param(
  [Parameter(Mandatory = $true)]
  [string]$BackupFile,
  [Parameter(Mandatory = $true)]
  [ValidateSet("ROTATE")]
  [string]$Confirm,
  [string]$EnvFile = (Join-Path $PSScriptRoot "..\.env"),
  [string]$ContainerId = $env:MYSQL_CONTAINER
)

$ErrorActionPreference = "Stop"
$envPath = (Resolve-Path -LiteralPath $EnvFile).Path
$backupPath = (Resolve-Path -LiteralPath $BackupFile).Path
$sidecarPath = "$backupPath.sha256"

if (-not (Test-Path -LiteralPath $sidecarPath -PathType Leaf)) {
  throw "The required backup checksum is missing: $sidecarPath"
}
$expectedHash = ((Get-Content -LiteralPath $sidecarPath -Raw).Trim() -split "\s+")[0]
if ($expectedHash -notmatch '^[a-fA-F0-9]{64}$') {
  throw "The backup checksum file is malformed."
}
$actualHash = (Get-FileHash -LiteralPath $backupPath -Algorithm SHA256).Hash
if (-not $actualHash.Equals($expectedHash, [StringComparison]::OrdinalIgnoreCase)) {
  throw "The backup SHA-256 checksum is invalid."
}

function New-HexSecret {
  param([ValidateRange(24, 128)][int]$ByteCount)

  $bytes = New-Object byte[] $ByteCount
  $generator = [Security.Cryptography.RandomNumberGenerator]::Create()
  try {
    $generator.GetBytes($bytes)
  } finally {
    $generator.Dispose()
  }
  return ([BitConverter]::ToString($bytes)).Replace("-", "").ToLowerInvariant()
}

function Get-ContainerEnvironmentValue {
  param([string]$Name)

  $prefix = "$Name="
  $inspect = @(& docker inspect $script:resolvedContainerId | ConvertFrom-Json)[0]
  if ($LASTEXITCODE -ne 0 -or -not $inspect) {
    throw "The MySQL container could not be inspected."
  }
  $entry = $inspect.Config.Env |
    Where-Object { $_.StartsWith($prefix, [StringComparison]::Ordinal) } |
    Select-Object -First 1
  if (-not $entry) { return $null }
  return $entry.Substring($prefix.Length)
}

function Get-EnvFileValue {
  param([string]$Name)

  $pattern = "^$([regex]::Escape($Name))=(.*)$"
  $matches = @(
    Get-Content -LiteralPath $envPath |
      ForEach-Object { if ($_ -match $pattern) { $Matches[1].Trim() } }
  )
  if ($matches.Count -gt 1) {
    throw "The environment file contains $Name more than once."
  }
  if ($matches.Count -eq 0) { return $null }
  $value = $matches[0]
  if (
    $value.Length -ge 2 -and
    (($value.StartsWith('"') -and $value.EndsWith('"')) -or
      ($value.StartsWith("'") -and $value.EndsWith("'")))
  ) {
    return $value.Substring(1, $value.Length - 2)
  }
  return $value
}

function Set-EnvFileValue {
  param(
    [Collections.Generic.List[string]]$Lines,
    [string]$Name,
    [string]$Value
  )

  $pattern = "^$([regex]::Escape($Name))="
  $found = $false
  for ($index = 0; $index -lt $Lines.Count; $index++) {
    if ($Lines[$index] -match $pattern) {
      if ($found) {
        throw "The environment file contains $Name more than once."
      }
      $Lines[$index] = "$Name=$Value"
      $found = $true
    }
  }
  if (-not $found) { $Lines.Add("$Name=$Value") }
}

function ConvertTo-MySqlStringLiteral {
  param([string]$Value)

  return "'" + $Value.Replace("\", "\\").Replace("'", "''") + "'"
}

function Invoke-MySql {
  param(
    [string]$Password,
    [string]$Database,
    [string]$Sql,
    [switch]$Capture
  )

  $arguments = @(
    "exec",
    "--env", "MYSQL_PWD=$Password",
    $script:resolvedContainerId,
    "mysql",
    "--user=root",
    "--batch",
    "--skip-column-names"
  )
  if ($Database) { $arguments += $Database }
  $arguments += "--execute=$Sql"
  $output = & docker @arguments
  if ($LASTEXITCODE -ne 0) { throw "A MySQL credential operation failed." }
  if ($Capture) { return @($output) }
}

$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$resolvedContainerId = ([string]$ContainerId).Trim()
if (-not $resolvedContainerId) {
  $resolvedContainerId = ((& docker compose `
      --project-directory $projectRoot `
      --env-file $envPath `
      ps -q mysql) | Select-Object -First 1).Trim()
}
if (-not $resolvedContainerId) { throw "The MySQL container is not running." }

$running = (& docker inspect --format "{{.State.Running}}" $resolvedContainerId).Trim()
if ($LASTEXITCODE -ne 0 -or $running -ne "true") {
  throw "The selected MySQL container is not running."
}

$oldRootPassword = Get-ContainerEnvironmentValue "MYSQL_ROOT_PASSWORD"
$oldAppPassword = Get-ContainerEnvironmentValue "MYSQL_PASSWORD"
$appUser = Get-ContainerEnvironmentValue "MYSQL_USER"
$databaseName = Get-ContainerEnvironmentValue "MYSQL_DATABASE"
if (
  -not $oldRootPassword -or
  -not $oldAppPassword -or
  $appUser -notmatch '^[A-Za-z0-9_.-]{1,32}$' -or
  $databaseName -notmatch '^[A-Za-z0-9_]+$'
) {
  throw "The MySQL container has an incomplete or unsafe credential configuration."
}

# Confirm that the current credential works before preparing any change.
Invoke-MySql -Password $oldRootPassword -Database $databaseName -Sql "SELECT 1;"

$accountRows = Invoke-MySql `
  -Password $oldRootPassword `
  -Database "mysql" `
  -Sql "SELECT User, Host FROM mysql.user WHERE User IN ('root', $(ConvertTo-MySqlStringLiteral $appUser)) ORDER BY User, Host;" `
  -Capture
$accounts = @(
  $accountRows | ForEach-Object {
    $parts = ([string]$_).Split("`t", 2)
    if (
      $parts.Count -ne 2 -or
      $parts[0] -notmatch '^[A-Za-z0-9_.-]{1,32}$' -or
      $parts[1] -notmatch '^[A-Za-z0-9_.:%-]+$'
    ) {
      throw "MySQL returned an unsafe account identifier."
    }
    [pscustomobject]@{ User = $parts[0]; Host = $parts[1] }
  }
)
if (-not ($accounts | Where-Object User -eq $appUser)) {
  throw "The configured application database account does not exist."
}
if (-not ($accounts | Where-Object User -eq "root")) {
  throw "No MySQL root account was found."
}

$newRootPassword = New-HexSecret 32
$newAppPassword = New-HexSecret 32
$newAuthSecret = New-HexSecret 32

$databaseUrl = Get-EnvFileValue "DATABASE_URL"
try {
  $databaseUri = [Uri]$databaseUrl
  if ($databaseUri.Scheme -notin @("mysql", "mariadb")) {
    throw "Unsupported database URL scheme."
  }
  $databaseBuilder = [UriBuilder]::new($databaseUri)
  $databaseBuilder.UserName = $appUser
  $databaseBuilder.Password = $newAppPassword
  $newDatabaseUrl = $databaseBuilder.Uri.AbsoluteUri
} catch {
  throw "DATABASE_URL in the environment file is invalid: $($_.Exception.Message)"
}

$updatedLines = [Collections.Generic.List[string]]::new()
$updatedLines.AddRange([string[]](Get-Content -LiteralPath $envPath))
Set-EnvFileValue $updatedLines "MYSQL_ROOT_PASSWORD" $newRootPassword
Set-EnvFileValue $updatedLines "MYSQL_APP_PASSWORD" $newAppPassword
Set-EnvFileValue $updatedLines "AUTH_SECRET" $newAuthSecret
Set-EnvFileValue $updatedLines "DATABASE_URL" $newDatabaseUrl

$temporaryEnv = Join-Path `
  ([IO.Path]::GetDirectoryName($envPath)) `
  ("." + [IO.Path]::GetFileName($envPath) + ".rotate-" + [Guid]::NewGuid().ToString("N"))
$recoveryEnv = "$envPath.pre-rotation"
[IO.File]::WriteAllLines(
  $temporaryEnv,
  $updatedLines,
  (New-Object Text.UTF8Encoding($false))
)

$newSql = ($accounts | ForEach-Object {
  $password = if ($_.User -eq "root") { $newRootPassword } else { $newAppPassword }
  "ALTER USER $(ConvertTo-MySqlStringLiteral $_.User)@$(ConvertTo-MySqlStringLiteral $_.Host) IDENTIFIED BY $(ConvertTo-MySqlStringLiteral $password);"
}) -join " "
$rollbackSql = ($accounts | ForEach-Object {
  $password = if ($_.User -eq "root") { $oldRootPassword } else { $oldAppPassword }
  "ALTER USER $(ConvertTo-MySqlStringLiteral $_.User)@$(ConvertTo-MySqlStringLiteral $_.Host) IDENTIFIED BY $(ConvertTo-MySqlStringLiteral $password);"
}) -join " "

$databaseChanged = $false
$environmentChanged = $false
try {
  Invoke-MySql -Password $oldRootPassword -Database "mysql" -Sql $newSql
  $databaseChanged = $true

  Invoke-MySql -Password $newRootPassword -Database $databaseName -Sql "SELECT 1;"
  $appCheck = & docker exec `
    --env "MYSQL_PWD=$newAppPassword" `
    $resolvedContainerId `
    mysql `
    "--user=$appUser" `
    --batch `
    --skip-column-names `
    $databaseName `
    "--execute=SELECT 1;"
  if ($LASTEXITCODE -ne 0 -or ([string]($appCheck | Select-Object -First 1)).Trim() -ne "1") {
    throw "The rotated application credential could not connect."
  }

  if (Test-Path -LiteralPath $recoveryEnv -PathType Leaf) {
    throw "Remove or secure the existing recovery file before rotating: $recoveryEnv"
  }
  [IO.File]::Replace($temporaryEnv, $envPath, $recoveryEnv, $true)
  $environmentChanged = $true
  Remove-Item -LiteralPath $recoveryEnv -Force
} catch {
  if ($databaseChanged -and -not $environmentChanged) {
    $rolledBack = $false
    foreach ($candidatePassword in @($newRootPassword, $oldRootPassword)) {
      try {
        Invoke-MySql -Password $candidatePassword -Database "mysql" -Sql $rollbackSql
        $rolledBack = $true
        break
      } catch {
        # Try the other root credential; a multi-account ALTER may have failed
        # before or after changing the account used by this connection.
      }
    }
    if (-not $rolledBack) {
      Write-Warning "Automatic database rollback failed. The verified backup and the prepared environment file were retained."
      throw
    }
  }
  throw
} finally {
  if (Test-Path -LiteralPath $temporaryEnv -PathType Leaf) {
    Remove-Item -LiteralPath $temporaryEnv -Force
  }
}

Write-Host "MySQL and application secrets were rotated successfully." -ForegroundColor Green
Write-Host "Recreate the Compose stack immediately so every service receives the new credentials."
