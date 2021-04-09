var express = require('express');
var router = express.Router();

const DEFAULT_SAASFORM_USER_LOGOUT = 'http://localhost:7000/logout'
const DEFAULT_SAASFORM_USER_PROFILE = 'http://localhost:7000/user'

/* GET home page. */
router.get('/',
function(req, res, next) {
  console.log('user', req.user) // SAASFORM information about the user are in req.user
  res.render('index', {
  	title: 'SaaS Placeholder',
  	user: req.user,
  	logout_url: DEFAULT_SAASFORM_USER_LOGOUT,
  	user_url: DEFAULT_SAASFORM_USER_PROFILE,
  });
});

module.exports = router;
