# Stage 1: Build
FROM node:24-alpine3.21 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN npx prisma generate

# Stage 2: Runtime
FROM node:24-alpine3.21

WORKDIR /app

COPY --from=builder /app /app

ENV HOST=0.0.0.0
EXPOSE 8080

CMD ["npm", "start"]
