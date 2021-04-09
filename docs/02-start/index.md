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

Open your browser at [http://localhost:7000](http://localhost:7000){:target="_blank"}.

By default we launch 3 containers: `saasform`, `saasform-db` and `demo-express`.

- `saasform` is Saasform, latest release from [Docker Hub](https://hub.docker.com/repository/docker/saasform/saasform).

- `saasform-db` is a MariaDB 10.5 image (new: it works with Apple M1 as well). We launch a separate db instance to show you the full flexibility of Saasform and highlight the fact that you could use Saasform Cloud and won't even have to store user data in your infra. This said, if you already have a database, you can of course reuse it.

- `demo-express` is a placeholder for your SaaS, that shows how to integrate Saasform authentication. When users sign up or log in, they're redirected here.
