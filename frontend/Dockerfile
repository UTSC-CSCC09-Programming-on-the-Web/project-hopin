FROM node:24-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# Build the Next.js app
RUN npm run build

COPY .env .env
ENV PORT=3000
EXPOSE 3000

CMD ["npm", "start"]
