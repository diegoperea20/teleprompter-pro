# Enable Symbolic Link Privileges for Electron Builder
# This script must be run as Administrator

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ENABLING SYMBOLIC LINK PRIVILEGES" -ForegroundColor Cyan  
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as administrator
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Warning "This script must be run as Administrator!"
    Write-Host "Right-click on PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "Enabling symbolic link privileges for current user..." -ForegroundColor Green

try {
    # Enable symbolic link privilege for the current user
    $username = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
    
    # Use secedit to grant the privilege
    $tempFile = [System.IO.Path]::GetTempFileName()
    secedit /export /cfg $tempFile /quiet
    
    $content = Get-Content $tempFile
    $newContent = $content -replace '(SeCreateSymbolicLinkPrivilege = )(.*)', "`$1`$2,$username"
    
    if ($content -notmatch 'SeCreateSymbolicLinkPrivilege') {
        $newContent += "SeCreateSymbolicLinkPrivilege = $username"
    }
    
    $newContent | Set-Content $tempFile
    secedit /configure /db secedit.sdb /cfg $tempFile /quiet
    Remove-Item $tempFile -Force
    
    Write-Host "SUCCESS: Symbolic link privileges enabled!" -ForegroundColor Green
    Write-Host ""
    Write-Host "You may need to:" -ForegroundColor Yellow
    Write-Host "1. Restart your command prompt/PowerShell" -ForegroundColor Yellow
    Write-Host "2. Or restart your computer for changes to take effect" -ForegroundColor Yellow
    
} catch {
    Write-Error "Failed to enable symbolic link privileges: $($_.Exception.Message)"
    Write-Host ""
    Write-Host "Alternative: Try running the build with Administrator privileges" -ForegroundColor Yellow
}

Write-Host ""
Read-Host "Press Enter to continue"