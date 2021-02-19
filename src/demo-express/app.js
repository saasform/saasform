var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');

const DEFAULT_SAASFORM_SERVER = 'http://localhost:7000'
const DEFAULT_SAASFORM_USER_LOGIN = 'http://localhost:7000/login'


/* BEGIN Saasform imports */
const fetch = require('node-fetch');
const passport = require('passport');
const JwtStrategy = require('passport-jwt').Strategy;
/* END Saasform imports */

var app = express();

/* BEGIN Saasform init code*/
// Setup cookie extractor
const cookieExtractor = function(req) {
  if (req && req.cookies) {
    return req.cookies['__session'];
  }
  return null;
};

// Get public key from Saasform
fetch(`${process.env.SAASFORM_SERVER || DEFAULT_SAASFORM_SERVER}/api/v1/public-key`)
  .then(response => response.json())
  .then(data => {
    const opts = {
      jwtFromRequest: cookieExtractor,
      secretOrKey: data.message || '',
      algorithms: ['ES256'],
      ignoreExpiration: false,
    };
    passport.use(new JwtStrategy(opts, (jwtPayload, done) => done(null, jwtPayload)));

    // Initialize passport to use Saasform
    app.use(passport.initialize());
    console.log('Saasform initialised');
  })
  .catch(err => {
    console.error('Error while retrieving public key');
    process.exit(1)
  });

// Create authentication strategy to protect routes
const auth = passport.authenticate('jwt', { session: false,
                                            failureRedirect: `${process.env.SAASFORM_USER_LOGIN || DEFAULT_SAASFORM_USER_LOGIN}` }
                                  );
/* END Saasform init code*/

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
