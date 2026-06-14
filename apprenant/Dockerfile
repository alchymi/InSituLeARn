# ─── Build stage ──────────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

RUN npm install -g pnpm@9

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

COPY . .
RUN pnpm exec tsc --noEmit && pnpm exec vite build

# ─── Serve stage ──────────────────────────────────────────────
FROM nginx:1.27-alpine

COPY --from=build /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY docker-entrypoint.sh /docker-entrypoint.d/30-insitu-config.sh
RUN sed -i 's/\r$//' /docker-entrypoint.d/30-insitu-config.sh && chmod +x /docker-entrypoint.d/30-insitu-config.sh

EXPOSE 8080
