# IMPORTANT: This Dockerfile expects the build context to be the ROOT of the repository (lifeboardOS).
# Command to build: docker build -f Lifeboard-Server/Dockerfile .
# Command for GCP Cloud Run: gcloud run deploy lifeboard-server --source . --dockerfile Lifeboard-Server/Dockerfile

# --- Build Stage ---
FROM node:22-alpine AS builder

WORKDIR /app

# Enable pnpm via corepack
RUN corepack enable && corepack prepare pnpm@10.30.3 --activate

# Copy package files (we do server only as the root might not have a package.json)
COPY Lifeboard-Server/package.json Lifeboard-Server/pnpm-lock.yaml ./Lifeboard-Server/

# Install dependencies
WORKDIR /app/Lifeboard-Server
RUN pnpm install --frozen-lockfile

# Copy the server source and the shared directory
WORKDIR /app
COPY shared ./shared
COPY Lifeboard-Server ./Lifeboard-Server

# Build the application
WORKDIR /app/Lifeboard-Server
RUN pnpm run build

# --- Production Stage ---
FROM node:22-alpine AS production

WORKDIR /app

# Enable pnpm via corepack
RUN corepack enable && corepack prepare pnpm@10.30.3 --activate

# Copy server package JSON and install ONLY production dependencies
COPY Lifeboard-Server/package.json Lifeboard-Server/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

# Copy the compiled output from the builder
COPY --from=builder /app/Lifeboard-Server/dist ./dist

# Set standard environment variables for production and Cloud Run
ENV NODE_ENV=production
# Cloud Run automatically sets the PORT environment variable to 8080. Our main.ts uses process.env.PORT.
ENV PORT=8080
EXPOSE 8080

# The compiled output directory structure is nested because the @shared path alias expands the TS rootDir.
CMD ["node", "dist/Lifeboard-Server/src/main.js"]
