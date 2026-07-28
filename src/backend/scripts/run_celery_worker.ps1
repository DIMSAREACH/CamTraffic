# CamTraffic Celery worker (Windows-safe — solo pool)
Set-Location $PSScriptRoot\..
celery -A camtraffic worker -l info --pool=solo --concurrency=1
