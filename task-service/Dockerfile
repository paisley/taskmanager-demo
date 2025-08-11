# Task Service Dockerfile
FROM registry.access.redhat.com/ubi8/ubi:latest

# Intentional security flaw: running as root
USER root

WORKDIR /app

# Install Node.js 18 and curl on UBI8
# - reset/enable the nodejs module to 18
# - clean metadata to keep the image smaller
RUN dnf -y module reset nodejs \
    && dnf -y module enable nodejs:18 \
    && dnf -y install nodejs curl \
    && dnf -y clean all \
    && rm -rf /var/cache/dnf

# COPY package files first for better layer caching
COPY package*.json ./

# Install dependencies (including dev dependencies - intentional)
RUN npm install

# Copy source code
COPY . .

# Expose port used by the Auth Service
EXPOSE 3002

# Start the application
CMD ["npm", "start"]
