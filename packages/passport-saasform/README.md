# passport-saasform

[Passport](https://passportjs.org) strategy for authenticating via [Saasform](https://saasform.dev).

Tested on Node.js and serverless applications, Firebase Functions, AWS Lambda.

With Saasform you can separate user authentication and management from your core application. All user flows like registration, login, password reset, inviting other users to an account, etc. are handled by Saasform. When a user is signed in, Saasform issues a JWT token and redirects the user to your application. This Passport strategy helps you validate Saasform's token with ease.

## Install
```
npm install @saasform/passport-saasform
```
or
```
yarn add @saasform/passport-saasform
```

## Usage

Here's a minimal working example:

```js
const express = require('express')
const app = express()

const passport = require('passport');
const SaasformStrategy = require('@saasform/passport-saasform');

passport.use(new SaasformStrategy({
  // saasformUrl: 'https://beautifulsaas.com',
  // appBaseUrl: 'https://app.beautifulsaas.com',
}));

const auth = passport.authenticate('saasform', { session: false });

app.get('/', auth, (req, res) => {
  res.send(`Hello ${req.user.email}!`)
})

app.listen(3000, () => {
  console.log(`Minimal example app`)
})
```

## Contribute

We welcome any type of contribution: code, bugs, feature requests... Oh, and tests!
