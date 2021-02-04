FROM node:12.19.0-stretch-slim
WORKDIR /app
COPY ./ .
RUN rm -rf node_modules
RUN npm install

RUN apt-get update
RUN apt-get install -y wait-for-it

ENV SAASFORM http://beautifulsaas.vernizzis.it

EXPOSE 3000
CMD ["npm", "start"]
