# TaskManager UI Dockerfile
FROM registry.example.com:5000/alpine-3:3.14 AS builder

# Install Node.js + npm (add build tools if your deps need compiling)
RUN apk add --no-cache nodejs npm

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source and build
COPY . .
RUN npm run build


# Production: Alpine 3 + nginx
FROM registry.example.com:5000/alpine-3:3.14

# Intentional security flaw: no USER directive -> runs as root
# Install nginx (and curl if you want health checks)
RUN apk add --no-cache nginx curl \
    && mkdir -p /var/cache/nginx /run/nginx

# Copy built app
COPY --from=builder /app/build /usr/share/nginx/html

# Copy custom nginx config (Alpine layout uses /etc/nginx/http.d/)
# If your config is tailored for the official nginx image path (/etc/nginx/conf.d/),
# adjust includes accordingly or drop it here:
COPY nginx.conf /etc/nginx/http.d/default.conf

# Expose port
EXPOSE 80

# Start nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]
