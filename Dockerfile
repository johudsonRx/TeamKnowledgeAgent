# Base image
FROM node:18

# Install curl
RUN apt-get update && apt-get install -y curl

# Set working directory
WORKDIR /app

# Download the certificate
RUN curl -o /app/global-bundle.pem https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem

# Copy package files and config
COPY package*.json ./
COPY tsconfig.json ./
COPY vite.config.ts ./
COPY theme.json ./

# Copy source code
COPY server ./server
COPY shared ./shared
COPY client ./client

# Update MongoDB connection options to use the correct path
RUN sed -i 's|tlsCAFile: ./rds-combined-ca-bundle.pem|tlsCAFile: /app/global-bundle.pem|' server/connectToDB.ts

# Install dependencies
RUN npm install

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 6000

# Start server
CMD ["npm", "run", "dev:server"] 