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

  public getProviderData (provider): any {
    return this[provider] ?? {}
  }

  public setProviderData (provider, sub, profile): void {
    const data = {
      sub,
      profile
    }
    this.json = this.json ?? {}
    this[provider] = this.json[provider] = data
  }

  public setProviderTokens (provider, tokens): void {
    this.json = this.json ?? {}
    this.json[provider] = this.json[provider] ?? {}
    this[provider] = this[provider] ?? {}
    const providerTokens = this[provider].tokens ?? {}
    const inputTokens = tokens ?? {}

    // The refresh token is usually only is sent at the first login
    // If refresh_token is provided save it, otherwise it does not overwrite
    this[provider].tokens = this.json[provider].tokens = {
      access_token: inputTokens.access_token ?? providerTokens.access_token,
      refresh_token: inputTokens.refresh_token ?? providerTokens.refresh_token
    }
  }

  constructor (credential: string, userId: number = 0, json: CredentialsJSON = {}) {
    this.credential = credential
    this.userId = userId
    this.json = json
  }
}
