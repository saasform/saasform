var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');

const passport = require('passport');
const SaasformStrategy = require('passport-saasform');

passport.use(new SaasformStrategy({
  // this is overridden by docker to connect to Saasform API
  saasformServerUrl: process.env.SAASFORM_SERVER ?? 'http://localhost:7000',
  // saasformUrl: 'https://beautifulsaas.com',
  // appBaseUrl: 'https://app.beautifulsaas.com',
}));


var app = express();
const auth = passport.authenticate('saasform', { session: false });

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/',
auth, // Protect the route using Saasform
indexRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
