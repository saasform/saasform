FROM node:12.19.0-stretch-slim AS builder
WORKDIR /app
COPY ./ .
RUN rm -rf node_modules
RUN npm i -g @nestjs/cli
RUN npm install -D babel-loader @babel/core @babel/preset-env webpack
RUN yarn install --prod
RUN rm src/accounts/test/testData.ts
RUN yarn build

# FROM node:12.19.0-stretch-slim AS builder-admin
# WORKDIR /app
# COPY ./admin/ .
# RUN rm -rf node_modules
# RUN yarn install
# RUN yarn build

FROM node:12.19.0-stretch-slim
COPY --chown=node:node --from=builder /app/node_modules /app/node_modules
# COPY --chown=node:node --from=builder /app/themes /app/themes
COPY --chown=node:node --from=builder /app/dist /app/dist
# COPY --chown=node:node --from=builder-admin /app/build /admin
WORKDIR /app
USER node
# RUN rm -f ./themes/admin ; ln -s /admin ./themes/admin
EXPOSE 3000
CMD ["node", "dist/main.js"]
