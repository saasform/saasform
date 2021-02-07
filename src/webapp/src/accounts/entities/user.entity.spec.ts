// import { Test, TestingModule } from '@nestjs/testing'

import { UserEntity } from './user.entity'

describe('User entity', () => {
  it('should set the confirmation code when created', () => {
    const user = new UserEntity()

    expect(user.emailConfirmationToken).not.toBe('')
    expect(user.data.emailConfirmationToken).not.toBeNull()
    expect(user.emailConfirmationToken).not.toBeNull()
    expect(user.emailConfirmationToken).toBe(user.data.emailConfirmationToken)
  })
})
