param(
  [string]$GolangciLintVersion = 'v2.7.0',
  [string]$GovulncheckVersion = 'latest',
  [string]$GosecVersion = 'latest',
  [switch]$SkipGolangciLint,
  [switch]$SkipGovulncheck,
  [switch]$SkipGosec
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Invoke-Checked {
  param([Parameter(Mandatory = $true)][scriptblock]$Command)
  & $Command
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed with exit code $LASTEXITCODE"
  }
}

function Require-Command {
  param([Parameter(Mandatory = $true)][string]$Name)
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Missing required command '$Name'. Ensure it is installed and on PATH."
  }
}

Require-Command -Name "go"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $RepoRoot

function Get-GoBinDir {
  $goBin = (& go env GOBIN)
  if (-not [string]::IsNullOrWhiteSpace($goBin)) {
    return $goBin.Trim()
  }
  $goPath = (& go env GOPATH).Trim()
  return (Join-Path $goPath 'bin')
}

$GoBinDir = Get-GoBinDir
if ($env:PATH -notlike "*$GoBinDir*") {
  $env:PATH = "$GoBinDir;$env:PATH"
}

Write-Host ""
Write-Host "Installing Go tools into: $GoBinDir"

if (-not $SkipGolangciLint) {
  Write-Host ""
  Write-Host "Installing golangci-lint ($GolangciLintVersion)..."
  Invoke-Checked { go install "github.com/golangci/golangci-lint/v2/cmd/golangci-lint@$GolangciLintVersion" }
}

if (-not $SkipGovulncheck) {
  Write-Host ""
  Write-Host "Installing govulncheck ($GovulncheckVersion)..."
  Invoke-Checked { go install "golang.org/x/vuln/cmd/govulncheck@$GovulncheckVersion" }
}

if (-not $SkipGosec) {
  Write-Host ""
  Write-Host "Installing gosec ($GosecVersion)..."
  Invoke-Checked { go install "github.com/securego/gosec/v2/cmd/gosec@$GosecVersion" }
}

Write-Host ""
Write-Host "Done."
