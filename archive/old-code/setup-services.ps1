# Setup Tiasas as Windows Services
# Run this script as Administrator

Write-Host "=== Tiasas Windows Service Setup ===" -ForegroundColor Cyan

# Step 1: Install PM2 globally
Write-Host "`n[1/5] Installing PM2..." -ForegroundColor Yellow
npm install -g pm2
npm install -g pm2-windows-service

# Step 2: Install PM2 as Windows service
Write-Host "`n[2/5] Setting up PM2 Windows Service..." -ForegroundColor Yellow
Write-Host "Accept defaults when prompted" -ForegroundColor Gray
pm2-service-install -n PM2

# Step 3: Build Next.js app
Write-Host "`n[3/5] Building Next.js application..." -ForegroundColor Yellow
Set-Location "d:\GenAi\Projects\Tiasas\apps\web"
npm run build

# Step 4: Start app with PM2
Write-Host "`n[4/5] Starting app with PM2..." -ForegroundColor Yellow
pm2 delete tiasas-web -s 2>$null # Delete if exists (silent)
pm2 start npm --name "tiasas-web" -- start
pm2 save

# Step 5: Display next steps for Cloudflare tunnel
Write-Host "`n[5/5] Cloudflare Tunnel Setup" -ForegroundColor Yellow
Write-Host @"

To set up Cloudflare Tunnel as a Windows service:

1. Download NSSM from https://nssm.cc/download
2. Extract to C:\Program Files\nssm

3. Run as Administrator:
   "C:\Program Files\nssm\win64\nssm.exe" install CloudflareTunnel

4. In the NSSM GUI, configure:
   Application tab:
   - Path: C:\Program Files\cloudflared\cloudflared.exe
   - Startup directory: C:\Users\srina\.cloudflared
   - Arguments: tunnel run tiasas-tunnel

   Details tab:
   - Display name: Cloudflare Tunnel - Tiasas

   I/O tab:
   - Output: C:\Users\srina\.cloudflared\tunnel.log
   - Error: C:\Users\srina\.cloudflared\tunnel-error.log

5. Click "Install service"

6. Start the service:
   net start CloudflareTunnel

"@ -ForegroundColor Gray

Write-Host "`n=== PM2 Service Status ===" -ForegroundColor Cyan
pm2 list
pm2 info tiasas-web

Write-Host "`n=== Setup Complete! ===" -ForegroundColor Green
Write-Host "Your Next.js app is now running as a Windows service." -ForegroundColor Green
Write-Host "It will automatically start on system reboot." -ForegroundColor Green
Write-Host "`nUseful PM2 commands:" -ForegroundColor Cyan
Write-Host "  pm2 list                 - List all processes" -ForegroundColor Gray
Write-Host "  pm2 logs tiasas-web      - View logs" -ForegroundColor Gray
Write-Host "  pm2 restart tiasas-web   - Restart app" -ForegroundColor Gray
Write-Host "  pm2 stop tiasas-web      - Stop app" -ForegroundColor Gray
Write-Host "  pm2 delete tiasas-web    - Remove from PM2" -ForegroundColor Gray
