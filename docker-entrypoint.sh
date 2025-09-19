#!/bin/sh

echo "=== Docker Entrypoint Debug ==="
echo "VUE_APP_API_URL: ${VUE_APP_API_URL}"
echo "VUE_APP_RESET_PASSWORD: ${VUE_APP_RESET_PASSWORD}"
echo "VUE_APP_PATH: ${VUE_APP_PATH}"
echo "Template file exists: $(test -f /usr/share/nginx/html/config.js.template && echo 'YES' || echo 'NO')"

echo "Injecting environment variables..."

# Set the base path for nginx (remove trailing slash if present)
export VUE_APP_BASE_PATH="${VUE_APP_PATH%/}/"
if [ "$VUE_APP_BASE_PATH" = "/" ]; then
    export VUE_APP_BASE_PATH="/"
fi

# Replace environment variables in config.js
envsubst '${VUE_APP_API_URL} ${VUE_APP_RESET_PASSWORD} ${VUE_APP_PATH}' < /usr/share/nginx/html/config.js.template > /usr/share/nginx/html/config.js

# Replace environment variables in nginx config
envsubst '${VUE_APP_BASE_PATH}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

echo "Generated config.js:"
cat /usr/share/nginx/html/config.js

echo "Generated nginx config:"
cat /etc/nginx/conf.d/default.conf

echo "Starting nginx..."

# Start nginx
exec nginx -g 'daemon off;'
