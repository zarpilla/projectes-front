#!/bin/bash
echo "Testing environment variable injection..."

# Test values
export VUE_APP_API_URL="https://api.example.com"
export VUE_APP_RESET_PASSWORD="https://example.com/reset"
export VUE_APP_PATH="/test-path/"

echo "VUE_APP_API_URL: ${VUE_APP_API_URL}"
echo "VUE_APP_RESET_PASSWORD: ${VUE_APP_RESET_PASSWORD}"
echo "VUE_APP_PATH: ${VUE_APP_PATH}"

# Simulate what the Docker entrypoint would do
echo "Creating test config.js..."
envsubst '${VUE_APP_API_URL} ${VUE_APP_RESET_PASSWORD} ${VUE_APP_PATH}' < dist/config.js.template > dist/config.js

echo "Generated config.js:"
cat dist/config.js
