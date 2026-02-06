param(
  [switch]$SkipBackend,
  [switch]$SkipFrontend,
  [switch]$SkipGoLint,
  [switch]$WithFrontendBuild,
  [switch]$InstallGoTools
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

function Write-Section {
  param([Parameter(Mandatory = $true)][string]$Title)
  Write-Host ""
  Write-Host "== $Title =="
}

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

if (-not $SkipBackend) {
  Write-Section "Backend"
  Require-Command -Name "go"

  $goBinDir = Get-GoBinDir
  if ($env:PATH -notlike "*$goBinDir*") {
    $env:PATH = "$goBinDir;$env:PATH"
  }

  Push-Location "backend"
  try {
    Invoke-Checked { go test ./... }
    Invoke-Checked { go vet ./... }

    if (-not $SkipGoLint) {
      if (Get-Command "golangci-lint" -ErrorAction SilentlyContinue) {
        Invoke-Checked { golangci-lint run ./... }
      } else {
        if ($InstallGoTools) {
          Invoke-Checked { & (Join-Path $RepoRoot "tools/install-go-tools.ps1") -SkipGovulncheck -SkipGosec }
        }

        if (Get-Command "golangci-lint" -ErrorAction SilentlyContinue) {
          Invoke-Checked { golangci-lint run ./... }
        } else {
          Write-Host "golangci-lint not found; skipping. Install: powershell -NoProfile -ExecutionPolicy Bypass -File tools/install-go-tools.ps1 -SkipGovulncheck -SkipGosec"
        }
      }
    }
  } finally {
    Pop-Location
  }
}

if (-not $SkipFrontend) {
  Write-Section "Frontend"
  Require-Command -Name "pnpm"

  Push-Location "frontend"
  try {
    Invoke-Checked { pnpm run lint:check }
    Invoke-Checked { pnpm run typecheck }
    Invoke-Checked { pnpm run test:run }

    if ($WithFrontendBuild) {
      Invoke-Checked { pnpm run build }
    }
  } finally {
    Pop-Location
  }
}

Write-Host ""
Write-Host "All checks passed."
