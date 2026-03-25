# Base image (using full node image for native binaries like bcrypt)
FROM node:22 AS builder

# Create app directory
WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Copy dependency files
COPY package.json pnpm-lock.yaml ./

# Install app dependencies
RUN pnpm install

# Bundle app source
COPY . .

# Build the app
RUN pnpm run build

# Start a new stage for a smaller production image
FROM node:22-slim AS production

# Security: Set node environment to production
ENV NODE_ENV production

WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Copy dependency files
COPY package.json pnpm-lock.yaml ./

# Install only production dependencies
RUN pnpm install --prod

# Copy the built application from the builder stage
COPY --from=builder /app/dist ./dist

# EXPOSE port (Cloud Run sets PORT env var)
EXPOSE 8080

# Command to run the application
CMD [ "node", "dist/main.js" ]
