# Send email to notify that subscription is about to expire

Issues:

- [74](https://github.com/saasform/saasform/issues/74)

As a User
I want to receive an email few days before trial expires
So that I can buy a subscription

Make sure:

- expiring trial subscriptions get a reminder email
- regular (active) subscription get no email
- email is not sent twice per a subscription

## Design process

The idea is to send an email just before a subscription expires.

- trial subscriptions
- Per subscription or per account?
    Per subscription allows to have more than one email per account, if this makes any sense [probably not]

A possible implementation would:

- find all the expiring subscriptions
- for each one, send an email

How to efficiently find all the expiring subscriptions?

1. If only trials a first filter can be on the subscription type
2. In addition it's possible to add a field with the explicit value of the subscription expiration

How to avoid sending more than once an email?

1. Compute the exact time of sending (e.g. 24 hours before the expiration) and send the email only if the expiration time is after that moment, but not too much (e.g. 24 hours ago > expiration > 23 hours ago).
  This allows to not add any additional fields, but it may lead to duplicate emails or to missing emails
2. Add a field on subscription (or account) table (or json data) and check if already sent. This is more complex and feels like adding some data that does belong to the model (i.e. the notification)
3. Add a notification table that keeps tracks of the notification sent [probably the better, but take more time]

Probably 3. is better, but we can start with 1.
