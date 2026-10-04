# Variante : serveur de licences (licensing/) + site de vente (site/) sur un même domaine.
# Chemin recommandé : Railway avec Root Directory = licensing (licensing/Dockerfile) et le site sur Netlify,
# voir licensing/docs/MISE-EN-LIGNE.md. Cette variante demande les mêmes variables, dont DATABASE_URL.
FROM node:22-alpine
WORKDIR /app
COPY licensing/package.json licensing/package-lock.json ./
RUN npm ci --omit=dev
COPY licensing/src ./src
COPY licensing/public ./public
COPY licensing/scripts ./scripts
COPY licensing/supabase ./supabase
COPY site/index.html site/favicon.svg ./site/
COPY site/downloads ./site/downloads
ENV NODE_ENV=production PORT=8787 SITE_DIR=/app/site
EXPOSE 8787
CMD ["npm", "start"]
