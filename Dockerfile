# Build the static export, then serve it as files. There is no server runtime:
# nginx hands out a directory, and every claim in the README stays true.

FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runner
ENV PORT=8080
COPY --from=builder /app/out /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
EXPOSE 8080
