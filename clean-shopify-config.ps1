# Clean Shopify Configuration and Keep Only WooCommerce
# This PowerShell script runs the TypeScript cleanup script

# Make sure we're in the correct directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

# Check if ts-node is installed
try {
    $tsNodeVersion = npx ts-node --version
    if ($LASTEXITCODE -ne 0) {
        throw "ts-node not found"
    }
} catch {
    Write-Host "⚠️ ts-node is not installed. Installing..."
    npm install -g ts-node typescript
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install ts-node. Please install it manually."
        exit 1
    }
}

# Check if required dependencies are installed
if (-not (Test-Path "node_modules")) {
    Write-Host "⚠️ Node modules not found. Installing dependencies..."
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install dependencies. Please install them manually."
        exit 1
    }
}

# Run the cleanup script
Write-Host "Running Shopify configuration cleanup script..."
npx ts-node scripts/clean-shopify-config.ts
Write-Host "Script execution complete."

# Exit with the script's exit code
exit $LASTEXITCODE 