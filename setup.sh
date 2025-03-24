#!/bin/bash

# Create required directories
mkdir -p nginx/conf.d
mkdir -p nginx/ssl
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

# Prompt for SSL certificate setup
echo "Do you want to set up SSL with Certbot? (y/n)"
read -r setup_ssl

if [ "$setup_ssl" = "y" ]; then
    # Install Certbot
    sudo apt-get update
    sudo apt-get install -y certbot

    # Get SSL certificate
    sudo certbot certonly --standalone -d scrapingns.hapidzfadli.com

    # Copy SSL certificates
    sudo cp /etc/letsencrypt/live/scrapingns.hapidzfadli.com/fullchain.pem nginx/ssl/
    sudo cp /etc/letsencrypt/live/scrapingns.hapidzfadli.com/privkey.pem nginx/ssl/
    
    # Set proper permissions
    sudo chmod 755 nginx/ssl
    sudo chmod 644 nginx/ssl/fullchain.pem nginx/ssl/privkey.pem
fi

# Build and start the Docker containers
docker-compose up -d

echo "Setup complete! Your application should be accessible at https://scrapingns.hapidzfadli.com"