# Manual GitHub push — run only when YOU want to upload changes.
# Usage: .\scripts\push-github.ps1 "Your commit message"

param(
    [Parameter(Mandatory = $true)]
    [string]$Message
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

Write-Host "=== CamTraffic — manual push to GitHub ===" -ForegroundColor Cyan
git status -sb

$untracked = git status --porcelain
if (-not $untracked) {
    Write-Host "Nothing to commit. Working tree clean." -ForegroundColor Yellow
    $push = Read-Host "Push anyway? (y/N)"
    if ($push -ne 'y') { exit 0 }
} else {
    git add -A
    git commit -m $Message
}

git push origin main
Write-Host "Done: https://github.com/SareachGenZ/CamTraffic" -ForegroundColor Green
