# Base image
FROM node:20-slim

# Install curl
RUN apt-get update && apt-get install -y curl

# Set working directory
WORKDIR /app

# Download the certificate
RUN curl -o /app/global-bundle.pem https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem

# First, copy all source files
COPY . .

# Then install dependencies in each directory
RUN npm install
RUN cd client && npm install
RUN cd server && npm install

# Build the client
RUN cd client && npm run build

# Create public directory and move the built client files
RUN mkdir -p /app/server/public && \
    mv client/dist/* /app/server/public/

# Verify the files exist
RUN ls -la /app/server/public/

# Expose port
# Add Vite's default port
EXPOSE 6000
EXPOSE 5173  

# Start server in production mode
CMD ["npm", "run", "dev:all"] 