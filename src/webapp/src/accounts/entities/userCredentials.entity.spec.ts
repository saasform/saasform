import { CredentialType, UserCredentialsEntity } from './userCredentials.entity';

describe('User Credentials entity', () => {
  it('with email, should create the entity', () => {
    const user = new UserCredentialsEntity("ra@saasform.com")
    expect(user).toBeDefined();
    expect(user.email).toBe("ra@saasform.com");
  });

  it('with email, should create the entity setting default values', () => {
    const user = new UserCredentialsEntity("ra@saasform.com")
    expect(user).toBeDefined();
    expect(user.credential).toBe(CredentialType.DEFAULT);
    expect(user.json?.encryptedPassword).toBe("");
  });
})
