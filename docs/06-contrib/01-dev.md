---
layout: default
parent: Contribute to Saasform
nav_order: 1
title: Run in dev mode
permalink: /contrib/dev
---

# Run in dev mode

To launch Saasform in dev mode, run:
```
cd src/webapp
yarn start:dev
```

Before submitting a PR, please run:
```
yarn lint
yarn test
yarn test:e2e
```

The first time you launch Saasform, you have to go through some prerequisites:
1. Install dependencies
2. Launch database
3. Apply database migrations
4. Build default theme

We recommend going through this list each time you upgrade Saasform to a new version.


## Install dependencies

```
cd src/webapp
yarn install
```


## Launch database

You need a MySQL or MariaDB database. Connection settings are in `config/saasform.yml`.

One option is to run MariaDB via our docker-compose config (from the project root):
```
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up saasform-db
```
Or, alternatively, you can run the db that you prefer.


## Apply database migrations

We use typeorm to handle migrations. Connection settings are in `ormconfig.json`.

```
cd src/webapp
yarn migrate
```


## Build default theme

```
cd src/themes/fresh
yarn install
yarn dev
```

If you're not editing the theme, you can stop yarn with `ctrl+c`.
