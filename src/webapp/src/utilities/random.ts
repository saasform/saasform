import { URLSafeBase64 } from 'urlsafe-base64'
const crypto = require('crypto') // eslint-disable-line

const password = (size = 8): string => URLSafeBase64.encode(crypto.randomBytes(size))

export { password }
