FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY src ./src
COPY public ./public
COPY scripts ./scripts
ENV NODE_ENV=production DATABASE_PATH=/data/rago.db PORT=8787
VOLUME /data
EXPOSE 8787
CMD ["npm", "start"]
