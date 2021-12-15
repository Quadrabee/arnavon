FROM node:16-alpine as builder

WORKDIR /arnavon

COPY package.json .

RUN npm install

COPY . .

RUN npm run build && npm install -g .

ENTRYPOINT ["arnavon"]
