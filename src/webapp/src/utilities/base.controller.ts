import { Controller } from '@nestjs/common'

import { join } from 'path'

@Controller()
export class BaseController {
  getPagesDir (req): string {
    const defaultDir = join(__dirname, '../../pages')
    return defaultDir
  }
}
