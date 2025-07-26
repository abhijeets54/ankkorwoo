# Run Next.js with WooCommerce Environment Variables
# This script loads the WooCommerce environment variables and starts the server

# Make sure we're in the correct directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

# Check if .env.woocommerce exists; if not, create it from example
if (-not (Test-Path ".env.woocommerce")) {
    if (Test-Path "env.woocommerce.example") {
        Write-Host "⚠️ .env.woocommerce not found, creating from example file..."
        Copy-Item "env.woocommerce.example" ".env.woocommerce"
        Write-Host "✅ Created .env.woocommerce file. Please update it with your actual credentials."
    }
    else {
        Write-Host "❌ No env.woocommerce.example file found. Please create a .env.woocommerce file manually."
    }
}

# Set the NEXT_PUBLIC_COMMERCE_PROVIDER to woocommerce if not already set
$envContent = Get-Content ".env.woocommerce" -Raw
if (-not $envContent.Contains("NEXT_PUBLIC_COMMERCE_PROVIDER=woocommerce")) {
    Add-Content ".env.woocommerce" "`nNEXT_PUBLIC_COMMERCE_PROVIDER=woocommerce"
    Write-Host "✅ Added NEXT_PUBLIC_COMMERCE_PROVIDER=woocommerce to .env.woocommerce"
}

# Copy the WooCommerce environment file to .env.local
Write-Host "Copying WooCommerce environment to .env.local..."
Copy-Item ".env.woocommerce" ".env.local" -Force

# Run the app with the WooCommerce environment variables
Write-Host "Starting Next.js development server with WooCommerce configuration..."
npm run dev:woo 