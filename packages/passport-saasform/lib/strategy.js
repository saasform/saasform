/**
 * Module dependencies.
 */
const cookie = require('cookie');
const fetch = require('node-fetch');
const BaseStrategy = require('passport-strategy').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;

const jwtFromRequest = function(req) {
  if (!req.cookies) {
    req.cookies = cookie.parse(req.headers.cookie ?? '')
  }
  if (req && req.cookies) {
    return req.cookies['__session'];
  }
  return null;
};

class Strategy extends BaseStrategy {
  constructor(options, verify) {
    super(options, verify)
    this._verify = verify ?? ((jwtPayload, done) => done(null, jwtPayload));
    this.init(options ?? {})
  }

  init(options) {
    this.name = 'saasform'
    this._saasformServerUrl = options.saasformServerUrl ?? 'http://localhost:7000'
    this._saasformUrl = options.saasformUrl ?? 'http://localhost:7000'
    this._appBaseUrl = options.appBaseUrl ?? 'http://localhost:3000'

    fetch(`${this._saasformServerUrl}/api/v1/public-key`)
      .then(response => response.json())
      .then(data => {
        this.initJWTStrategy(data.message)
      })
      .catch(err => {
        console.error('Error retrieving the public key from Saasform');
        process.exit(1)
      });
  }

  initJWTStrategy(publicKey) {
    const jwtOptions = {
      jwtFromRequest: jwtFromRequest,
      secretOrKey: publicKey,
      algorithms: ['ES256'],
      ignoreExpiration: false,
    }
    this._jwtStrategy = new JwtStrategy(jwtOptions, this._verify)
    for (const key of ['_secretOrKeyProvider', '_verify', '_jwtFromRequest', '_passReqToCallback', '_verifOpts']) {
      this[key] = this._jwtStrategy[key]
    }
  }

  authenticate(req, options) {
    var self = this;
    var token = self._jwtFromRequest(req);

    function fail(err) {
      return self.redirect(`${self._saasformUrl}/login?r=auto`)
    }

    if (!token) {
      // return fail(new Error("No auth token"));
      return fail(new Error("No auth token"));
    }

    this._secretOrKeyProvider(req, token, function(secretOrKeyError, secretOrKey) {
      if (secretOrKeyError) {
        fail(secretOrKeyError)
      } else {
        // Verify the JWT
        JwtStrategy.JwtVerifier(token, secretOrKey, self._verifOpts, function(jwt_err, payload) {
          if (jwt_err) {
            return fail(jwt_err);
          } else {
            // Pass the parsed token to the user
            var verified = function(err, user, info) {
              if(err) {
                return self.error(err);
              } else if (!user) {
                return fail(info);
              } else {
                return self.success(user, info);
              }
            };

            if (payload && payload.status !== 'active') {
              self.redirect(`${self._saasformUrl}/user?r=auto`)
            }

            try {
              if (self._passReqToCallback) {
                self._verify(req, payload, verified);
              } else {
                self._verify(payload, verified);
              }
            } catch(ex) {
              self.error(ex);
            }
          }
        });
      }
    });
  }
}

/**
 * Expose `Strategy`.
 */
module.exports = Strategy;
