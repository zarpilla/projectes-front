# Multi-stage build for Vue.js application

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production=false

# Copy source code
COPY . .

# Build the application
ENV VUE_APP_DOCKER=true
RUN npm run build

# Production stage
FROM nginx:alpine AS production

# Install gettext for envsubst
RUN apk add --no-cache gettext

# Copy built application from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Create a basic nginx configuration for Vue Router
# Copy nginx config template
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Copy the startup script and config template
COPY docker-entrypoint.sh /docker-entrypoint.sh
COPY public/config.js.template /usr/share/nginx/html/config.js.template
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80

CMD ["/docker-entrypoint.sh"]
