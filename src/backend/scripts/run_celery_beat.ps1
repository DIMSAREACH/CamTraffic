# CamTraffic Celery beat scheduler
Set-Location $PSScriptRoot\..
celery -A camtraffic beat -l info --pool=solo
