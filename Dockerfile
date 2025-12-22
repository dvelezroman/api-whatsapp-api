# ---------- BUILD STAGE ----------
FROM node:22-slim AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
COPY .npmrc ./
# Clean npm cache and install with cache cleanup
RUN npm cache clean --force && \
    npm ci --legacy-peer-deps && \
    npm cache clean --force

# Copy all source files
COPY . .

# Build NestJS project
RUN npm run build && \
    npm cache clean --force

# ---------- PRODUCTION STAGE ----------
FROM node:22-slim

# Set environment variables for Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV CHROME_BIN=/usr/bin/chromium
ENV CHROMIUM_FLAGS="--no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage"

# Install Chromium and all required dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    fonts-liberation \
    fonts-noto-color-emoji \
    fonts-noto-cjk \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    libu2f-udev \
    libvulkan1 \
    xdg-utils \
    curl \
    wget \
    chromium \
    chromium-sandbox \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/* && \
    apt-get clean

WORKDIR /app

# Copy only package files & install production dependencies
COPY package*.json ./
COPY .npmrc ./
# Clean npm cache before and after install
RUN npm cache clean --force && \
    npm ci --omit=dev --legacy-peer-deps && \
    npm cache clean --force

# Copy build output from builder stage
COPY --from=builder /app/dist ./dist

# Create empty folder for WhatsApp session (will be mounted as a volume)
RUN mkdir -p /app/whatsapp-session

EXPOSE 3005

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3005/health || exit 1

CMD ["node", "dist/main"]

