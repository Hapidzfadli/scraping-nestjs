#!/bin/bash

# Server IP address
SERVER_IP="152.42.237.33"

# Create required directories
mkdir -p nginx/conf.d
mkdir -p nginx/www
mkdir -p logs

# Copy Nginx configuration
cp scraping.conf nginx/conf.d/

# Check if Docker and Docker Compose are installed
if ! command -v docker &> /dev/null; then
    echo "Docker is not installed. Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
fi

if ! command -v docker-compose &> /dev/null; then
    echo "Docker Compose is not installed. Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# Build and start the Docker containers
docker-compose up -d

echo "Setup complete! Your application should be accessible at http://$SERVER_IP"
