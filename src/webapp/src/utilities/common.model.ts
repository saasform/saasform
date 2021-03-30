export enum ErrorTypes {
  DUPLICATE_EMAIL = 'duplicate_email',
  DUPLICATE_USERNAME = 'duplicate_username'
}

export class Err extends Error {
  isError: true
  type: string
  name: ErrorTypes

  constructor (name, message, type) {
    super()
    this.name = name
    this.message = message
    this.type = type
  }
}

export class UserError extends Err {
  constructor (name, message) {
    super(name, message, 'UserError')
  }
}
