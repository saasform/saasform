---
layout: default
parent: Developer Guide
nav_order: 2
title: Payments
permalink: /dev/payments
---

# Payments

## Subscriptions using Stripe Billing

Coming soon!

## Subscriptions using Kill Bill

[Kill Bill](https://killbill.io) is an open-source subscription billing platform. It handles your catalog of plans and prices, manages your customers' subscriptions, and generates invoices. Kill Bill integrate with virtually any payment gateway to process payments (such as Stripe, Braintree, and Adyen). It also provides a flexible plugin framework to let you customize the billing behavior to your needs.

To get started with Kill Bill, follow [this tutorial](https://docs.killbill.io/latest/stripe_plugin.html). This will guide you through the installation steps for Kill Bill (the core system), Kaui (the administrative UI), and connect Stripe for payments (Stripe will only process payments, it will not manage the subscriptions, which will be handled by Kill Bill). It's very easy to swap Stripe for another payment plugin down the line, if you decide to do so.

Once you are up and running, it is time to integrate Saasform. In the tutorial, step 9 was to run a small demo which showed the purchase experience from the perspective of a customer. We're now going to swap that demo for Saasform.

First, in `saasform.yml`, update the following properties to match the values of your Kill Bill installation:

```
KILLBILL_URL: http://127.0.0.1:8080
KILLBILL_API_KEY: bob
KILLBILL_API_SECRET: lazar
KILLBILL_USERNAME: admin
KILLBILL_PASSWORD: password
```

If you've been running the tutorial locally, these default values should work out of the box.

Make sure also to specify your Stripe credentials:

```
STRIPE_API_KEY: sk_xxx
STRIPE_PUBLISHABLE_KEY: pk_xxx
```

Finally, set the payment integration to `killbill`:

```
MODULE_PAYMENT: killbill
```
