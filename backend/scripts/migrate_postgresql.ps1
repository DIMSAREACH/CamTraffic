# Apply all Django migrations to PostgreSQL (camtraffic_db in pgAdmin)
# Usage:
#   cd backend\scripts
#   .\migrate_postgresql.ps1 -DbPassword "YOUR_PGADMIN_PASSWORD"
#
# Optional: -DbUser postgres -DbName camtraffic_db

param(
    [Parameter(Mandatory = $true)]
    [string]$DbPassword,
    [string]$DbUser = "postgres",
    [string]$DbName = "camtraffic_db",
    [string]$DbHost = "localhost",
    [string]$DbPort = "5432"
)

$backend = Split-Path -Parent $PSScriptRoot
Set-Location $backend

$env:USE_SQLITE = "False"
$env:DB_NAME = $DbName
$env:DB_USER = $DbUser
$env:DB_PASSWORD = $DbPassword
$env:DB_HOST = $DbHost
$env:DB_PORT = $DbPort

Write-Host "Migrating PostgreSQL database '$DbName' on ${DbHost}:${DbPort}..." -ForegroundColor Cyan
python manage.py showmigrations users
python manage.py migrate --noinput
if ($LASTEXITCODE -eq 0) {
    Write-Host "Done. Refresh pgAdmin — you should see user_preferences and login_events." -ForegroundColor Green
} else {
    Write-Host "Migration failed. Check DB_USER / DB_PASSWORD match your pgAdmin connection." -ForegroundColor Red
    exit 1
}
