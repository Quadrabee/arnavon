FROM node:20-alpine as builder

WORKDIR /arnavon

COPY package.json package-lock.json ./
RUN npm install

COPY . .
RUN npm run build

RUN npm install -g .

USER node
ENTRYPOINT ["arnavon"]
