# Run K6 Tests Script for Check-in Application
# ============================================================================
# Usage: .\run-tests.ps1 [test-name] [options]
# ============================================================================

param(
    [Parameter(Position=0)]
    [ValidateSet("smoke", "load", "stress", "spike", "event", "officers", "endpoints", "all")]
    [string]$TestType = "smoke",
    
    [Parameter()]
    [string]$BaseUrl = "http://localhost:3000/api/v1",
    
    [Parameter()]
    [switch]$SaveResults,
    
    [Parameter()]
    [switch]$HtmlReport
)

# Colors for output
$Green = "Green"
$Yellow = "Yellow"
$Red = "Red"
$Cyan = "Cyan"

function Write-Header {
    param([string]$Text)
    Write-Host "`n========================================" -ForegroundColor $Cyan
    Write-Host "  $Text" -ForegroundColor $Cyan
    Write-Host "========================================`n" -ForegroundColor $Cyan
}

function Test-K6Installed {
    try {
        $version = k6 version 2>&1
        Write-Host "✓ K6 Version: $version" -ForegroundColor $Green
        return $true
    }
    catch {
        Write-Host "✗ K6 is not installed or not in PATH" -ForegroundColor $Red
        Write-Host "  Install: https://k6.io/docs/get-started/installation/" -ForegroundColor $Yellow
        return $false
    }
}

function Run-K6Test {
    param(
        [string]$TestFile,
        [string]$TestName,
        [string]$BaseUrl,
        [bool]$SaveResults
    )
    
    Write-Host "`n▶ Running: $TestName" -ForegroundColor $Yellow
    Write-Host "  File: $TestFile" -ForegroundColor $Cyan
    Write-Host "  URL: $BaseUrl" -ForegroundColor $Cyan
    
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $resultFile = "k6-tests/results/${TestName}-${timestamp}.json"
    
    $env:BASE_URL = $BaseUrl
    
    if ($SaveResults) {
        k6 run --out json=$resultFile $TestFile
        Write-Host "  Results saved to: $resultFile" -ForegroundColor $Green
    }
    else {
        k6 run $TestFile
    }
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

Write-Header "K6 Performance Tests - Check-in Application"

# Check K6 installation
if (-not (Test-K6Installed)) {
    exit 1
}

# Create results directory
if (-not (Test-Path "k6-tests/results")) {
    New-Item -ItemType Directory -Path "k6-tests/results" -Force | Out-Null
    Write-Host "✓ Created results directory" -ForegroundColor $Green
}

# Test mapping
$tests = @{
    "smoke"     = @{ file = "k6-tests/scenarios/smoke-test.js"; name = "Smoke Test" }
    "load"      = @{ file = "k6-tests/scenarios/load-test.js"; name = "Load Test" }
    "stress"    = @{ file = "k6-tests/scenarios/stress-test.js"; name = "Stress Test" }
    "spike"     = @{ file = "k6-tests/scenarios/spike-test.js"; name = "Spike Test" }
    "event"     = @{ file = "k6-tests/scenarios/event-checkin.js"; name = "Event Check-in (300)" }
    "officers"  = @{ file = "k6-tests/scenarios/concurrent-officers.js"; name = "Concurrent Officers" }
    "endpoints" = @{ file = "k6-tests/scenarios/endpoint-tests.js"; name = "Endpoint Tests" }
}

if ($TestType -eq "all") {
    Write-Host "`n📋 Running all tests sequentially...`n" -ForegroundColor $Yellow
    
    foreach ($key in @("smoke", "load", "endpoints")) {
        $test = $tests[$key]
        Run-K6Test -TestFile $test.file -TestName $key -BaseUrl $BaseUrl -SaveResults $SaveResults
        Write-Host "`n⏳ Waiting 10 seconds before next test...`n" -ForegroundColor $Yellow
        Start-Sleep -Seconds 10
    }
}
else {
    $test = $tests[$TestType]
    Run-K6Test -TestFile $test.file -TestName $TestType -BaseUrl $BaseUrl -SaveResults $SaveResults
}

Write-Header "Tests Complete"
Write-Host "View results in k6-tests/results/" -ForegroundColor $Green
