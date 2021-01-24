---
layout: default
has_children: true
has_toc: true
nav_order: 2
title: Getting Started
permalink: /start
---

# Getting Started

Clone the repository and launch Saasform via `docker-compose`:

```
git clone https://github.com/saasform/saasform
cd saasform
docker-compose up
```

Open your browser at [http://localhost:8080](http://localhost:8080){:target="_blank"}.

Our default is to launch 2 containers: webapp and db.

- Webapp is Saasform. By default we launch an image of the latest stable release.

- Db is a MySQL 8.0 default image. We launch a separate instance of MySQL to show you the full flexibility of Saasform and highlight the fact that you could use Saasform Cloud and won't even have to store user data in your infra. This said, if you already have a database, you can of course reuse it.
