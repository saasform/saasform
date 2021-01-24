[![License](https://img.shields.io/github/license/saasform/saasform.svg)](https://github.com/saasform/saasform/blob/master/LICENSE)
[![Slack Chat](https://img.shields.io/badge/chat-Slack-green.svg)](https://join.slack.com/t/saasformers/shared_invite/zt-ktzmotjp-Bit5MMInRNyJ~lxfeupd7Q)

Saasform is a state-of-the-art website for your SaaS, with authentication, payments and common growth & marketing tools.

<image>

Building a SaaS requires building a website, authentication, payments… and maintaining and updating them… all distractions from your core features. Saasform pre-packages all the things you and your team need to launch faster and grow more effectively.

Saasform is built with security and usability in mind. It's a standalone service including its own datastore, i.e. it's not a boilerplate, so you can build your SaaS with the tech stack you'd like, even serverless. All you need to do is to integrate Saasform authentication in your backend or functions. This architecture is great to launch quickly, keep you focused on your core features, and maintain a good separation as your infrastructure and team scale.


## Get Started

Launch Saasform:

```
git clone https://github.com/saasform/saasform
cd saasform
docker-compose up
```

Open your browser at [http://localhost:8080](http://localhost:8080).


## Next Steps

1. Customize the Website from Admin (set logo, color, pricing, content, analytics)
1. Try out the User Flows (sign up, verify email, add payment)
1. Integrate User Authentication (Technical)
1. Develop Saasform (Technical)
1. Get Ready for Production (Technical)
1. Migrate to/from Saasform Cloud

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

TODO

## Architecture


## Contribute

We love any type of contribution, bug fixes, new integrations and better docs. See CONTRIBUTING.md to get started.

## Saasform Cloud

Saasform Cloud is our hosted solution and we're onboarding beta customers. Sign up for updates at [https://saasform.dev](saasform.dev).
