var OIDCStrategy = require('../lib/strategy')
  , chai = require('chai')
  , uri = require('url')
  , jwt = require('jsonwebtoken');

describe('session store', function() {
  
  function buildIdToken() {
    return jwt.sign({some: 'claim'}, 'this is a secret', {
      issuer: 'https://www.example.com/',
      subject: '1234',
      audience: 'ABC123',
      expiresIn: '1h'
    });
  };
  
  describe('using default session state store', function() {
    
    describe('issuing authorization request', function() {
      var strategy = new OIDCStrategy({
        issuer: 'https://www.example.com/',
        authorizationURL: 'https://www.example.com/oauth2/authorize',
        tokenURL: 'https://www.example.com/oauth2/token',
        clientID: 'ABC123',
        clientSecret: 'secret',
        callbackURL: 'https://www.example.net/auth/example/callback',
        state: true
      },
      function(iss, sub, profile, accessToken, refreshToken, done) {});
      
      
      describe('that redirects to service provider', function() {
        var request, url;
  
        before(function(done) {
          chai.passport.use(strategy)
            .redirect(function(u) {
              url = u;
              done();
            })
            .req(function(req) {
              request = req;
              req.session = {};
            })
            .authenticate();
        });
  
        it('should be redirected', function() {
          var u = uri.parse(url, true);
          expect(u.query.state).to.have.length(24);
        });
      
        it('should save state in session', function() {
          var u = uri.parse(url, true);
        
          expect(request.session['openidconnect:www.example.com'].state.handle).to.have.length(24);
          expect(request.session['openidconnect:www.example.com'].state.handle).to.equal(u.query.state);

          expect(request.session['openidconnect:www.example.com'].state.authorizationURL).to.equal('https://www.example.com/oauth2/authorize');
          expect(request.session['openidconnect:www.example.com'].state.tokenURL).to.equal('https://www.example.com/oauth2/token');
          expect(request.session['openidconnect:www.example.com'].state.clientID).to.equal('ABC123');
          expect(request.session['openidconnect:www.example.com'].state.clientSecret).to.equal('secret');
          expect(request.session['openidconnect:www.example.com'].state.callbackURL).to.equal('https://www.example.net/auth/example/callback')
          expect(request.session['openidconnect:www.example.com'].state.params.response_type).to.equal('code');
        });
      }); // that redirects to service provider
      
      describe('that redirects to service provider with other data in session', function() {
        var request, url;
  
        before(function(done) {
          chai.passport.use(strategy)
            .redirect(function(u) {
              url = u;
              done();
            })
            .req(function(req) {
              request = req;
              req.session = {};
              req.session['openidconnect:www.example.com'] = {};
              req.session['openidconnect:www.example.com'].foo = 'bar';
            })
            .authenticate();
        });
  
        it('should be redirected', function() {
          var u = uri.parse(url, true);
          expect(u.query.state).to.have.length(24);
        });
      
        it('should save state in session', function() {
          var u = uri.parse(url, true);
        
          expect(request.session['openidconnect:www.example.com'].state.handle).to.have.length(24);
          expect(request.session['openidconnect:www.example.com'].state.handle).to.equal(u.query.state);
          
          expect(request.session['openidconnect:www.example.com'].state.authorizationURL).to.equal('https://www.example.com/oauth2/authorize');
          expect(request.session['openidconnect:www.example.com'].state.tokenURL).to.equal('https://www.example.com/oauth2/token');
          expect(request.session['openidconnect:www.example.com'].state.clientID).to.equal('ABC123');
          expect(request.session['openidconnect:www.example.com'].state.clientSecret).to.equal('secret');
          expect(request.session['openidconnect:www.example.com'].state.callbackURL).to.equal('https://www.example.net/auth/example/callback')
          expect(request.session['openidconnect:www.example.com'].state.params.response_type).to.equal('code');
        });
        
        it('should preserve other data in session', function() {
          expect(request.session['openidconnect:www.example.com'].foo).to.equal('bar');
        });
      }); // that redirects to service provider with other data in session
      
      describe('that errors due to lack of session support in app', function() {
        var request, err;
  
        before(function(done) {
          chai.passport.use(strategy)
            .error(function(e) {
              err = e;
              done();
            })
            .req(function(req) {
              request = req;
            })
            .authenticate();
        });
  
        it('should error', function() {
          expect(err).to.be.an.instanceof(Error)
          expect(err.message).to.equal('OpenID Connect authentication requires session support when using state. Did you forget to use express-session middleware?');
        });
      }); // that errors due to lack of session support in app
      
    }); // issuing authorization request
    
    describe('processing response to authorization request', function() {
      var strategy = new OIDCStrategy({
        issuer: 'https://www.example.com/',
        authorizationURL: 'https://www.example.com/oauth2/authorize',
        userInfoURL: 'https://www.example.com/oauth2/userinfo',
        tokenURL: 'https://www.example.com/oauth2/token',
        clientID: 'ABC123',
        clientSecret: 'secret',
        callbackURL: 'https://www.example.net/auth/example/callback',
        state: true
      },
      function(iss, sub, profile, accessToken, refreshToken, done) {
        if (iss !== 'https://www.example.com/') { return done(new Error('incorrect iss argument')); }
        if (sub !== '1234') { return done(new Error('incorrect sub argument')); }
        if (typeof profile !== 'object') { return done(new Error('incorrect profile argument')); }
        if (Object.keys(profile).length === 0) { return done(new Error('incorrect profile argument')); }
        if (accessToken !== '2YotnFZFEjr1zCsicMWpAA') { return done(new Error('incorrect accessToken argument')); }
        if (refreshToken !== 'tGzv3JOkF0XG5Qx2TlKWIA') { return done(new Error('incorrect refreshToken argument')); }
        
        return done(null, { id: '1234' }, { message: 'Hello' });
      });

      strategy._getOAuth2Client = function(){
        return {
          _authorizeUrl: 'https://www.example.com/oauth2/authorize',
          _accessTokenUrl: 'https://www.example.com/oauth2/token',
          _clientId: 'ABC123',
          getOAuthAccessToken: function(code, options, callback) {
            if (code !== 'SplxlOBeZQQYbYS6WxSbIA') { return callback(new Error('incorrect code argument')); }
            if (options.grant_type !== 'authorization_code') { return callback(new Error('incorrect options.grant_type argument')); }
            if (options.redirect_uri !== 'https://www.example.net/auth/example/callback') { return callback(new Error('incorrect options.redirect_uri argument')); }

            return callback(null, '2YotnFZFEjr1zCsicMWpAA', 'tGzv3JOkF0XG5Qx2TlKWIA', {
              token_type: 'example',
              id_token: buildIdToken()
            });
          },
          _request: function(method, url, headers, post_body, access_token, callback) {
            if (method !== 'GET') { return callback(new Error('incorrect method argument')); }
            if (url !== 'https://www.example.com/oauth2/userinfo?schema=openid') { return callback(new Error('incorrect url argument')); }
            if (headers.Authorization !== 'Bearer 2YotnFZFEjr1zCsicMWpAA') { return callback(new Error('incorrect headers.Authorization argument')); }
            if (headers.Accept !== 'application/json') { return callback(new Error('incorrect headers.Accept argument')); }
            if (post_body !== null) { return callback(new Error('incorrect post_body argument')); }
            if (access_token !== null) { return callback(new Error('incorrect access_token argument')); }

            return callback(null, JSON.stringify({
              sub: '1234',
              name: 'john'
            }));
          }
        };
      };
      
      
      describe('that was approved', function() {
        var request
          , user
          , info;
  
        before(function(done) {
          chai.passport.use(strategy)
            .success(function(u, i) {
              user = u;
              info = i;
              done();
            })
            .req(function(req) {
              request = req;
            
              req.query = {};
              req.query.code = 'SplxlOBeZQQYbYS6WxSbIA';
              req.query.state = 'DkbychwKu8kBaJoLE5yeR5NK';
              req.session = {};
              req.session['openidconnect:www.example.com'] = {};
              req.session['openidconnect:www.example.com']['state'] = {
                issuer: 'https://www.example.com/',
                handle: 'DkbychwKu8kBaJoLE5yeR5NK',
                authorizationURL: 'https://www.example.com/oauth2/authorize',
                userInfoURL: 'https://www.example.com/oauth2/userinfo',
                tokenURL: 'https://www.example.com/oauth2/token',
                clientID: 'ABC123',
                clientSecret: 'secret',
                callbackURL: 'https://www.example.net/auth/example/callback',
                params: {
                  response_type: 'code',
                  client_id: 'ABC123',
                  redirect_uri: 'https://www.example.net/auth/example/callback',
                  scope: 'openid'
                }
              };
            })
            .authenticate();
        });
  
        it('should supply user', function() {
          expect(user).to.be.an.object;
          expect(user.id).to.equal('1234');
        });
  
        it('should supply info', function() {
          expect(info).to.be.an.object;
          expect(info.message).to.equal('Hello');
        });
      
        it('should remove state from session', function() {
          expect(request.session['openidconnect:www.example.com']).to.be.undefined;
        });
      }); // that was approved
      
      describe('that was approved with other data in the session', function() {
        var request
          , user
          , info;
  
        before(function(done) {
          chai.passport.use(strategy)
            .success(function(u, i) {
              user = u;
              info = i;
              done();
            })
            .req(function(req) {
              request = req;
            
              req.query = {};
              req.query.code = 'SplxlOBeZQQYbYS6WxSbIA';
              req.query.state = 'DkbychwKu8kBaJoLE5yeR5NK';
              req.session = {};
              req.session['openidconnect:www.example.com'] = {};
              req.session['openidconnect:www.example.com']['state'] = {
                issuer: 'https://www.example.com/',
                handle: 'DkbychwKu8kBaJoLE5yeR5NK',
                authorizationURL: 'https://www.example.com/oauth2/authorize',
                userInfoURL: 'https://www.example.com/oauth2/userinfo',
                tokenURL: 'https://www.example.com/oauth2/token',
                clientID: 'ABC123',
                clientSecret: 'secret',
                callbackURL: 'https://www.example.net/auth/example/callback',
                params: {
                  response_type: 'code',
                  client_id: 'ABC123',
                  redirect_uri: 'https://www.example.net/auth/example/callback',
                  scope: 'openid'
                }
              };
              req.session['openidconnect:www.example.com'].foo = 'bar';
            })
            .authenticate();
        });
  
        it('should supply user', function() {
          expect(user).to.be.an.object;
          expect(user.id).to.equal('1234');
        });
  
        it('should supply info', function() {
          expect(info).to.be.an.object;
          expect(info.message).to.equal('Hello');
        });
      
        it('should preserve other data from session', function() {
          expect(request.session['openidconnect:www.example.com'].state).to.be.undefined;
          expect(request.session['openidconnect:www.example.com'].foo).to.equal('bar');
        });
      }); // that was approved with other data in the session
      
      describe('that fails due to state being invalid', function() {
        var request
          , info, status;
  
        before(function(done) {
          chai.passport.use(strategy)
            .fail(function(i, s) {
              info = i;
              status = s;
              done();
            })
            .req(function(req) {
              request = req;
            
              req.query = {};
              req.query.code = 'SplxlOBeZQQYbYS6WxSbIA';
              req.query.state = 'DkbychwKu8kBaJoLE5yeR5NK-WRONG';
              req.session = {};
              req.session['openidconnect:www.example.com'] = {};
              req.session['openidconnect:www.example.com']['state'] = {
                issuer: 'https://www.example.com/',
                handle: 'DkbychwKu8kBaJoLE5yeR5NK',
                authorizationURL: 'https://www.example.com/oauth2/authorize',
                userInfoURL: 'https://www.example.com/oauth2/userinfo',
                tokenURL: 'https://www.example.com/oauth2/token',
                clientID: 'ABC123',
                clientSecret: 'secret',
                callbackURL: 'https://www.example.net/auth/example/callback',
                params: {
                  response_type: 'code',
                  client_id: 'ABC123',
                  redirect_uri: 'https://www.example.net/auth/example/callback',
                  scope: 'openid'
                }
              };
            })
            .authenticate();
        });
  
        it('should supply info', function() {
          expect(info).to.be.an.object;
          expect(info.message).to.equal('Invalid authorization request state.');
        });
      
        it('should supply status', function() {
          expect(status).to.equal(403);
        });
      
        it('should remove state from session', function() {
          expect(request.session['openidconnect:www.example.com']).to.be.undefined;
        });
      }); // that fails due to state being invalid
      
      describe('that fails due to provider-specific state not found in session', function() {
        var request
          , info, status;
  
        before(function(done) {
          chai.passport.use(strategy)
            .fail(function(i, s) {
              info = i;
              status = s;
              done();
            })
            .req(function(req) {
              request = req;
            
              req.query = {};
              req.query.code = 'SplxlOBeZQQYbYS6WxSbIA';
              req.query.state = 'DkbychwKu8kBaJoLE5yeR5NK';
              req.session = {};
            })
            .authenticate();
        });
  
        it('should supply info', function() {
          expect(info).to.be.an.object;
          expect(info.message).to.equal('Unable to verify authorization request state.');
        });
      
        it('should supply status', function() {
          expect(status).to.equal(403);
        });
      }); // that fails due to state not found in session
      
      describe('that fails due to provider-specific state lacking state value', function() {
        var request
          , info, status;
  
        before(function(done) {
          chai.passport.use(strategy)
            .fail(function(i, s) {
              info = i;
              status = s;
              done();
            })
            .req(function(req) {
              request = req;
            
              req.query = {};
              req.query.code = 'SplxlOBeZQQYbYS6WxSbIA';
              req.query.state = 'DkbychwKu8kBaJoLE5yeR5NK';
              req.session = {};
              req.session['openidconnect:www.example.com'] = {};
            })
            .authenticate();
        });
  
        it('should supply info', function() {
          expect(info).to.be.an.object;
          expect(info.message).to.equal('Unable to verify authorization request state.');
        });
      
        it('should supply status', function() {
          expect(status).to.equal(403);
        });
      }); // that fails due to provider-specific state lacking state value
      
      describe('that errors due to lack of session support in app', function() {
        var request
          , err;
  
        before(function(done) {
          chai.passport.use(strategy)
            .error(function(e) {
              err = e;
              done();
            })
            .req(function(req) {
              request = req;
            
              req.query = {};
              req.query.code = 'SplxlOBeZQQYbYS6WxSbIA';
              req.query.state = 'DkbychwKu8kBaJoLE5yeR5NK';
            })
            .authenticate();
        });
  
        it('should error', function() {
          expect(err).to.be.an.instanceof(Error)
          expect(err.message).to.equal('OpenID Connect authentication requires session support when using state. Did you forget to use express-session middleware?');
        });
      }); // that errors due to lack of session support in app
      
    }); // processing response to authorization request
    
  }); // using default session state store
  
  
  describe('using default session state store with session key option', function() {
    var strategy = new OIDCStrategy({
      issuer: 'https://www.example.com/',
      authorizationURL: 'https://www.example.com/oauth2/authorize',
      userInfoURL: 'https://www.example.com/oauth2/userinfo',
      tokenURL: 'https://www.example.com/oauth2/token',
      clientID: 'ABC123',
      clientSecret: 'secret',
      callbackURL: 'https://www.example.net/auth/example/callback',
      state: true,
      sessionKey: 'openidconnect:example'
    },
    function(iss, sub, profile, accessToken, refreshToken, done) {
      if (iss !== 'https://www.example.com/') { return done(new Error('incorrect iss argument')); }
      if (sub !== '1234') { return done(new Error('incorrect sub argument')); }
      if (typeof profile !== 'object') { return done(new Error('incorrect profile argument')); }
      if (Object.keys(profile).length === 0) { return done(new Error('incorrect profile argument')); }
      if (accessToken !== '2YotnFZFEjr1zCsicMWpAA') { return done(new Error('incorrect accessToken argument')); }
      if (refreshToken !== 'tGzv3JOkF0XG5Qx2TlKWIA') { return done(new Error('incorrect refreshToken argument')); }
      
      return done(null, { id: '1234' }, { message: 'Hello' });
    });

    strategy._getOAuth2Client = function(){
      return {
        _authorizeUrl: 'https://www.example.com/oauth2/authorize',
        _accessTokenUrl: 'https://www.example.com/oauth2/token',
        _clientId: 'ABC123',
        getOAuthAccessToken: function(code, options, callback) {
          if (code !== 'SplxlOBeZQQYbYS6WxSbIA') { return callback(new Error('incorrect code argument')); }
          if (options.grant_type !== 'authorization_code') { return callback(new Error('incorrect options.grant_type argument')); }
          if (options.redirect_uri !== 'https://www.example.net/auth/example/callback') { return callback(new Error('incorrect options.redirect_uri argument')); }

          return callback(null, '2YotnFZFEjr1zCsicMWpAA', 'tGzv3JOkF0XG5Qx2TlKWIA', {
            token_type: 'example',
            id_token: buildIdToken()
          });
        },
        _request: function(method, url, headers, post_body, access_token, callback) {
          if (method !== 'GET') { return callback(new Error('incorrect method argument')); }
          if (url !== 'https://www.example.com/oauth2/userinfo?schema=openid') { return callback(new Error('incorrect url argument')); }
          if (headers.Authorization !== 'Bearer 2YotnFZFEjr1zCsicMWpAA') { return callback(new Error('incorrect headers.Authorization argument')); }
          if (headers.Accept !== 'application/json') { return callback(new Error('incorrect headers.Accept argument')); }
          if (post_body !== null) { return callback(new Error('incorrect post_body argument')); }
          if (access_token !== null) { return callback(new Error('incorrect access_token argument')); }

          return callback(null, JSON.stringify({
            sub: '1234',
            name: 'john'
          }));
        }
      };
    };
    
    
    describe('issuing authorization request', function() {
      
      describe('that redirects to service provider', function() {
        var request, url;
  
        before(function(done) {
          chai.passport.use(strategy)
            .redirect(function(u) {
              url = u;
              done();
            })
            .req(function(req) {
              request = req;
              req.session = {};
            })
            .authenticate();
        });
  
        it('should be redirected', function() {
          var u = uri.parse(url, true);
          expect(u.query.state).to.have.length(24);
        });
      
        it('should save state in session', function() {
          var u = uri.parse(url, true);
        
          expect(request.session['openidconnect:example'].state.handle).to.have.length(24);
          expect(request.session['openidconnect:example'].state.handle).to.equal(u.query.state);

          expect(request.session['openidconnect:example'].state.authorizationURL).to.equal('https://www.example.com/oauth2/authorize');
          expect(request.session['openidconnect:example'].state.tokenURL).to.equal('https://www.example.com/oauth2/token');
          expect(request.session['openidconnect:example'].state.clientID).to.equal('ABC123');
          expect(request.session['openidconnect:example'].state.clientSecret).to.equal('secret');
          expect(request.session['openidconnect:example'].state.callbackURL).to.equal('https://www.example.net/auth/example/callback')
          expect(request.session['openidconnect:example'].state.params.response_type).to.equal('code');
        });
      }); // that redirects to service provider
      
    }); // issuing authorization request
    
    describe('processing response to authorization request', function() {
      
      describe('that was approved', function() {
        var request
          , user
          , info;
  
        before(function(done) {
          chai.passport.use(strategy)
            .success(function(u, i) {
              user = u;
              info = i;
              done();
            })
            .req(function(req) {
              request = req;
            
              req.query = {};
              req.query.code = 'SplxlOBeZQQYbYS6WxSbIA';
              req.query.state = 'DkbychwKu8kBaJoLE5yeR5NK';
              req.session = {};
              req.session['openidconnect:example'] = {};
              req.session['openidconnect:example']['state'] = {
                issuer: 'https://www.example.com/',
                handle: 'DkbychwKu8kBaJoLE5yeR5NK',
                authorizationURL: 'https://www.example.com/oauth2/authorize',
                userInfoURL: 'https://www.example.com/oauth2/userinfo',
                tokenURL: 'https://www.example.com/oauth2/token',
                clientID: 'ABC123',
                clientSecret: 'secret',
                callbackURL: 'https://www.example.net/auth/example/callback',
                params: {
                  response_type: 'code',
                  client_id: 'ABC123',
                  redirect_uri: 'https://www.example.net/auth/example/callback',
                  scope: 'openid'
                }
              };
            })
            .authenticate();
        });
  
        it('should supply user', function() {
          expect(user).to.be.an.object;
          expect(user.id).to.equal('1234');
        });
  
        it('should supply info', function() {
          expect(info).to.be.an.object;
          expect(info.message).to.equal('Hello');
        });
      
        it('should remove state from session', function() {
          expect(request.session['openidconnect:example']).to.be.undefined;
        });
      }); // that was approved
      
    }); // processing response to authorization request
    
  }); // using default session state store with session key option
  
});
