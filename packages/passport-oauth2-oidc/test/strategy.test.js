var Strategy = require('../lib/strategy')
  , chai = require('chai')
  , uri = require('url')
  , qs = require('querystring');

describe('strategy', function() {

  describe('configured to work with a specific OpenID provider', function() {

    describe('issuing authorization request', function() {

      describe('that redirects to identity provider without redirect URI', function() {
        var strategy = new Strategy({
          issuer: 'https://www.example.com',
          authorizationURL: 'https://www.example.com/oauth2/authorize',
          tokenURL: 'https://www.example.com/oauth2/token',
          clientID: 'ABC123',
          clientSecret: 'secret'
        }, function() {});
      
      
        var request, url, state;
  
        before(function(done) {
          chai.passport.use(strategy)
            .redirect(function(u) {
              var pu = uri.parse(u, true);
              
              state = pu.query.state;
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
          expect(url).to.equal('https://www.example.com/oauth2/authorize?response_type=code&client_id=ABC123&scope=openid&state=' + encodeURIComponent(state));
        });
        
        it('should save state in session', function() {
          expect(request.session['openidconnect:www.example.com'].state.handle).to.have.length(24);
          expect(request.session['openidconnect:www.example.com'].state.handle).to.equal(state);

          expect(request.session['openidconnect:www.example.com'].state.authorizationURL).to.equal('https://www.example.com/oauth2/authorize');
          expect(request.session['openidconnect:www.example.com'].state.tokenURL).to.equal('https://www.example.com/oauth2/token');
          expect(request.session['openidconnect:www.example.com'].state.clientID).to.equal('ABC123');
          expect(request.session['openidconnect:www.example.com'].state.clientSecret).to.equal('secret');
          expect(request.session['openidconnect:www.example.com'].state.params.response_type).to.equal('code');
        });
      }); // that redirects to identity provider without redirect URI
      
      describe('that redirects to identity provider with redirect URI', function() {
        var strategy = new Strategy({
          issuer: 'https://www.example.com',
          authorizationURL: 'https://www.example.com/oauth2/authorize',
          tokenURL: 'https://www.example.com/oauth2/token',
          clientID: 'ABC123',
          clientSecret: 'secret',
          callbackURL: 'https://www.example.net/login/return',
        }, function() {});
      
      
        var request, url, state;
  
        before(function(done) {
          chai.passport.use(strategy)
            .redirect(function(u) {
              var pu = uri.parse(u, true);
              
              state = pu.query.state;
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
          expect(url).to.equal('https://www.example.com/oauth2/authorize?response_type=code&client_id=ABC123&redirect_uri=https%3A%2F%2Fwww.example.net%2Flogin%2Freturn&scope=openid&state=' + encodeURIComponent(state));
        });
        
        it('should save state in session', function() {
          expect(request.session['openidconnect:www.example.com'].state.handle).to.have.length(24);
          expect(request.session['openidconnect:www.example.com'].state.handle).to.equal(state);

          expect(request.session['openidconnect:www.example.com'].state.authorizationURL).to.equal('https://www.example.com/oauth2/authorize');
          expect(request.session['openidconnect:www.example.com'].state.tokenURL).to.equal('https://www.example.com/oauth2/token');
          expect(request.session['openidconnect:www.example.com'].state.clientID).to.equal('ABC123');
          expect(request.session['openidconnect:www.example.com'].state.clientSecret).to.equal('secret');
          expect(request.session['openidconnect:www.example.com'].state.params.response_type).to.equal('code');
        });
      }); // that redirects to identity provider with redirect URI
      
      describe('that redirects to identity provider with redirect URI and scope', function() {
        var strategy = new Strategy({
          issuer: 'https://www.example.com',
          authorizationURL: 'https://www.example.com/oauth2/authorize',
          tokenURL: 'https://www.example.com/oauth2/token',
          clientID: 'ABC123',
          clientSecret: 'secret',
          callbackURL: 'https://www.example.net/login/return',
          scope: 'email'
        }, function() {});
      
      
        var request, url, state;
  
        before(function(done) {
          chai.passport.use(strategy)
            .redirect(function(u) {
              var pu = uri.parse(u, true);
              
              state = pu.query.state;
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
          expect(url).to.equal('https://www.example.com/oauth2/authorize?response_type=code&client_id=ABC123&redirect_uri=https%3A%2F%2Fwww.example.net%2Flogin%2Freturn&scope=openid%20email&state=' + encodeURIComponent(state));
        });
        
        it('should save state in session', function() {
          expect(request.session['openidconnect:www.example.com'].state.handle).to.have.length(24);
          expect(request.session['openidconnect:www.example.com'].state.handle).to.equal(state);

          expect(request.session['openidconnect:www.example.com'].state.authorizationURL).to.equal('https://www.example.com/oauth2/authorize');
          expect(request.session['openidconnect:www.example.com'].state.tokenURL).to.equal('https://www.example.com/oauth2/token');
          expect(request.session['openidconnect:www.example.com'].state.clientID).to.equal('ABC123');
          expect(request.session['openidconnect:www.example.com'].state.clientSecret).to.equal('secret');
          expect(request.session['openidconnect:www.example.com'].state.params.response_type).to.equal('code');
        });
      }); // that redirects to identity provider with redirect URI and scope
      
      describe('that redirects to identity provider with scope option', function() {
        var strategy = new Strategy({
          issuer: 'https://www.example.com',
          authorizationURL: 'https://www.example.com/oauth2/authorize',
          tokenURL: 'https://www.example.com/oauth2/token',
          clientID: 'ABC123',
          clientSecret: 'secret',
          callbackURL: 'https://www.example.net/login/return'
        }, function() {});
      
      
        var request, url, state;
  
        before(function(done) {
          chai.passport.use(strategy)
            .redirect(function(u) {
              var pu = uri.parse(u, true);
              
              state = pu.query.state;
              url = u;
              done();
            })
            .req(function(req) {
              request = req;
              req.session = {};
            })
            .authenticate({ scope: 'email' });
        });
  
        it('should be redirected', function() {
          expect(url).to.equal('https://www.example.com/oauth2/authorize?response_type=code&client_id=ABC123&redirect_uri=https%3A%2F%2Fwww.example.net%2Flogin%2Freturn&scope=openid%20email&state=' + encodeURIComponent(state));
        });
        
        it('should save state in session', function() {
          expect(request.session['openidconnect:www.example.com'].state.handle).to.have.length(24);
          expect(request.session['openidconnect:www.example.com'].state.handle).to.equal(state);

          expect(request.session['openidconnect:www.example.com'].state.authorizationURL).to.equal('https://www.example.com/oauth2/authorize');
          expect(request.session['openidconnect:www.example.com'].state.tokenURL).to.equal('https://www.example.com/oauth2/token');
          expect(request.session['openidconnect:www.example.com'].state.clientID).to.equal('ABC123');
          expect(request.session['openidconnect:www.example.com'].state.clientSecret).to.equal('secret');
          expect(request.session['openidconnect:www.example.com'].state.params.response_type).to.equal('code');
        });
      }); // that redirects to identity provider with scope option
      
      describe('that redirects to identity provider with scope option as array', function() {
        var strategy = new Strategy({
          issuer: 'https://www.example.com',
          authorizationURL: 'https://www.example.com/oauth2/authorize',
          tokenURL: 'https://www.example.com/oauth2/token',
          clientID: 'ABC123',
          clientSecret: 'secret',
          callbackURL: 'https://www.example.net/login/return'
        }, function() {});
      
      
        var request, url, state;
  
        before(function(done) {
          chai.passport.use(strategy)
            .redirect(function(u) {
              var pu = uri.parse(u, true);
              
              state = pu.query.state;
              url = u;
              done();
            })
            .req(function(req) {
              request = req;
              req.session = {};
            })
            .authenticate({ scope: [ 'address', 'phone' ] });
        });
  
        it('should be redirected', function() {
          expect(url).to.equal('https://www.example.com/oauth2/authorize?response_type=code&client_id=ABC123&redirect_uri=https%3A%2F%2Fwww.example.net%2Flogin%2Freturn&scope=openid%20address%20phone&state=' + encodeURIComponent(state));
        });
        
        it('should save state in session', function() {
          expect(request.session['openidconnect:www.example.com'].state.handle).to.have.length(24);
          expect(request.session['openidconnect:www.example.com'].state.handle).to.equal(state);

          expect(request.session['openidconnect:www.example.com'].state.authorizationURL).to.equal('https://www.example.com/oauth2/authorize');
          expect(request.session['openidconnect:www.example.com'].state.tokenURL).to.equal('https://www.example.com/oauth2/token');
          expect(request.session['openidconnect:www.example.com'].state.clientID).to.equal('ABC123');
          expect(request.session['openidconnect:www.example.com'].state.clientSecret).to.equal('secret');
          expect(request.session['openidconnect:www.example.com'].state.params.response_type).to.equal('code');
        });
      }); // that redirects to identity provider with scope option as array
      
      describe('that redirects to identity provider with redirect URI option', function() {
        var strategy = new Strategy({
          issuer: 'https://www.example.com',
          authorizationURL: 'https://www.example.com/oauth2/authorize',
          tokenURL: 'https://www.example.com/oauth2/token',
          clientID: 'ABC123',
          clientSecret: 'secret',
          callbackURL: 'https://www.example.net/login/return'
        }, function() {});
      
      
        var request, url, state;
  
        before(function(done) {
          chai.passport.use(strategy)
            .redirect(function(u) {
              var pu = uri.parse(u, true);
              
              state = pu.query.state;
              url = u;
              done();
            })
            .req(function(req) {
              request = req;
              req.session = {};
            })
            .authenticate({ callbackURL: 'https://www.example.net/oidc/return' });
        });
  
        it('should be redirected', function() {
          expect(url).to.equal('https://www.example.com/oauth2/authorize?response_type=code&client_id=ABC123&redirect_uri=https%3A%2F%2Fwww.example.net%2Foidc%2Freturn&scope=openid&state=' + encodeURIComponent(state));
        });
        
        it('should save state in session', function() {
          expect(request.session['openidconnect:www.example.com'].state.handle).to.have.length(24);
          expect(request.session['openidconnect:www.example.com'].state.handle).to.equal(state);

          expect(request.session['openidconnect:www.example.com'].state.authorizationURL).to.equal('https://www.example.com/oauth2/authorize');
          expect(request.session['openidconnect:www.example.com'].state.tokenURL).to.equal('https://www.example.com/oauth2/token');
          expect(request.session['openidconnect:www.example.com'].state.clientID).to.equal('ABC123');
          expect(request.session['openidconnect:www.example.com'].state.clientSecret).to.equal('secret');
          expect(request.session['openidconnect:www.example.com'].state.params.response_type).to.equal('code');
        });
      }); // that redirects to identity provider with redirect URI option
      
      describe('that redirects to identity provider with relative redirect URI option', function() {
        var strategy = new Strategy({
          issuer: 'https://www.example.com',
          authorizationURL: 'https://www.example.com/oauth2/authorize',
          tokenURL: 'https://www.example.com/oauth2/token',
          clientID: 'ABC123',
          clientSecret: 'secret',
          callbackURL: 'https://www.example.net/login/return'
        }, function() {});
      
      
        var request, url, state;
  
        before(function(done) {
          chai.passport.use(strategy)
            .redirect(function(u) {
              var pu = uri.parse(u, true);
              
              state = pu.query.state;
              url = u;
              done();
            })
            .req(function(req) {
              request = req;
              req.url = '/login/openid';
              req.headers.host = 'www.example.net';
              req.connection = { encrypted: true };
              req.session = {};
            })
            .authenticate({ callbackURL: '/openid-connect/return' });
        });
  
        it('should be redirected', function() {
          expect(url).to.equal('https://www.example.com/oauth2/authorize?response_type=code&client_id=ABC123&redirect_uri=https%3A%2F%2Fwww.example.net%2Fopenid-connect%2Freturn&scope=openid&state=' + encodeURIComponent(state));
        });
        
        it('should save state in session', function() {
          expect(request.session['openidconnect:www.example.com'].state.handle).to.have.length(24);
          expect(request.session['openidconnect:www.example.com'].state.handle).to.equal(state);

          expect(request.session['openidconnect:www.example.com'].state.authorizationURL).to.equal('https://www.example.com/oauth2/authorize');
          expect(request.session['openidconnect:www.example.com'].state.tokenURL).to.equal('https://www.example.com/oauth2/token');
          expect(request.session['openidconnect:www.example.com'].state.clientID).to.equal('ABC123');
          expect(request.session['openidconnect:www.example.com'].state.clientSecret).to.equal('secret');
          expect(request.session['openidconnect:www.example.com'].state.params.response_type).to.equal('code');
        });
      }); // that redirects to identity provider with relative redirect URI option
  
    }); // issuing authorization request
    
  }); // configured to work with a known OpenID provider
  
}); // Strategy
