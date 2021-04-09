---
layout: default
parent: Getting Started
nav_order: 1
title: Customize the Website
permalink: /start/customize-website
---

# Customize the Website

Now that Saasform is up and running, it's time to customize it. We'll cover:

1. Website configuration and content
2. Theme and pages
3. Saasform configuration and integrations

As a general rule, everything you need sits in the `data/` folder. And every time you make a change, you need to restart `docker-compose` to see it reflected.


## Website configuration and content

Edit the file:
```
data/config/website.yml
```

The variables should be self-explanatory and are grouped in sections:

- `main` are the essential ones
- `integrations` let you quickly add standard marketing tools like Google Analytics or Tag Manager. For Google Analytics we recommend v4 (G-xxx) but also support the older version (UA-xxx).
- `footer` legal name and link to your socials.
- `home` in order, everything you need to fill in your home page.

We realize it's a lot of editing, but we've got you covered. First, you can leave sections blanks and they won't display. Or, you can start with a more minimal theme. Read on.


## Theme and pages

Edit the file:
```
data/config/saasform.yml
```

This file contains several configurations for Saasform, covered in the next section.

Set:
```
SAASFORM_THEME: fresh-sso
```

Restart `docker-compose` and you'll see Saasform on a minimal theme, ideal if all you need is a Single Sign On functionality.


## Saasform configuration and integrations

The remaining of `saasform.yml` lets you configure the platform and integrations.

- `SAAS_REDIRECT_URL`: the URL of your SaaS, where users are redirected when they log in or sign up.
- `SAASFORM_BASE_URL`: the base URL of Saasform, used for example to send users verification emails.
- `SAASFORM_THEME`: the theme, as described in the previous section.
- `TYPEORM_HOST`, `TYPEORM_PORT`, etc.: the database configuration.
- `SENDGRID_API_KEY`, `SENDGRID_SEND_FROM`: Sendgrid configuration to send emails to users.
- `STRIPE_API_KEY`: Stripe configuration to accept payments.
(and more to come)

| Pro tip: you may have noticed some configurations have "weird" default like `SG.xxx` for Sendgrid or `G-xxx` for Google Analytics. By default, values ending on `xxx` are ignored. |
