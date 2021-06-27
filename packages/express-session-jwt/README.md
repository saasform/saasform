# express-session-jwt

Express session using JWT. Drop-in replacement of `express-session` with enhanced security ([blog post](https://hackernoon.com/secure-sessions-in-javascript-forking-express-session-to-improve-security-s62c35mk)). 

Compared to the original `express-session`, this fork:
1. Uses JWT as session tokens
2. Uses public-key cryptography (ES256) for better access to secrets
3. Prevents session fixation (e.g., when a user logs in a new token is emitted)
4. Guarantees that destroyed sessions can't be re-saved (e.g., a logged out session can't become alive again)
5. Reduces the impact of data theft from the store (stores `hash(sessId)` instead of `sessId`)
6. Improves upon deprecated default config options

It's a drop-in replacement of `express-session` in the sense than you can replace the npm package and existing sessions will be transparently upgraded to JWT without logging your users out. See the [Examples](#examples) below.


## Features

- [x] Pass all original express-session tests (only changes are the default config values)
- [x] Add `keys` option with public/private keys
- [x] Add `jwtFromReq` option to return content of JWT token
- [x] Issue a new JWT token when the result of `jwtFromReq` changes (e.g., set a user id)
- [x] Transparently upgrade existing original Express sessions (retrieve data from db with old id, generate JWT token, store data with new id)
- [x] Use `hash(sessId)` instead of `sessId` as primary key in the store
- [x] Prevent [race condition](https://github.com/saasform/saasform/blob/main/packages/express-session/test/session.js#L2467) that would re-save a destroyed session (fix in MemoryStore)
- [x] Support key rotation (sign with the latest private key, try to verify with older public keys as well)
- [ ] Add async keys provider (retrieve keys from req and/or token)
- [ ] Support verifier only mode (public keys only, no private key)
- [ ] Richer interface for stores


## Installation

This is a [Node.js](https://nodejs.org/en/) module available through the
[npm registry](https://www.npmjs.com/). Installation is done using the
[`npm install` command](https://docs.npmjs.com/getting-started/installing-npm-packages-locally):

```sh
$ npm install express-session-jwt
```

## API

```js
var session = require('express-session-jwt')
```

### session(options)

Create a session middleware with the given `options`.

**Note** Session data is _not_ saved in the cookie itself, just the session ID.
Session data is stored server-side.

**Note** Since version 1.5.0, the [`cookie-parser` middleware](https://www.npmjs.com/package/cookie-parser)
no longer needs to be used for this module to work. This module now directly reads
and writes cookies on `req`/`res`. Using `cookie-parser` may result in issues
if the `secret` is not the same between this module and `cookie-parser`.

**Warning** The default server-side session storage, `MemoryStore`, is _purposely_
not designed for a production environment. It will leak memory under most
conditions, does not scale past a single process, and is meant for debugging and
developing.

For a list of stores, see [compatible session stores](#compatible-session-stores).

#### Options

`express-session-jwt` accepts these properties in the options object.


##### keys

**Required option**

Set the private and public key(s) to sign/verify the JWT tokens.

Keys should either be an object with `public` and `private` properties, or an array of such objects.
When an array, the first element is the most recent key. For older keys only the public key is required, the private key can be omitted.

Examples:
```js
keys: { public: '...', private: '...' }
```
or
```js
keys: [{ public: 'latest', private: '...' }, { public: 'old1' }, { public: 'old2' }]
```

We currenlty use the ES256 algorithm. Keys can be generated with:
```bash
openssl ecparam -name secp256k1 -genkey -noout -out private-key.pem
openssl ec -in ec-secp256k1-priv-key.pem -pubout > public-key.pem
```

##### jwtFromReq

Function to call to generate the payload of a JWT token.
Provide a function that returns an object that will be used as payload.
The function is given `req` as the first argument if you want to use 
some value attached to `req` when generating the JWT token.

Example:
```js
function jwtFromReq(req) {
  return req.user ? {
    user_id: req.user.id,
    roles: ['user', 'editor']
  } : null
}
```

#### Options (same as the original `express-session`)

`express-session-jwt` also accepts these properties as the original `express-session`.

##### cookie

Settings object for the session ID cookie. The default value is
`{ path: '/', httpOnly: true, secure: false, maxAge: null }`.

The following are options that can be set in this object.

##### cookie.domain

Specifies the value for the `Domain` `Set-Cookie` attribute. By default, no domain
is set, and most clients will consider the cookie to apply to only the current
domain.

##### cookie.expires

Specifies the `Date` object to be the value for the `Expires` `Set-Cookie` attribute.
By default, no expiration is set, and most clients will consider this a
"non-persistent cookie" and will delete it on a condition like exiting a web browser
application.

**Note** If both `expires` and `maxAge` are set in the options, then the last one
defined in the object is what is used.

**Note** The `expires` option should not be set directly; instead only use the `maxAge`
option.

##### cookie.httpOnly

Specifies the `boolean` value for the `HttpOnly` `Set-Cookie` attribute. When truthy,
the `HttpOnly` attribute is set, otherwise it is not. By default, the `HttpOnly`
attribute is set.

**Note** be careful when setting this to `true`, as compliant clients will not allow
client-side JavaScript to see the cookie in `document.cookie`.

##### cookie.maxAge

Specifies the `number` (in milliseconds) to use when calculating the `Expires`
`Set-Cookie` attribute. This is done by taking the current server time and adding
`maxAge` milliseconds to the value to calculate an `Expires` datetime. By default,
no maximum age is set.

**Note** If both `expires` and `maxAge` are set in the options, then the last one
defined in the object is what is used.

##### cookie.path

Specifies the value for the `Path` `Set-Cookie`. By default, this is set to `'/'`, which
is the root path of the domain.

##### cookie.sameSite

Specifies the `boolean` or `string` to be the value for the `SameSite` `Set-Cookie` attribute.

  - `true` will set the `SameSite` attribute to `Strict` for strict same site enforcement.
  - `false` will not set the `SameSite` attribute.
  - `'lax'` will set the `SameSite` attribute to `Lax` for lax same site enforcement.
  - `'none'` will set the `SameSite` attribute to `None` for an explicit cross-site cookie.
  - `'strict'` will set the `SameSite` attribute to `Strict` for strict same site enforcement.

More information about the different enforcement levels can be found in
[the specification][rfc-6265bis-03-4.1.2.7].

**Note** This is an attribute that has not yet been fully standardized, and may change in
the future. This also means many clients may ignore this attribute until they understand it.

**Note** There is a [draft spec](https://tools.ietf.org/html/draft-west-cookie-incrementalism-01)
that requires that the `Secure` attribute be set to `true` when the `SameSite` attribute has been
set to `'none'`. Some web browsers or other clients may be adopting this specification.

##### cookie.secure

Specifies the `boolean` value for the `Secure` `Set-Cookie` attribute. When truthy,
the `Secure` attribute is set, otherwise it is not. By default, the `Secure`
attribute is not set.

**Note** be careful when setting this to `true`, as compliant clients will not send
the cookie back to the server in the future if the browser does not have an HTTPS
connection.

Please note that `secure: true` is a **recommended** option. However, it requires
an https-enabled website, i.e., HTTPS is necessary for secure cookies. If `secure`
is set, and you access your site over HTTP, the cookie will not be set. If you
have your node.js behind a proxy and are using `secure: true`, you need to set
"trust proxy" in express:

```js
var app = express()
app.set('trust proxy', 1) // trust first proxy
app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: true }
}))
```

For using secure cookies in production, but allowing for testing in development,
the following is an example of enabling this setup based on `NODE_ENV` in express:

```js
var app = express()
var sess = {
  secret: 'keyboard cat',
  cookie: {}
}

if (app.get('env') === 'production') {
  app.set('trust proxy', 1) // trust first proxy
  sess.cookie.secure = true // serve secure cookies
}

app.use(session(sess))
```

The `cookie.secure` option can also be set to the special value `'auto'` to have
this setting automatically match the determined security of the connection. Be
careful when using this setting if the site is available both as HTTP and HTTPS,
as once the cookie is set on HTTPS, it will no longer be visible over HTTP. This
is useful when the Express `"trust proxy"` setting is properly setup to simplify
development vs production configuration.

##### genid

Function to call to generate a new session ID. Provide a function that returns
a string that will be used as a session ID. The function is given `req` as the
first argument if you want to use some value attached to `req` when generating
the ID.

The default value is a function which uses the `uid-safe` library to generate IDs.

**NOTE** be careful to generate unique IDs so your sessions do not conflict.

```js
app.use(session({
  genid: function(req) {
    return genuuid() // use UUIDs for session IDs
  },
  secret: 'keyboard cat'
}))
```

##### name

The name of the session ID cookie to set in the response (and read from in the
request).

The default value is `'connect.sid'`.

**Note** if you have multiple apps running on the same hostname (this is just
the name, i.e. `localhost` or `127.0.0.1`; different schemes and ports do not
name a different hostname), then you need to separate the session cookies from
each other. The simplest method is to simply set different `name`s per app.

##### proxy

Trust the reverse proxy when setting secure cookies (via the "X-Forwarded-Proto"
header).

The default value is `undefined`.

  - `true` The "X-Forwarded-Proto" header will be used.
  - `false` All headers are ignored and the connection is considered secure only
    if there is a direct TLS/SSL connection.
  - `undefined` Uses the "trust proxy" setting from express

##### resave

Forces the session to be saved back to the session store, even if the session
was never modified during the request. Depending on your store this may be
necessary, but it can also create race conditions where a client makes two
parallel requests to your server and changes made to the session in one
request may get overwritten when the other request ends, even if it made no
changes (this behavior also depends on what store you're using).

The default value is `false`.

How do I know if this is necessary for my store? The best way to know is to
check with your store if it implements the `touch` method. If it does, then
you can safely set `resave: false`. If it does not implement the `touch`
method and your store sets an expiration date on stored sessions, then you
likely need `resave: true`.

##### rolling

Force the session identifier cookie to be set on every response. The expiration
is reset to the original [`maxAge`](#cookiemaxage), resetting the expiration
countdown.

The default value is `false`.

With this enabled, the session identifier cookie will expire in
[`maxAge`](#cookiemaxage) since the last response was sent instead of in
[`maxAge`](#cookiemaxage) since the session was last modified by the server.

This is typically used in conjuction with short, non-session-length
[`maxAge`](#cookiemaxage) values to provide a quick timeout of the session data
with reduced potential of it occurring during on going server interactions.

**Note** When this option is set to `true` but the `saveUninitialized` option is
set to `false`, the cookie will not be set on a response with an uninitialized
session. This option only modifies the behavior when an existing session was
loaded for the request.

##### saveUninitialized

Forces a session that is "uninitialized" to be saved to the store. A session is
uninitialized when it is new but not modified.

The default value is `false`.

**Note** if you are using Session in conjunction with PassportJS, Passport
will add an empty Passport object to the session for use after a user is
authenticated, which will be treated as a modification to the session, causing
it to be saved. *This has been fixed in PassportJS 0.3.0*

##### secret

This is the secret used to sign the session ID cookie **by the original Express session**.

This option is required to upgrade existing Express sessions into the new format.

This can be either a string
for a single secret, or an array of multiple secrets. If an array of secrets is
provided, only the first element will be used to sign the session ID cookie, while
all the elements will be considered when verifying the signature in requests. The
secret itself should be not easily parsed by a human and would best be a random set
of characters. A best practice may include:

  - The use of environment variables to store the secret, ensuring the secret itself
    does not exist in your repository.
  - Periodic updates of the secret, while ensuring the previous secret is in the
    array.

Using a secret that cannot be guessed will reduce the ability to hijack a session to
only guessing the session ID (as determined by the `genid` option).

Changing the secret value will invalidate all existing sessions. In order to rotate
the secret without invalidating sessions, provide an array of secrets, with the new
secret as first element of the array, and including previous secrets as the later
elements.

##### store

The session store instance, defaults to a new `MemoryStore` instance.

##### unset

Control the result of unsetting `req.session` (through `delete`, setting to `null`,
etc.).

The default value is `'keep'`.

  - `'destroy'` The session will be destroyed (deleted) when the response ends.
  - `'keep'` The session in the store will be kept, but modifications made during
    the request are ignored and not saved.

### req.session

To store or access session data, simply use the request property `req.session`,
which is (generally) serialized as JSON by the store, so nested objects
are typically fine. For example below is a user-specific view counter:

```js
// Use the session middleware
app.use(session({ secret: 'keyboard cat', cookie: { maxAge: 60000 }}))

// Access the session as req.session
app.get('/', function(req, res, next) {
  if (req.session.views) {
    req.session.views++
    res.setHeader('Content-Type', 'text/html')
    res.write('<p>views: ' + req.session.views + '</p>')
    res.write('<p>expires in: ' + (req.session.cookie.maxAge / 1000) + 's</p>')
    res.end()
  } else {
    req.session.views = 1
    res.end('welcome to the session demo. refresh!')
  }
})
```

#### Session.regenerate(callback)

To regenerate the session simply invoke the method. Once complete,
a new SID and `Session` instance will be initialized at `req.session`
and the `callback` will be invoked.

```js
req.session.regenerate(function(err) {
  // will have a new session here
})
```

#### Session.destroy(callback)

Destroys the session and will unset the `req.session` property.
Once complete, the `callback` will be invoked.

```js
req.session.destroy(function(err) {
  // cannot access session here
})
```

#### Session.reload(callback)

Reloads the session data from the store and re-populates the
`req.session` object. Once complete, the `callback` will be invoked.

```js
req.session.reload(function(err) {
  // session updated
})
```

#### Session.save(callback)

Save the session back to the store, replacing the contents on the store with the
contents in memory (though a store may do something else--consult the store's
documentation for exact behavior).

This method is automatically called at the end of the HTTP response if the
session data has been altered (though this behavior can be altered with various
options in the middleware constructor). Because of this, typically this method
does not need to be called.

There are some cases where it is useful to call this method, for example,
redirects, long-lived requests or in WebSockets.

```js
req.session.save(function(err) {
  // session saved
})
```

#### Session.touch()

Updates the `.maxAge` property. Typically this is
not necessary to call, as the session middleware does this for you.

### req.session.id

Each session has a unique ID associated with it. This property is an
alias of [`req.sessionID`](#reqsessionid-1) and cannot be modified.
It has been added to make the session ID accessible from the `session`
object.

### req.session.jwt

The content of the JWT token, parsed at the beginning of a request.
Add arbitrary data via the `jwtFromReq` option.

### req.session.cookie

Each session has a unique cookie object accompany it. This allows
you to alter the session cookie per visitor. For example we can
set `req.session.cookie.expires` to `false` to enable the cookie
to remain for only the duration of the user-agent.

#### Cookie.maxAge

Alternatively `req.session.cookie.maxAge` will return the time
remaining in milliseconds, which we may also re-assign a new value
to adjust the `.expires` property appropriately. The following
are essentially equivalent

```js
var hour = 3600000
req.session.cookie.expires = new Date(Date.now() + hour)
req.session.cookie.maxAge = hour
```

For example when `maxAge` is set to `60000` (one minute), and 30 seconds
has elapsed it will return `30000` until the current request has completed,
at which time `req.session.touch()` is called to reset
`req.session.cookie.maxAge` to its original value.

```js
req.session.cookie.maxAge // => 30000
```

#### Cookie.originalMaxAge

The `req.session.cookie.originalMaxAge` property returns the original
`maxAge` (time-to-live), in milliseconds, of the session cookie.

### req.sessionID

To get the ID of the loaded session, access the request property
`req.sessionID`. This is simply a read-only value set when a session
is loaded/created.

## Session Store Implementation

Every session store _must_ be an `EventEmitter` and implement specific
methods. The following methods are the list of **required**, **recommended**,
and **optional**.

  * Required methods are ones that this module will always call on the store.
  * Recommended methods are ones that this module will call on the store if
    available.
  * Optional methods are ones this module does not call at all, but helps
    present uniform stores to users.

For an example implementation view the [connect-redis](http://github.com/visionmedia/connect-redis) repo.

### store.all(callback)

**Optional**

This optional method is used to get all sessions in the store as an array. The
`callback` should be called as `callback(error, sessions)`.

### store.destroy(sid, callback)

**Required**

This required method is used to destroy/delete a session from the store given
a session ID (`sid`). The `callback` should be called as `callback(error)` once
the session is destroyed.

### store.clear(callback)

**Optional**

This optional method is used to delete all sessions from the store. The
`callback` should be called as `callback(error)` once the store is cleared.

### store.length(callback)

**Optional**

This optional method is used to get the count of all sessions in the store.
The `callback` should be called as `callback(error, len)`.

### store.get(sid, callback)

**Required**

This required method is used to get a session from the store given a session
ID (`sid`). The `callback` should be called as `callback(error, session)`.

The `session` argument should be a session if found, otherwise `null` or
`undefined` if the session was not found (and there was no error). A special
case is made when `error.code === 'ENOENT'` to act like `callback(null, null)`.

### store.set(sid, session, callback)

**Required**

This required method is used to upsert a session into the store given a
session ID (`sid`) and session (`session`) object. The callback should be
called as `callback(error)` once the session has been set in the store.

### store.touch(sid, session, callback)

**Recommended**

This recommended method is used to "touch" a given session given a
session ID (`sid`) and session (`session`) object. The `callback` should be
called as `callback(error)` once the session has been touched.

This is primarily used when the store will automatically delete idle sessions
and this method is used to signal to the store the given session is active,
potentially resetting the idle timer.

## Compatible Session Stores

For a complete list of compatible stores see the [original docs](https://github.com/expressjs/session#compatible-session-stores). Any store that works with `express-session` should work unmodified with our library.

We recommend the following stores because they enforce that destroyed sessions can't be re-saved (e.g., a logged out session can't become alive again). Please make a PR to list additional stores.

[![★][connect-typeorm-image] connect-typeorm][connect-typeorm-url] A [TypeORM](https://github.com/typeorm/typeorm)-based session store.

[connect-typeorm-url]: https://www.npmjs.com/package/connect-typeorm
[connect-typeorm-image]: https://badgen.net/github/stars/makepost/connect-typeorm?label=%E2%98%85

## Examples

### Simple, complete example

A simple example using `express-session-jwt` to store page views for a user.

```js
var express = require('express')
var parseurl = require('parseurl')
var session = require('express-session-jwt')

var app = express()

app.use(session({
  secret: 'keyboard cat',  // to upgrade existing Express sessions
  keys: {
    public: '-----BEGIN PUBLIC KEY-----\nMFYwEAYHKoZIzj0CAQYFK4EEAAoDQgAEDXMuNS4pyqkpZwij+UCcTPVStZHmG39D\nP1V7qaPCfc0ewXXbcEaJiarqjHOM5a6SVivCaUdJj+25tjMk4sPchQ==\n-----END PUBLIC KEY-----',
    private: '-----BEGIN PRIVATE KEY-----\nMIGEAgEAMBAGByqGSM49AgEGBSuBBAAKBG0wawIBAQQgvK1dk5M81nax8lQxpbWo\nsB1oK9YAqRP7MwWc7wDne8ehRANCAAQNcy41LinKqSlnCKP5QJxM9VK1keYbf0M/\nVXupo8J9zR7BddtwRomJquqMc4zlrpJWK8JpR0mP7bm2MyTiw9yF\n-----END PRIVATE KEY-----'
  },
}))

app.use(function (req, res, next) {
  if (!req.session.views) {
    req.session.views = {}
  }

  // get the url pathname
  var pathname = parseurl(req).pathname

  // count the views
  req.session.views[pathname] = (req.session.views[pathname] || 0) + 1

  next()
})

app.get('/foo', function (req, res, next) {
  res.send('you viewed this page ' + req.session.views['/foo'] + ' times')
})

app.get('/bar', function (req, res, next) {
  res.send('you viewed this page ' + req.session.views['/bar'] + ' times')
})

const port = 3000;
app.listen(port, () => {
  console.log(`Ready: http://localhost:${port}/`)
})
```

### Minimal examples (original vs re-implementation)

Minimal example for the original `express-session`:
```js
app.use(session({
  secret: 'keyboard cat',
}))
```

Minimal example for `express-session-jwt`:
```js
app.use(session({
  keys: {
    public: 'public',
    private: 'secret',
  }
}))
```

Minimal example for `express-session-jwt` that also validates and upgrade existing sessions:
```js
app.use(session({
  secret: 'keyboard cat',  // validate then upgrade original sessions
  keys: {
    public: 'public',
    private: 'secret',
  }
}))
```

(Coming soon) Really minimal example for `express-session-jwt`, verifier only:
```js
app.use(session({
  keys: {
    public: 'public',
  }
}))
```

### Recommended examples

Recommended example for the original `express-session`:
```js
const store = 
  new TypeormStore({
    cleanupLimit: 2,
    limitSubquery: false,
    ttl: 30*24*60*60
  }).connect(repository)

app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,
    maxAge: 30*24*60*60*1000 
  },
  store: store
}))
```

Recommended example for `express-session-jwt` (updated some deprecated defaults):
```js
const store = 
  new TypeormStore({
    cleanupLimit: 2,
    limitSubquery: false,
    ttl: 30*24*60*60
  }).connect(repository)

app.use(session({
  secret: 'keyboard cat',
  keys: {
    public: 'public',
    private: 'secret',
  },
  store: store
}))
```

Recommended example for `express-session-jwt`, storing data in the JWT token:
```js
const store = …

function jwtFromReq(req) {
  return req.user ?
    {
      user_id, req.user.id,
      account_id: ...,
      roles: ['user', 'editor'],
    } : null
}

app.use(session({
  secret: 'keyboard cat',
  keys: {
    public: 'public',
    private: 'secret',
  },
  store: store,
  jwtFromReq: jwtFromReq
}))
```

### Key rotation examples

Key rotation example for the original `express-session`:
```js
app.use(session({
  secret: [
    'latest',
    'old1',
    'old2',
  ]
}))
```

Key rotation example for `express-session-jwt` (only the latest private key is used, the others can be omitted):
```js
app.use(session({
  keys: [
    {
      public: 'latest',
      private: 'secret',
    },
    { public: 'old1' },
    { public: 'old2' }
  ]
}))
```

(Coming soon) Keys provider example for `express-session-jwt`:
```js
async function keysProvider(req, rawJwtToken, done) {
  return done(null, [
    {
      public: 'latest',
      private: 'secret',
    },
    { public: 'old1' },
    { public: 'old2' }
  ])
}

app.use(session({
  keysProvider: keysProvider,
}))
```

## Debugging

This module uses the [debug](https://www.npmjs.com/package/debug) module
internally to log information about session operations.

To see all the internal logs, set the `DEBUG` environment variable to
`express-session` when launching your app (`npm start`, in this example):

```sh
$ DEBUG=express-session npm start
```

On Windows, use the corresponding command;

```sh
> set DEBUG=express-session & npm start
```

## License

[MIT](LICENSE)

[![NPM Version][npm-version-image]][npm-url]

[rfc-6265bis-03-4.1.2.7]: https://tools.ietf.org/html/draft-ietf-httpbis-rfc6265bis-03#section-4.1.2.7
[npm-downloads-image]: https://badgen.net/npm/dm/express-session-jwt
[npm-url]: https://www.npmjs.com/package/express-session-jwt
[npm-version-image]: https://badgen.net/npm/v/express-session-jwt
