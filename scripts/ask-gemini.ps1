param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$Prompt,
    [int]$Timeout = 600,
    [string]$Workspace = (Get-Location).Path
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $ScriptDir
$CliJs = Join-Path $RepoRoot "bin\a2g.js"

node $CliJs ask $Prompt -w $Workspace -t $Timeout
