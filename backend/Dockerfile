# Use official lightweight Node.js runtime
FROM node:20-slim

# Set working directory inside the container
WORKDIR /app

# Copy dependency definitions first to take advantage of Docker layer caching
COPY package*.json ./

# Install dependencies (clean install)
RUN npm ci --omit=dev

# Copy application source code
COPY . .

# Expose the backend port
EXPOSE 5001

# Define environment variables
ENV NODE_ENV=production
ENV PORT=5001

# Start the application using non-root user when possible
USER node

# Start the server
CMD ["node", "src/index.js"]
