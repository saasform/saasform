var OIDCStrategy = require('../lib/strategy')
  , chai = require('chai')
  , uri = require('url')
  , jwt = require('jsonwebtoken');

describe('custom store', function() {

  function buildIdToken() {
    return jwt.sign({some: 'claim'}, 'this is a secret', {
      issuer: 'https://www.example.com/',
      subject: '1234',
      audience: 'ABC123',
      expiresIn: '1h'
    });
  };

  describe('with custom state store that accepts meta argument', function() {
    function CustomStore() {
    }

    CustomStore.prototype.store = function(req, meta, cb) {
      if (req.url === '/error') { return cb(new Error('something went wrong storing state')); }
      if (req.url === '/exception') { throw new Error('something went horribly wrong storing state'); }
      
      if (req.url !== '/me') { return cb(new Error('incorrect req argument')); }
      if (meta.authorizationURL !== 'https://www.example.com/oauth2/authorize') { return cb(new Error('incorrect meta.authorizationURL argument')); }
      if (meta.tokenURL !== 'https://www.example.com/oauth2/token') { return cb(new Error('incorrect meta.tokenURL argument')); }
      if (meta.clientID !== 'ABC123') { return callback(new Error('incorrect meta.clientID argument')); }
      
      req.customStoreStoreCalled = req.customStoreStoreCalled ? req.customStoreStoreCalled++ : 1;
      return cb(null, 'foos7473');
    };
    
    CustomStore.prototype.verify = function(req, state, cb) {
      if (req.url === '/error') { return cb(new Error('something went wrong verifying state')); }
      if (req.url === '/exception') { throw new Error('something went horribly wrong verifying state'); }
      
      if (req.url !== '/auth/example/callback') { return cb(new Error('incorrect req argument')); }
      if (state !== 'foos7473') { return cb(new Error('incorrect state argument')); }

      var storedInfo = {
        issuer: 'https://www.example.com/',
        userInfoURL: 'https://www.example.com/oauth2/userinfo',
        tokenURL: 'https://www.example.com/oauth2/token',
        clientID: 'ABC123',
        clientSecret: 'secret',
        callbackURL: 'https://www.example.net/auth/example/callback',
        params: {
          state: 'foos7473'
        }
      }
      
      req.customStoreVerifyCalled = req.customStoreVerifyCalled ? req.customStoreVerifyCalled++ : 1;
      return cb(null, true, storedInfo);
    };
    
    describe('issuing authorization request', function() {
      var strategy = new OIDCStrategy({
        issuer: 'https://www.example.com/',
        authorizationURL: 'https://www.example.com/oauth2/authorize',
        tokenURL: 'https://www.example.com/oauth2/token',
        clientID: 'ABC123',
        clientSecret: 'secret',
        callbackURL: 'https://www.example.net/auth/example/callback',
        store: new CustomStore()
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
              req.url = '/me';
            })
            .authenticate();
        });
  
        it('should be redirected', function() {
          expect(url).to.equal('https://www.example.com/oauth2/authorize?response_type=code&client_id=ABC123&redirect_uri=https%3A%2F%2Fwww.example.net%2Fauth%2Fexample%2Fcallback&scope=openid&state=foos7473');
        });
      
        it('should serialize state using custom store', function() {
          expect(request.customStoreStoreCalled).to.equal(1);
        });
      }); // that redirects to service provider
      
      describe('that errors due to custom store supplying error', function() {
        var request, err;
  
        before(function(done) {
          chai.passport.use(strategy)
            .error(function(e) {
              err = e;
              done();
            })
            .req(function(req) {
              request = req;
              req.url = '/error';
            })
            .authenticate();
        });
  
        it('should error', function() {
          expect(err).to.be.an.instanceof(Error);
          expect(err.message).to.equal('something went wrong storing state');
        });
      }); // that errors due to custom store supplying error
      
      describe('that errors due to custom store throwing error', function() {
        var request, err;
  
        before(function(done) {
          chai.passport.use(strategy)
            .error(function(e) {
              err = e;
              done();
            })
            .req(function(req) {
              request = req;
              req.url = '/exception';
            })
            .authenticate();
        });
  
        it('should error', function() {
          expect(err).to.be.an.instanceof(Error);
          expect(err.message).to.equal('something went horribly wrong storing state');
        });
      }); // that errors due to custom store throwing error
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
        store: new CustomStore()
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
          
              req.url = '/auth/example/callback';
              req.query = {};
              req.query.code = 'SplxlOBeZQQYbYS6WxSbIA';
              req.query.state = 'foos7473';
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
    
        it('should verify state using custom store', function() {
          expect(request.customStoreVerifyCalled).to.equal(1);
        });
      }); // that was approved
      
      describe('that errors due to custom store supplying error', function() {
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
          
              req.url = '/error';
              req.query = {};
              req.query.code = 'SplxlOBeZQQYbYS6WxSbIA';
              req.query.state = 'foos7473';
            })
            .authenticate();
        });

        it('should error', function() {
          expect(err).to.be.an.instanceof(Error);
          expect(err.message).to.equal('something went wrong verifying state');
        });
      }); // that errors due to custom store supplying error
      
      describe('that errors due to custom store throwing error', function() {
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
          
              req.url = '/exception';
              req.query = {};
              req.query.code = 'SplxlOBeZQQYbYS6WxSbIA';
              req.query.state = 'foos7473';
            })
            .authenticate();
        });

        it('should error', function() {
          console.log(err);
          expect(err).to.be.an.instanceof(Error);
          expect(err.message).to.equal('something went horribly wrong verifying state');
        });
      }); // that errors due to custom store throwing error
      
    }); // processing response to authorization request
    
  }); // with custom state store that accepts meta argument
  
  
  describe('with custom state store that accepts meta argument and supplies state', function() {
    function CustomStore() {
    }
    
    CustomStore.prototype.verify = function(req, state, cb) {

      var storedInfo = {
        issuer: 'https://www.example.com/',
        userInfoURL: 'https://www.example.com/oauth2/userinfo',
        tokenURL: 'https://www.example.com/oauth2/token',
        clientID: 'ABC123',
        clientSecret: 'secret',
        callbackURL: 'https://www.example.net/auth/example/callback',
        params: {
          state: 'foos7473'
        },
        returnTo: 'http://www.example.com/'
      }

      req.customStoreVerifyCalled = req.customStoreVerifyCalled ? req.customStoreVerifyCalled++ : 1;
      return cb(null, true, storedInfo);
    };
    
    describe('processing response to authorization request', function() {
      
      describe('that was approved without info', function() {
        var strategy = new OIDCStrategy({
          issuer: 'https://www.example.com/',
          authorizationURL: 'https://www.example.com/oauth2/authorize',
          userInfoURL: 'https://www.example.com/oauth2/userinfo',
          tokenURL: 'https://www.example.com/oauth2/token',
          clientID: 'ABC123',
          clientSecret: 'secret',
          callbackURL: 'https://www.example.net/auth/example/callback',
          store: new CustomStore()
        },
        function(iss, sub, profile, accessToken, refreshToken, done) {
          if (iss !== 'https://www.example.com/') { return done(new Error('incorrect iss argument')); }
          if (sub !== '1234') { return done(new Error('incorrect sub argument')); }
          if (typeof profile !== 'object') { return done(new Error('incorrect profile argument')); }
          if (Object.keys(profile).length === 0) { return done(new Error('incorrect profile argument')); }
          if (accessToken !== '2YotnFZFEjr1zCsicMWpAA') { return done(new Error('incorrect accessToken argument')); }
          if (refreshToken !== 'tGzv3JOkF0XG5Qx2TlKWIA') { return done(new Error('incorrect refreshToken argument')); }
          
          return done(null, { id: '1234' });
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
        
              req.url = '/auth/example/callback';
              req.query = {};
              req.query.code = 'SplxlOBeZQQYbYS6WxSbIA';
              req.query.state = 'foos7473';
            })
            .authenticate();
        });

        it('should supply user', function() {
          expect(user).to.be.an.object;
          expect(user.id).to.equal('1234');
        });

        it('should supply info with state', function() {
          expect(info).to.be.an.object;
          expect(Object.keys(info)).to.have.length(1);
          expect(info.state).to.be.an.object;
          expect(info.state.returnTo).to.equal('http://www.example.com/');
        });
  
        it('should verify state using custom store', function() {
          expect(request.customStoreVerifyCalled).to.equal(1);
        });
      }); // that was approved without info
      
      describe('that was approved with info', function() {
        var strategy = new OIDCStrategy({
          issuer: 'https://www.example.com/',
          authorizationURL: 'https://www.example.com/oauth2/authorize',
          userInfoURL: 'https://www.example.com/oauth2/userinfo',
          tokenURL: 'https://www.example.com/oauth2/token',
          clientID: 'ABC123',
          clientSecret: 'secret',
          callbackURL: 'https://www.example.net/auth/example/callback',
          store: new CustomStore()
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
        
              req.url = '/auth/example/callback';
              req.query = {};
              req.query.code = 'SplxlOBeZQQYbYS6WxSbIA';
              req.query.state = 'foos7473';
            })
            .authenticate();
        });

        it('should supply user', function() {
          expect(user).to.be.an.object;
          expect(user.id).to.equal('1234');
        });

        it('should supply info with state', function() {
          expect(info).to.be.an.object;
          expect(Object.keys(info)).to.have.length(2);
          expect(info.message).to.equal('Hello');
          expect(info.state).to.be.an.object;
          expect(info.state.returnTo).to.equal('http://www.example.com/');
        });
  
        it('should verify state using custom store', function() {
          expect(request.customStoreVerifyCalled).to.equal(1);
        });
      }); // that was approved with info
      
    }); // processing response to authorization request
    
  }); // with custom state store that accepts meta argument and supplies state
  
});
