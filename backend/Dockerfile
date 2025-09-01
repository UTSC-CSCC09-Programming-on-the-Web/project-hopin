FROM node:24-alpine as base
WORKDIR /app

# Dev Stage
FROM base as dev
# Copy instead of mount due to watch during local dev
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --include=dev && npx prisma generate

COPY . .
USER node
CMD ["npm", "run", "dev"]

# Production Stage
FROM base as prod
RUN --mount=type=bind,source=package.json,target=package.json \
  --mount=type=bind,source=package-lock.json,target=package-lock.json \
  --mount=type=bind,source=prisma,target=prisma \
  npm ci --omit=dev && npx prisma generate

COPY . .
USER node
CMD ["node", "dist/index.js"]
