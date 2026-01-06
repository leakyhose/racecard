FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency definitions
COPY frontend/package*.json ./frontend/
COPY shared/ ./shared/

# Install dependencies
WORKDIR /app/frontend
# Pass build arguments
ARG VITE_BACKEND_URL
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL

RUN npm ci

# Copy source code
COPY frontend/ .

# Build the application
RUN npm run build

# Runtime stage
FROM nginx:alpine

# Copy nginx config for SPA routing
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
