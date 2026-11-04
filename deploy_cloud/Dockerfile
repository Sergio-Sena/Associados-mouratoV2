FROM node:20-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY scripts/mica_whatsapp_server.mjs ./scripts/

EXPOSE 3005

ENV NODE_ENV=production
ENV MICA_PORT=3005

CMD ["node", "scripts/mica_whatsapp_server.mjs"]
