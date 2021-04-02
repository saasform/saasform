// import { UserEntity } from '../users/user.entity';
import {
  Entity,
  Column,
  AfterLoad,
  // OneToMany,
  PrimaryGeneratedColumn
} from 'typeorm'

class CredentialsJSON {
  encryptedPassword?: string
  googleId?: string
};

export enum CredentialType {
  DEFAULT='email/password',
  GOOGLE='google'
}

@Entity('users_credentials')
export class UserCredentialsEntity {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ unique: true })
  credential: string

  @Column()
  // @OneToMany(() => UserEntity, user => user.id)
  userId: number

  @Column('json')
  json?: CredentialsJSON

  @AfterLoad()
  public setValuesFromJson (): any {
    const json = this.json ?? {}
    for (const key in json) {
      if (!(key in this)) {
        this[key] = json[key]
      }
    }
  }

  constructor (credential: string, userId: number = 0, json: CredentialsJSON = {}) {
    this.credential = credential
    this.userId = userId
    this.json = json
  }
}
