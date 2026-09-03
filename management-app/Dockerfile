# Etapa 1: build de Angular
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# Etapa 2: nginx sirviendo la SPA y haciendo proxy de /api al backend
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/management-app/browser /usr/share/nginx/html
EXPOSE 80
