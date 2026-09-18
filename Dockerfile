FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build --configuration=production

FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/dist/supply-chain-frontend ./dist/supply-chain-frontend
EXPOSE 4000
ENV PORT=4000
CMD ["node", "dist/supply-chain-frontend/server/server.mjs"]