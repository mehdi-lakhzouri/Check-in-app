@echo off
REM ====================================
REM IASTAM Check-in Reports Generator
REM ====================================

echo.
echo ==========================================
echo   IASTAM Check-in Reports Generator
echo ==========================================
echo.

cd /d "%~dp0iastam-checkin-api"

:menu
echo.
echo Select Report Type:
echo.
echo [1] Full Attendance Report (Excel)
echo [2] Full Attendance Report (CSV)
echo [3] Session Report (Excel)
echo [4] Session Report (CSV)
echo [5] Statistics Report (Excel)
echo [6] Statistics Report (CSV)
echo [7] Multi-Sheet Sessions Report (Excel) **NEW**
echo [8] Generate All Reports
echo [0] Exit
echo.

set /p choice="Enter your choice (0-8): "

if "%choice%"=="0" goto :end
if "%choice%"=="1" goto :attendance_xlsx
if "%choice%"=="2" goto :attendance_csv
if "%choice%"=="3" goto :session_xlsx
if "%choice%"=="4" goto :session_csv
if "%choice%"=="5" goto :stats_xlsx
if "%choice%"=="6" goto :stats_csv
if "%choice%"=="7" goto :sessions_sheets
if "%choice%"=="8" goto :all_reports

echo Invalid choice. Please try again.
goto :menu

:attendance_xlsx
echo.
echo Generating Full Attendance Report (Excel)...
call npm run generate-report attendance xlsx
if %errorlevel% equ 0 (
    echo.
    echo ✓ Report generated successfully!
    start "" "output"
) else (
    echo.
    echo ✗ Error generating report. Please check the console output.
)
pause
goto :menu

:attendance_csv
echo.
echo Generating Full Attendance Report (CSV)...
call npm run generate-report attendance csv
if %errorlevel% equ 0 (
    echo.
    echo ✓ Report generated successfully!
    start "" "output"
) else (
    echo.
    echo ✗ Error generating report. Please check the console output.
)
pause
goto :menu

:session_xlsx
echo.
set /p session_name="Enter session name: "
echo.
echo Generating Session Report for "%session_name%" (Excel)...
call npm run generate-report session xlsx "%session_name%"
if %errorlevel% equ 0 (
    echo.
    echo ✓ Report generated successfully!
    start "" "output"
) else (
    echo.
    echo ✗ Error generating report. Please check the console output.
)
pause
goto :menu

:session_csv
echo.
set /p session_name="Enter session name: "
echo.
echo Generating Session Report for "%session_name%" (CSV)...
call npm run generate-report session csv "%session_name%"
if %errorlevel% equ 0 (
    echo.
    echo ✓ Report generated successfully!
    start "" "output"
) else (
    echo.
    echo ✗ Error generating report. Please check the console output.
)
pause
goto :menu

:stats_xlsx
echo.
echo Generating Statistics Report (Excel)...
call npm run generate-report statistics xlsx
if %errorlevel% equ 0 (
    echo.
    echo ✓ Report generated successfully!
    start "" "output"
) else (
    echo.
    echo ✗ Error generating report. Please check the console output.
)
pause
goto :menu

:stats_csv
echo.
echo Generating Statistics Report (CSV)...
call npm run generate-report statistics csv
if %errorlevel% equ 0 (
    echo.
    echo ✓ Report generated successfully!
    start "" "output"
) else (
    echo.
    echo ✗ Error generating report. Please check the console output.
)
pause
goto :menu

:sessions_sheets
echo.
echo Generating Multi-Sheet Sessions Report (Excel)...
echo This report includes:
echo  - Summary sheet with all sessions
echo  - Separate sheet for each session
echo  - Closed sessions: only registered users
echo  - Open sessions: all participants
echo.
call npm run generate-report sessions-sheets
if %errorlevel% equ 0 (
    echo.
    echo ✓ Report generated successfully!
    start "" "output"
) else (
    echo.
    echo ✗ Error generating report. Please check the console output.
)
pause
goto :menu

:all_reports
echo.
echo Generating All Reports...
echo.
echo [1/4] Full Attendance Report...
call npm run generate-report attendance xlsx
echo.
echo [2/4] Statistics Report...
call npm run generate-report statistics xlsx
echo.
echo [3/4] Multi-Sheet Sessions Report...
call npm run generate-report sessions-sheets
echo.
echo [4/4] Opening output folder...
if %errorlevel% equ 0 (
    echo.
    echo ✓ All reports generated successfully!
    start "" "output"
) else (
    echo.
    echo ✗ Some reports may have failed. Please check the console output.
)
pause
goto :menu

:end
echo.
echo Thank you for using IASTAM Reports Generator!
echo.
pause
