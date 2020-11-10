FROM node:current-alpine

WORKDIR /opt/app
COPY . .
RUN npm ci

EXPOSE 80

ENTRYPOINT [ "node", "app.js" ]
