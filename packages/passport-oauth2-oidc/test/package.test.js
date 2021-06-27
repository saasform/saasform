var openid = require('..');


describe('package', function() {
    
  it('should export Strategy constructor as module', function() {
    expect(openid).to.be.a('function');
    expect(openid).to.equal(openid.Strategy);
  });
    
  it('should export Strategy constructor', function() {
    expect(openid.Strategy).to.be.a('function');
  });
  
});
