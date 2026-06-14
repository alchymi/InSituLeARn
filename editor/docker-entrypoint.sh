#!/bin/sh
set -e

# Regenerate /env.js from runtime env vars before nginx starts.
# Values left empty if the env var isn't set; the app falls back to its default.
cat > /usr/share/nginx/html/env.js <<EOF
window.__INSITU_CONFIG__ = {
  POCKETBASE_URL: "${POCKETBASE_URL:-}",
  ADMIN_APP_URL: "${ADMIN_APP_URL:-}",
  PUBLIC_APP_URL: "${PUBLIC_APP_URL:-}",
};
EOF

echo "Editor env.js regenerated:"
cat /usr/share/nginx/html/env.js
