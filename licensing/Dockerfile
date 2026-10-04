FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY src ./src
COPY public ./public
COPY scripts ./scripts
COPY supabase ./supabase
ENV NODE_ENV=production PORT=8787
EXPOSE 8787
CMD ["npm", "start"]
