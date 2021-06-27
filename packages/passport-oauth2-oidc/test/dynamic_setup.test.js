/* eslint-env mocha */
var assert = require('assert');
var sinon = require('sinon');

// Mocks, stubs etc.
var requestGet = sinon.stub(require('request'), 'get');

// Code under test.
var setup = require('../lib/setup/dynamic');


describe('OpenID Connect Dynamic Discovery', function () {
  describe('Overall successful flow', function () {
    // Ordered test cases in a flow.
    var resolver = { resolve: sinon.stub() };
    var registrar = { resolve: sinon.stub() };
    var callback = sinon.spy();

    before(function () {
      requestGet.reset();
      setup({ resolver: resolver, registrar: registrar })('baz', callback);
    });

    it('should use resolver to get issuer from identifier', function () {
      assert(resolver.resolve.calledWith('baz'));
      resolver.resolve.yield(null, 'resolvedIssuer');
    });

    it('should get information from openid-configuration', function () {
      assert(requestGet.calledWith('resolvedIssuer/.well-known/openid-configuration'));
      requestGet.yield(
        null,
        { statusCode: 200 },
        JSON.stringify({
          issuer: 'myissuer',
          authorization_endpoint: 'foo',
          token_endpoint: 'bar',
          userinfo_endpoint: 'baz',
          registration_endpoint: 'qux'
        })
      );
    });

    it('should register the client', function () {
      // TODO: This call needs more data, like the registrationURL.
      assert(registrar.resolve.calledWith('myissuer'));
      registrar.resolve.yield(null, { id: 'foo', secret: 'bar' });
    });

    it('should have both server and client information in final callback', function () {
      assert.strictEqual(callback.args[0][0], null);
      assert.equal(callback.args[0][1].clientID, 'foo');
      assert.equal(callback.args[0][1].clientSecret, 'bar');
      assert.equal(callback.args[0][1].issuer, 'myissuer');
      assert.equal(callback.args[0][1].authorizationURL, 'foo');
      assert.equal(callback.args[0][1].tokenURL, 'bar');
      assert.equal(callback.args[0][1].userInfoURL, 'baz');
      assert.equal(callback.args[0][1].registrationURL, 'qux');
    });
  });
});
