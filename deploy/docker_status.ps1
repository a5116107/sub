Param(
  [switch]$FixHint
)

$ErrorActionPreference = 'Stop'

function Info($m) { Write-Host "[INFO] $m" -ForegroundColor Cyan }
function Warn($m) { Write-Host "[WARN] $m" -ForegroundColor Yellow }
function Err($m) { Write-Host "[ERROR] $m" -ForegroundColor Red }

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Err "docker.exe not found in PATH."
  Warn "Install Docker Desktop, then reopen your terminal."
  exit 1
}

try {
  docker info *> $null
  Info "Docker daemon reachable."
  docker context show
  exit 0
} catch {
  Err "Docker CLI is present but the daemon is not reachable."
  Warn "Common cause on Windows: Docker Desktop is not running, or Linux engine is disabled."
  Warn "Start Docker Desktop and wait until it shows 'Running'."
  if ($FixHint) {
    Warn "Extra checks:"
    Warn "- Ensure 'Use the WSL 2 based engine' is enabled (Docker Desktop Settings)."
    Warn "- If you use docker-compose, prefer 'docker compose' (v2) in new setups."
  }
  exit 2
}

