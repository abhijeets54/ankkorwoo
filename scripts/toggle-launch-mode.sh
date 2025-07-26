#!/bin/bash

# Script to toggle the LAUNCHING_SOON value in the .env file
# This makes it easy to enable/disable the "launching soon" mode

ENV_FILE=".env.local"

# Check if .env.local exists
if [ ! -f "$ENV_FILE" ]; then
  echo "Error: $ENV_FILE does not exist. Please create it first."
  exit 1
fi

# Check if LAUNCHING_SOON exists in the file
if grep -q "LAUNCHING_SOON=" "$ENV_FILE"; then
  # Get current value
  CURRENT_VALUE=$(grep "LAUNCHING_SOON=" "$ENV_FILE" | cut -d= -f2)
  
  if [ "$CURRENT_VALUE" == "true" ]; then
    # Replace true with false
    sed -i 's/LAUNCHING_SOON=true/LAUNCHING_SOON=false/g' "$ENV_FILE"
    echo "✅ Launching soon mode has been DISABLED."
    echo "🚀 Rebuild and redeploy your app for changes to take effect."
  else
    # Replace false with true
    sed -i 's/LAUNCHING_SOON=false/LAUNCHING_SOON=true/g' "$ENV_FILE"
    echo "✅ Launching soon mode has been ENABLED."
    echo "🚀 Rebuild and redeploy your app for changes to take effect."
  fi
else
  # Add the variable to the file
  echo "# Launching Soon Feature Configuration" >> "$ENV_FILE"
  echo "LAUNCHING_SOON=true" >> "$ENV_FILE"
  echo "✅ Added LAUNCHING_SOON=true to $ENV_FILE."
  echo "🚀 Rebuild and redeploy your app for changes to take effect."
fi

# Remind about next steps
echo ""
echo "Next steps:"
echo "1. Commit the changes to your repository"
echo "2. Deploy to production"
echo ""
echo "To disable this feature entirely, remove the LaunchingSoon component from your application." 