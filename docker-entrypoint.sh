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

# Security headers (issues/380): the CSP allows the API of this site (scheme and
# host of VUE_APP_API_URL) and the inline scripts of index.html (hashes written
# by the Dockerfile). Only these two variables are replaced: the file holds no
# nginx $variables, but keep the list explicit anyway.
API_ORIGIN=$(printf '%s' "${VUE_APP_API_URL}" | sed -nE 's|^(https?://[^/?#]+).*|\1|p')
CSP_SCRIPT_HASHES=$(cat /etc/nginx/csp-script-hashes 2>/dev/null)
export API_ORIGIN CSP_SCRIPT_HASHES
mkdir -p /etc/nginx/snippets
envsubst '${API_ORIGIN} ${CSP_SCRIPT_HASHES}' < /etc/nginx/templates/security-headers.conf.template > /etc/nginx/snippets/security-headers.conf
echo "CSP API origin: ${API_ORIGIN:-(none)}"

echo "Generated config.js:"
cat /usr/share/nginx/html/config.js

echo "Starting nginx..."

# Start nginx
exec nginx -g 'daemon off;'
