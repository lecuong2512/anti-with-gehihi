param(
    [string]$Workspace = (Get-Location).Path,
    [switch]$Foreground,
    [switch]$Tunnel
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $ScriptDir
$CliJs = Join-Path $RepoRoot "bin\a2g.js"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Anti with Gehihi - Bridge Launcher     " -ForegroundColor Cyan
Write-Host "  Gemini Web thinks. Antigravity works.  " -ForegroundColor DarkGray
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Workspace: $Workspace" -ForegroundColor Yellow

if ($Foreground) {
    Write-Host "Starting Bridge in foreground..." -ForegroundColor Green
    $argsList = @("serve", "--workspace", $Workspace)
    if ($Tunnel) { $argsList += "--tunnel" }
    node $CliJs @argsList
} else {
    Write-Host "Ensuring Bridge daemon is running..." -ForegroundColor Green
    $argsList = @("setup", "-w", $Workspace)
    node $CliJs @argsList
    Write-Host "`nBridge status:" -ForegroundColor Cyan
    node $CliJs status -w $Workspace
}
