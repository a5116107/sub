param(
  [string]$BaseUrl = "http://localhost:8080",
  [string]$ApiKey,
  [string]$Model = "gpt-5.3-code",
  [string]$ReasoningEffort = "xhigh",
  [int]$TimeoutSec = 60
)

if ([string]::IsNullOrWhiteSpace($ApiKey)) {
  Write-Error "ApiKey is required. Example: .\\tools\\test-openai-codex.ps1 -ApiKey 'sk-xxxx'"
  exit 1
}

$base = $BaseUrl.TrimEnd("/")
$headersCommon = @(
  "-H", "Authorization: Bearer $ApiKey",
  "-H", "User-Agent: codex_cli_rs/0.1.0"
)

Write-Host "=== Step 1: Auth check (/v1/models) ==="
& curl.exe -sS -D - "$base/v1/models" @headersCommon -o NUL -w "HTTP %{http_code}`n"
if ($LASTEXITCODE -ne 0) {
  Write-Error "curl /v1/models failed"
  exit 1
}

$payloadObj = @{
  model = $Model
  reasoning = @{
    effort = $ReasoningEffort
  }
  store = $false
  stream = $true
  instructions = "You are a coding assistant."
  input = @(
    @{
      role = "user"
      content = @(
        @{
          type = "input_text"
          text = "Reply with exactly: OK"
        }
      )
    }
  )
}

$payload = $payloadObj | ConvertTo-Json -Depth 20 -Compress
$tmp = [System.IO.Path]::GetTempFileName()
Set-Content -Path $tmp -Value $payload -NoNewline -Encoding ascii

try {
  Write-Host ""
  Write-Host "=== Step 2: Responses stream (/v1/responses) ==="
  & curl.exe -sS -N --max-time $TimeoutSec -D - "$base/v1/responses" `
    @headersCommon `
    "-H" "Content-Type: application/json" `
    --data-binary "@$tmp"
} finally {
  if (Test-Path $tmp) {
    Remove-Item $tmp -Force
  }
}
