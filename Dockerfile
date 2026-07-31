# ---------- Stage 1: build the Vite bundle ----------
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies first so this layer caches between builds.
COPY package.json ./
RUN npm install

# Build metadata supplied by the Jenkins pipeline. Vite only exposes
# variables prefixed with VITE_ to client code.
ARG BUILD_NUMBER=local
ARG GIT_COMMIT=dev
ENV VITE_BUILD_NUMBER=$BUILD_NUMBER
ENV VITE_GIT_COMMIT=$GIT_COMMIT

COPY . .
RUN npm run build

# ---------- Stage 2: serve the static bundle ----------
# Only the compiled output ships, so the final image carries no build
# toolchain and stays small.
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
