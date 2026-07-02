# Build the Angular app with docker-specific environment (relative API/hub URLs).
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npx ng build --configuration docker

# Serve via nginx and proxy API + SignalR to the api service.
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/gridpulse/browser /usr/share/nginx/html

EXPOSE 80
