var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/',
function(req, res, next) {
  console.log('user', req.user) // SAASFORM information about the user are in req.user
  res.render('index', { title: 'Beautifulsaas', user: req.user });
});

module.exports = router;
