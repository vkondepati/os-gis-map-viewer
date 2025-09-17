FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm i -g pnpm && pnpm i
EXPOSE 8090
CMD ["node","src/index.ts"]
