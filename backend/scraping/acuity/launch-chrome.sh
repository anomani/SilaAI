#!/bin/bash

# Create chrome dev profile directory if it doesn't exist
mkdir -p ~/chrome-dev-profile

# Launch Chrome with remote debugging
echo "Launching Chrome with remote debugging on port 9222..."
echo "Keep this terminal window open while running the scraper."
echo "To stop, press Ctrl+C"

/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
    --remote-debugging-port=9222 \
    --user-data-dir=~/chrome-dev-profile \
    --disable-web-security \
    --disable-features=VizDisplayCompositor 