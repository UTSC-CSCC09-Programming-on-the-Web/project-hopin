FROM node:24-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
COPY .env .env

# Build the Next.js app
RUN npm run build
ENV PORT=3000
EXPOSE 3000

CMD ["npm", "start"]
