# Create Desktop Shortcuts for Tiasas Service Management
# Run this script to create shortcuts on your desktop

Write-Host "=== Creating Desktop Shortcuts for Tiasas ===" -ForegroundColor Cyan
Write-Host ""

$WScriptShell = New-Object -ComObject WScript.Shell
$Desktop = [System.Environment]::GetFolderPath('Desktop')
$ProjectPath = "d:\GenAi\Projects\Tiasas"

# Function to create shortcut
function Create-Shortcut {
    param (
        [string]$ShortcutName,
        [string]$TargetPath,
        [string]$Description,
        [string]$IconLocation = "%SystemRoot%\System32\SHELL32.dll"
    )

    $ShortcutPath = Join-Path $Desktop "$ShortcutName.lnk"
    $Shortcut = $WScriptShell.CreateShortcut($ShortcutPath)
    $Shortcut.TargetPath = $TargetPath
    $Shortcut.WorkingDirectory = $ProjectPath
    $Shortcut.Description = $Description
    $Shortcut.IconLocation = $IconLocation

    # Set to run as administrator
    $bytes = [System.IO.File]::ReadAllBytes($ShortcutPath)
    $bytes[0x15] = $bytes[0x15] -bor 0x20
    [System.IO.File]::WriteAllBytes($ShortcutPath, $bytes)

    $Shortcut.Save()
    Write-Host "✓ Created: $ShortcutName" -ForegroundColor Green
}

# Create shortcuts
Create-Shortcut -ShortcutName "Tiasas - Start Services" `
                -TargetPath "$ProjectPath\start-services.bat" `
                -Description "Start Tiasas Web and Cloudflare Tunnel services" `
                -IconLocation "%SystemRoot%\System32\SHELL32.dll,137"

Create-Shortcut -ShortcutName "Tiasas - Stop Services" `
                -TargetPath "$ProjectPath\stop-services.bat" `
                -Description "Stop Tiasas Web and Cloudflare Tunnel services" `
                -IconLocation "%SystemRoot%\System32\SHELL32.dll,131"

Create-Shortcut -ShortcutName "Tiasas - Restart Services" `
                -TargetPath "$ProjectPath\restart-services.bat" `
                -Description "Restart Tiasas services" `
                -IconLocation "%SystemRoot%\System32\SHELL32.dll,239"

Create-Shortcut -ShortcutName "Tiasas - Check Status" `
                -TargetPath "$ProjectPath\check-services.bat" `
                -Description "Check Tiasas services status" `
                -IconLocation "%SystemRoot%\System32\SHELL32.dll,278"

Create-Shortcut -ShortcutName "Tiasas - View Logs" `
                -TargetPath "$ProjectPath\view-logs.bat" `
                -Description "View Tiasas application logs" `
                -IconLocation "%SystemRoot%\System32\SHELL32.dll,70"

Write-Host ""
Write-Host "=== Shortcuts Created! ===" -ForegroundColor Green
Write-Host ""
Write-Host "Check your desktop for the new shortcuts:" -ForegroundColor Yellow
Write-Host "  • Tiasas - Start Services" -ForegroundColor Gray
Write-Host "  • Tiasas - Stop Services" -ForegroundColor Gray
Write-Host "  • Tiasas - Restart Services" -ForegroundColor Gray
Write-Host "  • Tiasas - Check Status" -ForegroundColor Gray
Write-Host "  • Tiasas - View Logs" -ForegroundColor Gray
Write-Host ""
Write-Host "All shortcuts are configured to run as Administrator." -ForegroundColor Cyan
Write-Host ""
pause
