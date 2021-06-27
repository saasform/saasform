var Strategy = require('../lib/strategy')
  , chai = require('chai');

/*
describe('Strategy', function() {
  
  describe('discovering OpenID provider for an end user', function() {
  
    describe('issuing authorization request', function() {
  
      describe('that redirects to service provider without redirect URI', function() {
        var strategy = new Strategy({},
        function(accessToken, refreshToken, profile, done) {});
      
      
        var url;
  
        before(function(done) {
          chai.passport.use(strategy)
            .redirect(function(u) {
              url = u;
              done();
            })
            .error(function(e) {
              console.log(e.message);
              console.log(e.stack);
              done(e);
            })
            .req(function(req) {
            })
            .authenticate();
        });
  
        it('should be redirected', function() {
          expect(url).to.equal('https://www.example.com/oauth2/authorize?response_type=code&client_id=ABC123&scope=openid');
        });
      }); // that redirects to service provider without redirect URI
  
    }); // issuing authorization request
    
  }); // configured to work with a known OpenID provider
  
}); // Strategy
*/