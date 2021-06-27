var utils = require('../utils');

/**
 * Creates an instance of `MemoryStore`.
 *
 * This is the state store implementation for the OIDCStrategy used when
 * the `state` option is enabled.  It generates a random state and stores it in
 * memory and verifies it when the service provider redirects the user
 * back to the application.
 *
 * Options:
 *
 *
 * @constructor
 * @param {Object} options
 * @api public
 */
function MemoryStore(options) {
  this.statesMap = {};
}

/**
 * Store request state.
 *
 * This implementation simply generates a random string and stores the value in
 * the Memory, where it will be used for verification when the user is
 * redirected back to the application.
 *
 * @param {Object} req
 * @param {Function} callback
 * @api protected
 */
MemoryStore.prototype.store = function(req, meta, callback) {
  var handle = utils.uid(24);

  var state = { handle: handle };
  for (entry in meta) {
    state[entry] = meta[entry];
  }

  this.statesMap[handle] = state;

  callback(null, handle);
};

/**
 * Verify request state.
 *
 * This implementation simply compares the state parameter in the request to the
 * value generated earlier and stored in the Memory.
 *
 * @param {Object} req
 * @param {String} providedState
 * @param {Function} callback
 * @api protected
 */
MemoryStore.prototype.verify = function(req, providedState, callback) {
  var state = this.statesMap[providedState];
  if (!state) {
   return callback(null, false, { message: 'Unable to verify authorization request state.' });
  }

  delete this.statesMap[providedState];

  if (state.handle !== providedState) {
   return callback(null, false, { message: 'Invalid authorization request state.' });
  }

  return callback(null, true, state);
};

// Expose constructor.
module.exports = MemoryStore;
