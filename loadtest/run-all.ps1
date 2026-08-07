# Runs the full battery: backend API + frontend assets + direct DB.
# Usage:
#   cd D:\React Dev\chit\loadtest
#   .\run-all.ps1
#   .\run-all.ps1 -BackendBase https://localhost:5011 -FrontendBase http://localhost:3000 -User admin -Pass mypass

param(
  [string]$BackendBase  = "https://103.38.50.247:100",
  [string]$FrontendBase = "https://103.38.50.247",
  [string]$User         = "admin",
  [string]$Pass         = "admin123",
  [string[]]$Scenarios  = @("smoke","load","stress","soak")
)

$startedAt = Get-Date
Write-Host "`n############## LOAD TEST BATTERY ##############" -ForegroundColor Yellow
Write-Host "Backend  : $BackendBase"
Write-Host "Frontend : $FrontendBase"
Write-Host "Started  : $startedAt`n"
Write-Host "Started  : $User`n"
Write-Host "Started  : $Pass`n"


# --- BACKEND API ---
foreach ($s in $Scenarios) {
  Write-Host "`n=== BACKEND API: $s ===" -ForegroundColor Cyan
  k6 run -e SCENARIO=$s -e BASE=$BackendBase -e USER=$User -e PASS=$Pass `
         --summary-export="results-backend-$s.json" smoke.js
}

# --- FRONTEND STATIC ---
foreach ($s in $Scenarios) {
  Write-Host "`n=== FRONTEND STATIC: $s ===" -ForegroundColor Cyan
  k6 run -e SCENARIO=$s -e BASE=$FrontendBase `
         --summary-export="results-frontend-$s.json" frontend.js
}

# --- DIRECT DB ---
Push-Location "$PSScriptRoot\..\chit-scheme-backend"
foreach ($s in $Scenarios) {
  Write-Host "`n=== DIRECT DB: $s ===" -ForegroundColor Cyan
  node ..\loadtest\db-stress.js $s
}
Pop-Location

$finishedAt = Get-Date
$elapsed = $finishedAt - $startedAt
Write-Host "`n############## BATTERY COMPLETE ##############" -ForegroundColor Green
Write-Host "Elapsed: $($elapsed.ToString())"
Write-Host "Results: results-backend-*.json, results-frontend-*.json"
Write-Host "Now open SSMS and run db-diagnostics.sql for the DB-side view.`n"
