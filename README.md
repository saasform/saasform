# Saasform

[![License](https://img.shields.io/github/license/saasform/saasform.svg)](https://github.com/saasform/saasform/blob/master/LICENSE)
[![Discord Chat](https://img.shields.io/badge/chat-Discord-green.svg)](https://discord.gg/cbWW8akyW9)

Saasform is a state-of-the-art website for your SaaS, with authentication, payments and common growth & marketing tools.

![Saasform preview](https://raw.githubusercontent.com/saasform/saasform/main/docs/images/saasform-hero.png)

Building a SaaS requires building a website, authentication, payments… and maintaining and updating them… all distractions from your core features. Saasform pre-packages all the things you and your team need to launch faster and grow more effectively.

Saasform is built with security and usability in mind. It's a standalone service including its own datastore, i.e. it's not a boilerplate, so you can build your SaaS with the tech stack you'd like, even serverless. All you need to do is to integrate Saasform authentication in your backend or functions. This architecture is great to launch quickly, keep you focused on your core features, and maintain a good separation as your infrastructure and team scale.

## Get Started

Launch Saasform:

```bash
git clone https://github.com/saasform/saasform
cd saasform
docker-compose up
```

Open your browser at [http://localhost:7000](http://localhost:7000).

## Next Steps

1. [Customize the website](https://docs.saasform.dev/start/customize-website) (Set name, pricing, content, analytics)
1. Try out the user flows (Sign up, verify email, add payment)
1. [Integrate user authentication](https://docs.saasform.dev/start/integrate-user-authentication) (Technical)
1. Develop Saasform (Technical)
1. Get ready for production (Technical)
1. Migrate to Saasform Cloud

## Features

- Webpages
  - [x] Homepage
  - [x] Login / Signup / Password reset
  - [x] 404 / 500
  - [x] User profile / billing & payments
  - [ ] Team management
- User authentication
  - [x] Email + password
  - [x] Google oauth / SSO
  - [ ] Session management
  - [ ] Enterprise SSO / SAML / Okta integration
- Subscription payments
  - [x] Stripe integration
  - [ ] Invoicing
- Growth tools
  - [x] Google Analytics (new GAv4!)
  - [x] Facebook Pixel
  - [x] Google Tag Manager
  - [ ] Chat Bots (Intercom, Chatwoot, Papercups)

## Screenshots

Coming soon!

## Architecture

![Saasform architecture](https://raw.githubusercontent.com/saasform/saasform/main/docs/images/saasform-architecture.png)

## Contribute

We love any type of contribution, bug fixes, new integrations and better docs. See CONTRIBUTING.md to get started.

## Office Hours

Dave: Wed, 9:30-11:30 AM CET, https://www.twitch.tv/davidevernizzi

Ema: Wed, 8-10 AM PT, TBD

## Saasform Cloud

Saasform Cloud is our hosted solution and we're onboarding beta customers. Join our [Discord channel](https://discord.gg/cbWW8akyW9) or drop us a line at [hello@saasform.dev](mailto:hello@saasform.dev).

[![Code quality via LGTM](https://img.shields.io/lgtm/grade/javascript/g/saasform/saasform.svg)](https://lgtm.com/projects/g/saasform/saasform/context:javascript)
