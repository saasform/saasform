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
    this._saasformUrl = options.saasformUrl ?? 'http://localhost:7000'
    this._appBaseUrl = options.appBaseUrl ?? 'http://localhost:3000'

    fetch(`${this._saasformUrl}/api/v1/public-key`)
      .then(response => response.json())
      .then(data => {
        this.initJWTStrategy(data.message)
      })
      .catch(err => {
        console.error('Error while retrieving public key from Saasform');
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
}
Strategy.prototype.authenticate = JwtStrategy.prototype.authenticate

/**
 * Expose `Strategy`.
 */
module.exports = Strategy;
