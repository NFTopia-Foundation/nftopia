# Use an official Node.js LTS image
FROM node:25-alpine

# Set the working directory for the backend service
WORKDIR /app/apps/backend

# Copy root package.json and pnpm-lock.yaml to install monorepo dependencies
COPY package.json pnpm-lock.yaml /app/

# Copy backend-specific package.json and pnpm-lock.yaml
COPY apps/backend/package.json apps/backend/pnpm-lock.yaml ./

# Install dependencies using pnpm
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy the entire monorepo
COPY . /app

# Build the backend service
RUN pnpm --filter backend run build

# Expose port 8000
EXPOSE 9000

# Set environment variables (Railway will override these in production)
ENV PORT=9000
ENV DATABASE_URL=${DATABASE_URL}

# Start the backend service
CMD ["pnpm", "--filter", "backend", "start"]
