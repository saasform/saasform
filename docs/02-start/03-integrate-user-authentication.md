---
layout: default
parent: Getting Started
nav_order: 3
title: Integrate User Auth
permalink: /start/integrate-user-authentication
---

# Integrate User Authentication

| We're writing libraries to simplify integrating Saasform in the most popular frameworks and languages. [Let us know](mailto:hello@saasform.dev) what you're using! |

Saasform authentication is designed to be secure by default and easy to integrate.

When a user is authenticated, Saasform issues an access token. Technically, this is a JWT token signed with ES256 and includes some user's properties as payload, such as `email`, `email_verified` and `status`.

For each user request, in your backend, you should:
1. Read the access token, by default from the `__session` cookie
2. Validate the access token (use an existing library!)
   - If the access token is invalid, redirect the user to <your-saasform-domain>/login
   - If the access token is valid, continue
3. Check the `status` in the access token payload
   - If `status` is not `active`, redirect the user to <your-saasform-domain>/user
   - If `status` is `active`, continue

At step 2, to verify the access token you need a public key. Find the `JWT public key` in `/admin/developers`. It looks something like:
```
-----BEGIN PUBLIC KEY-----
MFYwEAYHKoZIzj0CAQYFK4EEAAoDQgAEMLaEpITqzO5XDxCGK04iIO4F52Z+eUUI
pX1EidrR/4hx7giOGgwZO4a9z+zlgVhpiTaxBrTpP7d9+rPWUMicoQ==
-----END PUBLIC KEY-----
```

## Code Sample (Javascript / Express)

Below is a code example based on Express which uses `passport` and `passport-jwt` to verify JWT tokens.

```js
const cookieParser = require('cookie-parser');
const passport = require('passport');
const JwtStrategy = require('passport-jwt').Strategy;

const cookieExtractor = function(req) {
  if (req && req.cookies) {
    return req.cookies['__session'];
  }
  return null;
};

const key = `-----BEGIN PUBLIC KEY-----
MFYwEAYHKoZIzj0CAQYFK4EEAAoDQgAEMLaEpITqzO5XDxCGK04iIO4F52Z+eUUI
pX1EidrR/4hx7giOGgwZO4a9z+zlgVhpiTaxBrTpP7d9+rPWUMicoQ==
-----END PUBLIC KEY-----`;

const opts = {
  jwtFromRequest: cookieExtractor,
  secretOrKey: key,
  algorithms: ['ES256'],
  ignoreExpiration: false,
};
passport.use(new JwtStrategy(opts, (jwtPayload, done) => done(null, jwtPayload)));

api.use(cookieParser());
api.use(passport.initialize());

const auth = passport.authenticate('jwt', { session: false });
```

The example above works for different architectures, for example:
- SaaS website served via Express
- Single-page application SaaS, e.g. built in React / Vue, with API served via Express
- Single-page application SaaS, with API powered by Firebase Functions + Express

If you run a SPA + API, you need to enable passing credentials and CORS:
1. In your SAP - example with Axios
   ```js
   axios.defaults.baseURL = 'https://api.beautifulsaas.com';
   axios.defaults.withCredentials = true;
   ```
2. In your API - example with Express
   ```js
   api.use(cors({
     origin: 'https://app.beautifulsaas.com',
     optionsSuccessStatus: 200,
     preflightContinue: true,
     credentials: true,
   }));
   ```

## Understanding Saasform Authentication

To understand how the integration works, we're going to explain how Saasform authentication works out of the box, in the default flow. To keep a long story short, we're omitting a lot of details that you can find in the section describing [Saasform authentication](/dev/auth).

In the default flow, Saasform returns the access token as a secure cookie before redirecting the user to your SaaS. This is designed to mimic an authentication system built as part of your SaaS. The default flow works when both Saasform and your SaaS share the same 2nd level domain (e.g., `beautifulsaas.com` = Saasform, `app.beautifulsaas.com` = SaaS; but also `beta.beautifulsaas.com` = Saasform, `[app.]beautifulsaas.com` = SaaS).

Sometimes a user has valid login credentials but shouldn't be allowed to access your SaaS, for example if the trial expired or there's an unpaid subscription. Saasform handles a number of these cases and likely more will come in the future.

To keep the integration simple and future proof, the access token includes a `status` that summarizes the status of the user's account and subscription, and we designed the /user profile page to handle all possible inactive states and guide the user through a resolution. If status is active, everything looks good and the user can access your SaaS. If the status is inactive, for example because the trial expired, the user should be redirected to /user where he's guided toward adding a credit card and starting a subscription.

To conclude, let's review the integration process in light of how Saasform authentication works:
Read the access token, by default from the `__session` cookie
Validate the access token (use an existing library!) 
If the access token is invalid, either it was forged or it's expired, so the user should log back in. Therefore redirect the user to /login
If the access token is valid, continue
Check the `status` in the access token payload
If `status` is not `active`, there's an issue with the user's account or subscription.
Therefore redirect the user to /user, that will help through the resolution.
If `status` is `active`, continue

Learn more about [Saasform authentication](/dev/auth).

