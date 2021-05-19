import { Injectable } from '@nestjs/common'
import validator from 'validator'

@Injectable()
export class ValidationService {
  isNilOrEmpty (element): Boolean {
    if (element === null) {
      return true
    }
    if (element === undefined) {
      return true
    }
    if (typeof element === 'string' && validator.isEmpty(element)) {
      return true
    }
    if (Array.isArray(element) && element.length === 0) {
      return true
    }

    return false
  }

  isError (element): Boolean {
    return element?.isError === true
  }
}
