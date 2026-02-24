# Builder
FROM node:20 AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for building)
RUN npm install --prefer-offline --no-audit --progress=false

# Copy source code
COPY . .

# Build the application
RUN npm run build
# Development
FROM node:20 AS development

# Set environment variable for development
ENV NODE_ENV=$NODE_ENV
ENV PORT=$PORT

# Set working directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm install --prefer-offline --no-audit --progress=false

# Configure permissions for the 'node' user
RUN chown -R node:node .

# Change to the 'node' user to avoid running as root
USER node

# Expose port
EXPOSE $PORT

# Start application in development mode
CMD ["npm", "run", "start:dev"]

# Production stage
FROM node:20 AS production

# Set environment variables
ENV NODE_ENV=$NODE_ENV
ENV PORT=$PORT
ENV NODE_OPTIONS=--enable-source-maps

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm install --omit=dev --prefer-offline --no-audit --progress=false

# Copy built application
COPY --from=builder /app/dist ./dist

# Configure permissions
RUN chown -R node:node .

# Change to non-root user
USER node

# Expose port
EXPOSE $PORT

# Start application
CMD ["node", "dist/main"]
