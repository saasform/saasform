const express = require('express')
const app = express()

const passport = require('passport');
const SaasformStrategy = require('passport-saasform');

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
