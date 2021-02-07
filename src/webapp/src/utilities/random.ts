import { encode } from 'urlsafe-base64'
const crypto = require('crypto') // eslint-disable-line

const password = (size = 8): string => encode(crypto.randomBytes(size))

export { password }
