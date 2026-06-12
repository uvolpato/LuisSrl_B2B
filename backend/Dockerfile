FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY prisma ./prisma
RUN npx prisma generate
COPY --from=build /app/dist ./dist
COPY scripts ./scripts
EXPOSE 3001
# Applica le migrazioni (incluse le stored procedure) e avvia l'API
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
