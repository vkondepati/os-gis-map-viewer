FROM node:20-alpine as base
WORKDIR /app
COPY package.json tsconfig.json ./
COPY src ./src
RUN npm i -g pnpm && pnpm add -D typescript tsx && pnpm add fastify @fastify/cors undici
EXPOSE 8080
CMD ["pnpm","dlx","tsx","src/index.ts"]
