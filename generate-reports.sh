#!/bin/bash

# ====================================
# IASTAM Check-in Reports Generator
# ====================================

clear
echo ""
echo "=========================================="
echo "  IASTAM Check-in Reports Generator"
echo "=========================================="
echo ""

# Navigate to API directory
cd "$(dirname "$0")/iastam-checkin-api" || exit 1

show_menu() {
    echo ""
    echo "Select Report Type:"
    echo ""
    echo "[1] Full Attendance Report (Excel)"
    echo "[2] Full Attendance Report (CSV)"
    echo "[3] Session Report (Excel)"
    echo "[4] Session Report (CSV)"
    echo "[5] Statistics Report (Excel)"
    echo "[6] Statistics Report (CSV)"
    echo "[7] Multi-Sheet Sessions Report (Excel) **NEW**"
    echo "[8] Generate All Reports"
    echo "[0] Exit"
    echo ""
}

generate_report() {
    local cmd="$1"
    echo ""
    echo "Generating report..."
    if npm run generate-report $cmd; then
        echo ""
        echo "✓ Report generated successfully!"
        echo "Check the output/ folder"
        if [[ "$OSTYPE" == "darwin"* ]]; then
            open output/
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            xdg-open output/ 2>/dev/null || echo "Output saved to: $(pwd)/output/"
        fi
    else
        echo ""
        echo "✗ Error generating report. Please check the console output."
    fi
    echo ""
    read -p "Press Enter to continue..."
}

while true; do
    show_menu
    read -p "Enter your choice (0-8): " choice
    
    case $choice in
        0)
            echo ""
            echo "Thank you for using IASTAM Reports Generator!"
            echo ""
            exit 0
            ;;
        1)
            generate_report "attendance xlsx"
            ;;
        2)
            generate_report "attendance csv"
            ;;
        3)
            echo ""
            read -p "Enter session name: " session_name
            generate_report "session xlsx \"$session_name\""
            ;;
        4)
            echo ""
            read -p "Enter session name: " session_name
            generate_report "session csv \"$session_name\""
            ;;
        5)
            generate_report "statistics xlsx"
            ;;
        6)
            generate_report "statistics csv"
            ;;
        7)
            echo ""
            echo "Generating Multi-Sheet Sessions Report..."
            echo "This report includes:"
            echo " - Summary sheet with all sessions"
            echo " - Separate sheet for each session"
            echo " - Closed sessions: only registered users"
            echo " - Open sessions: all participants"
            generate_report "sessions-sheets"
            ;;
        8)
            echo ""
            echo "Generating all reports..."
            echo ""
            echo "[1/4] Full Attendance Report..."
            npm run generate-report attendance xlsx
            echo ""
            echo "[2/4] Statistics Report..."
            npm run generate-report statistics xlsx
            echo ""
            echo "[3/4] Multi-Sheet Sessions Report..."
            npm run generate-report sessions-sheets
            echo ""
            echo "✓ All reports generated successfully!"
            echo "Check the output/ folder"
            if [[ "$OSTYPE" == "darwin"* ]]; then
                open output/
            elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
                xdg-open output/ 2>/dev/null || echo "Output saved to: $(pwd)/output/"
            fi
            echo ""
            read -p "Press Enter to continue..."
            ;;
        *)
            echo "Invalid choice. Please try again."
            sleep 2
            ;;
    esac
done
