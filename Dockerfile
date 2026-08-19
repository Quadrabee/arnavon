FROM node:22-alpine AS builder

WORKDIR /arnavon

COPY package.json package-lock.json ./
RUN npm install

COPY . .
RUN npm run build

RUN npm install -g .

USER node
ENTRYPOINT ["arnavon"]
