# Save your Cambodia SVG paste as scripts\kh-flag-source.txt, then run:
#   powershell -ExecutionPolicy Bypass -File scripts\install-kh-flag.ps1

$root = Split-Path $PSScriptRoot -Parent
$src = Join-Path $PSScriptRoot "kh-flag-source.txt"
$destA = Join-Path $root "frontend-admin\shared\assets\flags\cambodia-flag.svg"
$destU = Join-Path $root "frontend-user\shared\assets\flags\cambodia-flag.svg"

if (-not (Test-Path $src)) {
    Write-Error "Missing $src — paste your <svg>...</svg> there first."
    exit 1
}

$svg = Get-Content -Raw -Path $src
if ($svg -notmatch '<svg') {
    Write-Error "kh-flag-source.txt does not contain an <svg> element."
    exit 1
}

New-Item -ItemType Directory -Force -Path (Split-Path $destA) | Out-Null
Set-Content -Path $destA -Value $svg -Encoding UTF8 -NoNewline
Copy-Item -Path $destA -Destination $destU -Force
Write-Host "Installed Cambodia flag ($($svg.Length) chars) to admin and user apps."
