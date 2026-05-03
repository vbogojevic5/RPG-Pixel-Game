FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

EXPOSE 3001

ENTRYPOINT ["/bin/sh", "-c", "npx prisma migrate deploy && node prisma/seed.js && exec node index.js"]
