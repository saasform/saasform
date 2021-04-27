---
layout: default
parent: Contribute to Saasform
nav_order: 2
title: Run in prod mode
permalink: /contrib/prod
---

# Run in prod mode

To launch Saasform in prod mode, run:
```
cd src/webapp
node dist/main.js
```

The following describes how to create a production build:
1. Build Saasform
2. Package Saasform files

We recommend to launch Saasform in dev mode first at least once, so you can test basic prerequisites such as installing dependencies and setting up the database.


## Build Saasform

To build Saasform run:
```
cd src/webapp
yarn build
```

The build bundles all Saasform source files into the directory `dist/`, however this doesn't contain the dependencies that are in `node_modules`. If you want to create a minimal build, run:
```
cd src/webapp
rm -rf node_modules
yarn install --prod
yarn add nest
yarn build
```


## Package Saasform files

To create a minimal dist package, e.g. in `/tmp/app`, run:
```
cd src/webapp
mkdir /tmp/app
cp -r dist /tmp/app
cp -r node_modules /tmp/app
cp -r ../../data/config /tmp/app
cp -r ../../data/emails /tmp/app
cp -r ../../data/pages /tmp/app
cp -r ../../data/themes /tmp/app
```

You can now test Saasform:
```
cd /tmp/app
node dist/main.js
```
