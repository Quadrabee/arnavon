FROM node:12-alpine

RUN apk add bash

# Create app directory
WORKDIR /home/app

# Install app dependencies
COPY package.json ./

RUN npm install
RUN npm install -g supervisor

# Bundle app source
COPY . .

EXPOSE 3000
CMD [ "npm", "start:api" ]
