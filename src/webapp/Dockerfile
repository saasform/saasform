ARG ARCH=
FROM ${ARCH}node:14.16.0-buster-slim AS builder

WORKDIR /app
COPY . .

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        git ca-certificates

RUN npm i -g @nestjs/cli@7.5.6 \
    && yarn add --dev \
        babel-loader@8.2.2 \
        @babel/core@7.13.10 \
        @babel/preset-env@7.13.10 \
        webpack@4.46.0 \
    && yarn install --prod \
    && yarn build


FROM ${ARCH}node:14.16.0-buster-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        wait-for-it=0.0~git20180723-1 \
    && apt-get clean \
    && rm -fr /var/lib/apt/lists/*

COPY --chown=node:node --from=builder /app/bin /app/bin
COPY --chown=node:node --from=builder /app/dist /app/dist
COPY --chown=node:node --from=builder /app/node_modules /app/node_modules

WORKDIR /app
USER node

EXPOSE 7000
CMD ["node", "dist/main.js"]
