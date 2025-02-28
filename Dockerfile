# Base image
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package files and config
COPY package*.json ./
COPY tsconfig.json ./
COPY vite.config.ts ./
COPY theme.json ./

# Copy source code
COPY server ./server
COPY shared ./shared
COPY client ./client

# Install dependencies
RUN npm install

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 6000

# Start server
CMD ["npm", "run", "start"] 