#!/bin/sh

echo "=== Docker Entrypoint Debug ==="
echo "VUE_APP_API_URL: ${VUE_APP_API_URL}"
echo "VUE_APP_RESET_PASSWORD: ${VUE_APP_RESET_PASSWORD}"
echo "VUE_APP_PATH: ${VUE_APP_PATH}"
echo "Template file exists: $(test -f /usr/share/nginx/html/config.js.template && echo 'YES' || echo 'NO')"

echo "Injecting environment variables..."

# Replace environment variables in config.js
envsubst '${VUE_APP_API_URL} ${VUE_APP_RESET_PASSWORD} ${VUE_APP_PATH}' < /usr/share/nginx/html/config.js.template > /usr/share/nginx/html/config.js

# Copy static nginx config (no need for templating since paths are baked in)
cp /etc/nginx/templates/default.conf.template /etc/nginx/conf.d/default.conf

echo "Generated config.js:"
cat /usr/share/nginx/html/config.js

echo "Starting nginx..."

# Start nginx
exec nginx -g 'daemon off;'
