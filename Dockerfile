# ---------- BUILD STAGE ----------
FROM node:22-slim AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy all source files
COPY . .

# Build NestJS project
RUN npm run build

# ---------- PRODUCTION STAGE ----------
FROM node:22-slim

# Install Chromium dependencies for Puppeteer
RUN apt-get update && apt-get install -y \
    wget \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
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
    lsb-release \
    xdg-utils \
    libu2f-udev \
    libvulkan1 \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy only package files & install production dependencies
COPY package*.json ./
RUN npm install --omit=dev --legacy-peer-deps

# Copy build output from builder stage
COPY --from=builder /app/dist ./dist

# Create empty folder for WhatsApp session (will be mounted as a volume)
RUN mkdir -p /app/whatsapp-session

EXPOSE 3005

CMD ["node", "dist/main"]

