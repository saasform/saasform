var express = require('express');
var router = express.Router();

const DEFAULT_SAASFORM_USER_LOGOUT = 'http://localhost:7000/logout'
const DEFAULT_SAASFORM_USER_PROFILE = 'http://localhost:7000/user'

const airtableShareCode = process.env.AIRTABLE_SHARE_CODE

/* GET home page. */
router.get('/',
function(req, res, next) {
  console.log('user', req.user) // SAASFORM information about the user are in req.user
  res.render('index', {
  	title: 'Airtable on Express on Saasform demo!',
  	user: req.user,
  	logout_url: DEFAULT_SAASFORM_USER_LOGOUT,
  	user_url: DEFAULT_SAASFORM_USER_PROFILE,
	airtableSrcUrl: `https://airtable.com/embed/${airtableShareCode}?backgroundColor=green&prefill_Notes=Sent${req.user.email}&prefill_Email=${req.user.email}`
  });
});

module.exports = router;
