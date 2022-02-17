FROM node:16.14.0

WORKDIR /backend/app.js

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

CMD [ "node", "app.js" ]