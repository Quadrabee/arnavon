FROM node:12.18-alpine as builder

WORKDIR /arnavon

COPY package.json .

RUN npm install

COPY . .

ENTRYPOINT ["./bin/run"]
