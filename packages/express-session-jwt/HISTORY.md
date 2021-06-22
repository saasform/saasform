0.2.2 / 2021-06-22
==================

  * Improved documentation

0.2.1 / 2021-06-11
==================

  * Renamed to express-session-jwt

0.2.0 / 2021-06-07
==================

  * JWT tokens
  * key rotation
  * prevent session fixation - emit a new JWT token when payload changes, e.g. user logged in
  * prevent db dumps - save hash(sessId) vs sessId
  * prevent race condition that resaves destroyed session, e.g. a logged out session becomes alive again

0.1.0 = original express-session 1.17.2 / 2021-05-19
====================================================

  * Fix `res.end` patch to always commit headers
  * deps: cookie@0.4.1
  * deps: safe-buffer@5.2.1
