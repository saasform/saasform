# passport-oauth2-oidc

This is a fork of [passport-openidconnect](https://github.com/jaredhanson/passport-openidconnect) (the original project seems unmaintained).

The goal is to have a unified passport strategy for OAuth2 and OpenID Connect (OIDC), as OIDC is an identity layer built on top of OAuth2.

## Install
```
npm install passport-oauth2-oidc
```
or
```
yarn add passport-oauth2-oidc
```

## Usage

Here's a minimal working example:

```js
const express = require('express');
const app = express();

const passport = require('passport');
const OIDCStrategy = require('passport-oauth2-oidc').Strategy;

passport.use(new OIDCStrategy({
  passReqToCallback: true,

  issuer: 'https://api.mpin.io',
  authorizationURL: 'https://api.mpin.io/authorize',
  tokenURL: 'https://api.mpin.io/oidc/token',
  userInfoURL: 'https://api.mpin.io/oidc/userinfo',

  scope: 'openid profile email email_verified',
  clientID: '...',
  clientSecret: '...',
  callbackURL: '/auth/miracl/callback',
}));

const auth = passport.authenticate('oauth2-oidc', function(req, iss, sub, profile, done) {
  return done(null, profile);
});

app.get('/', auth, (req, res) => {
  res.send(`Hello ${req.user.email}!`)
});

const port = 3000;
app.listen(port, () => {
  console.log(`Ready: http://localhost:${port}/`)
});
```


## Credits

  - [Jared Hanson](http://github.com/jaredhanson)

## License

[The MIT License](http://opensource.org/licenses/MIT)
