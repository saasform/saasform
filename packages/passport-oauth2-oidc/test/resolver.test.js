var assert = require('assert');
var sinon = require('sinon');
var proxyquire = require('proxyquire');

// Mocks, stubs etc.
var webfinger = sinon.stub(require('webfinger'), 'webfinger');

var pathStub = { webfinger: { webfinger: webfinger } };

// Code under test.
var Resolver = proxyquire('../lib/resolver', pathStub);

var REL = 'http://openid.net/specs/connect/1.0/issuer';

describe('OpenID Connect Dynamic Discovery - Resolver', function () {
  beforeEach(function () {
    // Reset all mocks.
    webfinger.reset();
  });

  it('resolves identifier to issuer on correct webfinger', function (done) {
    var resolver = new Resolver();

    resolver.resolve('joe@example.com', function (err, issuer) {
      assert.ifError(err);
      assert.equal(issuer, 'myissuer');
      assert(webfinger.calledOnce);
      assert(webfinger.calledWith(
        'joe@example.com', REL
      ));
      done();
    });

    webfinger.yield(null, { links: [{ rel: REL, href: 'myissuer' }] });
  });

  it('yields the webfingers error if webfinger fails', function (done) {
    var resolver = new Resolver();
    var myError = new Error();

    resolver.resolve('joe@example.com', function (err, issuer) {
      assert.equal(err, myError);
      done();
    });

    webfinger.yield(myError);
  });

  it('yields NoOpenIDError with response info if webfinger lacks links', function (done) {
    var resolver = new Resolver();
    var webfingerResponse = { foo: 'bar' };

    resolver.resolve('joe@example.com', function (err, issuer) {
      assert.equal(err.name, 'NoOpenIDError');
      assert.deepEqual(err.response, webfingerResponse);
      done();
    });

    webfinger.yield(null, webfingerResponse);
  });

  it('yields NoOpenIDError with response info if webfinger lacks issuer', function (done) {
    var resolver = new Resolver();
    var webfingerResponse = { links: ['bar'] };

    resolver.resolve('joe@example.com', function (err, issuer) {
      assert.equal(err.name, 'NoOpenIDError');
      assert.deepEqual(err.response, webfingerResponse);
      done();
    });

    webfinger.yield(null, webfingerResponse);
  });

  it('yields NoOpenIDError with response info if issuer is malformed', function (done) {
    var resolver = new Resolver();
    var webfingerResponse = { links: [{ links: [{ rel: REL }] }] }; // missing href

    resolver.resolve('joe@example.com', function (err, issuer) {
      assert.equal(err.name, 'NoOpenIDError');
      assert.deepEqual(err.response, webfingerResponse);
      done();
    });

    webfinger.yield(null, webfingerResponse);
  });
});
