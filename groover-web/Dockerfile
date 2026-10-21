FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --include=dev
COPY . .
ARG VITE_API_URL=/v1
ENV VITE_API_URL=$VITE_API_URL
RUN npm run lint && npm test && npm run build

FROM nginxinc/nginx-unprivileged:1.30.6-alpine
USER root
# This server only serves static assets and proxies HTTP; optional XML/image/JS modules are unused.
RUN apk del curl nginx-module-xslt nginx-module-njs nginx-module-image-filter nginx-module-geoip \
    && apk upgrade --no-cache
COPY --chmod=755 nginx/15-validate-proxy.sh /docker-entrypoint.d/15-validate-proxy.sh
COPY nginx/nginx.conf /etc/nginx/groover.conf
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build --chown=101:101 /app/dist /usr/share/nginx/html
USER 101:101
ENV NGINX_ENVSUBST_OUTPUT_DIR=/tmp/nginx
ENV NGINX_ENVSUBST_FILTER=^CADDY_PROXY_IP$
CMD ["nginx", "-g", "daemon off;", "-c", "/etc/nginx/groover.conf"]
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:8080/healthz || exit 1
