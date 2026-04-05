# Command to build: docker build -t lifeboard-server .
# Command for GCP Cloud Run: gcloud run deploy lifeboard-server --source .

# --- Build Stage ---
FROM node:22-alpine AS builder

WORKDIR /app

# Enable pnpm via corepack
RUN corepack enable && corepack prepare pnpm@10.30.3 --activate

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy the server source
COPY . .

# Build the application
RUN pnpm run build

# --- Production Stage ---
FROM node:22-alpine AS production

WORKDIR /app

# Enable pnpm via corepack
RUN corepack enable && corepack prepare pnpm@10.30.3 --activate

# Copy package files and install ONLY production dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

# Copy the compiled output from the builder
COPY --from=builder /app/dist ./dist

# Set standard environment variables for production and Cloud Run
ENV NODE_ENV=production
# Cloud Run automatically sets the PORT environment variable to 8080
ENV PORT=8080
EXPOSE 8080

CMD ["node", "dist/main.js"]
