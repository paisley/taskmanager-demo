# Auth Service Dockerfile
FROM registry.access.redhat.com/ubi8/ubi:latest

WORKDIR /app

# Install Node.js 18 and curl on UBI8
# - reset/enable the nodejs module to 18
# - clean metadata to keep the image smaller
RUN dnf module reset -y nodejs \
    && dnf module enable -y nodejs:18 \
    && dnf install -y nodejs curl \
    && dnf clean all \
    && rm -rf /var/cache/dnf

# COPY package files first for better layer caching
COPY package*.json ./

# Install dependencies (including dev dependencies - intentional)
RUN npm install

# Copy source code
COPY . .

# Run as a non-root user (AC-6)
RUN useradd -r -u 10001 -s /sbin/nologin app \
    && chown -R app:app /app
USER app

# Expose port used by the Auth Service
EXPOSE 3001

# Start the application
CMD ["npm", "start"]
