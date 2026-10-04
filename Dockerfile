# Un seul déploiement pour tout : serveur de licences (licensing/) + site de vente (site/) sur le même domaine.
# Pour le serveur seul, utiliser licensing/Dockerfile.
FROM node:22-alpine
WORKDIR /app
COPY licensing/package.json licensing/package-lock.json ./
RUN npm ci --omit=dev
COPY licensing/src ./src
COPY licensing/public ./public
COPY licensing/scripts ./scripts
COPY site/index.html site/favicon.svg ./site/
COPY site/downloads ./site/downloads
ENV NODE_ENV=production DATABASE_PATH=/data/rago.db PORT=8787 SITE_DIR=/app/site
VOLUME /data
EXPOSE 8787
CMD ["npm", "start"]
