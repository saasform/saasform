exports = module.exports = function(options) {

  return function manual(identifier, req, cb) {
    var missing = ['issuer', 'authorizationURL', 'tokenURL', 'clientID', 'clientSecret'].filter( function(opt) { return !options[opt] } );
    if (missing.length) return cb(new Error('Manual OpenID configuration is missing required parameter(s) - ' + missing.join(', ')));

    var params = {
      issuer: options.issuer,
      authorizationURL: options.authorizationURL,
      tokenURL: options.tokenURL,
      userInfoURL: options.userInfoURL,
      clientID: options.clientID,
      clientSecret: options.clientSecret,
      callbackURL: options.callbackURL
    }

    Object.keys(options).map(opt => {
      if (['nonce', 'display', 'prompt', 'max_age', 'ui_locals', 'id_token_hint', 'login_hint', 'acr_values'].indexOf(opt) !== -1) {
        params[opt] = options[opt];
      }
    });

    if (options.getOptionsFromReq) {
      const getOptionsFromReq = options.getOptionsFromReq.bind(this);
      getOptionsFromReq(req).then(function(optionsFromReq) {
        Object.keys(optionsFromReq).map(opt => {
          if (['clientID', 'clientSecret', 'callbackURL'].indexOf(opt) !== -1) {
            params[opt] = optionsFromReq[opt];
          }
        });
        return cb(null, params);
      });
    } else {
      return cb(null, params);
    }
  };
};
