Write-Host "🧹 Cleaning up node_modules and Next.js cache..." -ForegroundColor Cyan
if (Test-Path "node_modules") { Remove-Item -Recurse -Force "node_modules" }
if (Test-Path ".next") { Remove-Item -Recurse -Force ".next" }
if (Test-Path ".vercel") { Remove-Item -Recurse -Force ".vercel" }

Write-Host "📦 Reinstalling dependencies..." -ForegroundColor Yellow
npm install

Write-Host "✅ Clean installation completed!" -ForegroundColor Green 