# Stage 1: deps
FROM node:18-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production && npm cache clean --force

# Stage 2: prisma
FROM node:18-alpine AS prisma
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci && npm cache clean --force
COPY prisma ./prisma/
RUN npx prisma generate
RUN rm -rf node_modules/.bin prisma

# Final stage
FROM node:18-alpine

RUN apk add --no-cache dumb-init

RUN addgroup -S nodejs -g 1001 && adduser -S nodejs -u 1001
USER nodejs

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=prisma /app/node_modules/.prisma ./node_modules/.prisma
COPY package.json ./
COPY src ./src/
COPY server.js ./
COPY .env .env
COPY keys ./keys/

EXPOSE 8080

CMD ["dumb-init", "node", "server.js"]
