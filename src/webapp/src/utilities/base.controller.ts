import { Controller } from '@nestjs/common'

import { join } from 'path'

@Controller()
export class BaseController {
  constructor () {}

  getPagesDir(req) {
    const defaultDir = join(__dirname, '../../pages')
    return defaultDir
  }
}
