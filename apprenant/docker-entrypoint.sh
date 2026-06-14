#!/bin/sh
set -e

cat > /usr/share/nginx/html/env.js <<EOF
window.__INSITU_CONFIG__ = {
  POCKETBASE_URL: "${POCKETBASE_URL:-}",
  ADMIN_APP_URL: "${ADMIN_APP_URL:-}",
  PUBLIC_APP_URL: "${PUBLIC_APP_URL:-}",
};
EOF

echo "Apprenant env.js regenerated:"
cat /usr/share/nginx/html/env.js
