FROM node:20-bookworm-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ENV NODE_ENV=production
ENV PORT=4000
ENV DATABASE_PATH=/app/data/wattwise.db

RUN npm run build

EXPOSE 4000

CMD ["npm", "start"]
