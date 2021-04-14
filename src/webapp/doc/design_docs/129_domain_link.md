# Link a domain to an account

Issues:

- [123](https://github.com/saasform/saasform/issues/123)

As a User
I want to add to my account people with an email with my domain
So that I can onboard my whole organization without inviting every one

Make sure:

- a domain can be linked to an account
- a domain cannot be linked to many accounts
- when a user with an emain with a linked domain signs up, he is added to the account that is linked
- when a user with an email with a domain that is not linked to any account signs up, a new account is created (and the user is set as owner)
- when a domain is linked to an account, the account is marked to require email verification
- when a user without a verified email logs in and his account is marked to require email verification he is not allowed to login
- when a user signs in with google, his email is marked as verified

## Design process

### Check if domain is linked

I have added the check if the domain is linked into the `userService`; therefore the check is done for every user, not only the ones that logs in with google.
Thre result is that also users that signs up with username and passwords are added to an account if they signs up with an email with a linked domain. However, there is no guarantee that the user has *actual* access to that email. Therefore, we must enforce the email verification because to prevent that a user might get access to an account without having the rights to.

This brings in some extra work:

- all the existing users of a given account will not be allowed to login after a domain is linked if they haven't verified their email: we must give them a way of request another verification
- the google account should be marked verified automatically. This is done in the `authService` when the Google signup (not signin) happens

### accounts_domains table

I have added a new table `accounts_domains` to keep track of the linked domains. The reason is that it must be searchable by the domain, and since we keep most of the data inside a json, we have basically two says of doing this:

- add a filed that we search for. We do this for the email confirmation token
- add a new table that capture this. We do this for the user credentials

A rule of thumb is that if it possible that we could have more than one relations per entity, then we should use an additional table. I'm not sure we will ever have more than one domain linked per account, but I felt it was safer to add a whole table (with its migration, and entity, and service).

### Domain link code

The domain link code is in the `accountService` becase we need to setup the account so that the email verification check will be enforced when a domain is linked. Otherwise we could have it directly in the `accounsDomainService`.

### Multi step login

I started to implement the multi step login (so that it asks the username before, checks the credential type and then acts accordingly). I have completed most of the BE, but not fully in FE. For the moment I leave it there as it's mainly a API stuff and if we don't use it, it's not harmful.

## Test

1. start with empty DB
2. signup using username/password => new user and new account created
3. link domain
4. add a user with that domain with google => new user created inside the account
5. add another user with another domain with google => new user and new account created
