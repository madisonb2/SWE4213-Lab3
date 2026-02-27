FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN apk add --no-cache curl

EXPOSE 5002

CMD ["npm", "start"]
