# Buy a plan

Issues:

- [161](https://github.com/saasform/saasform/issues/161)

As a user
I want to change plan
In order to better support my needs

Make sure:

- The user can buy a new plan
- The user can change plan.
- the extra money is charged accordingly
- If the user has a free trial, changing plan move to the new plan, but is still free trial for the time left (??)

## Design process

### Create and update plan

Is is OK to only have one single function that creates or change the plan?

- thie was the FE whould not worry about the current state
- The BE should not worry too much about what the FE says

It is better to do this check on the FE?

- two set of API exposed
- the BE must do some checks anyway

### Proration

We will start with disabled proration because it seems faster from the UX point of view. We must check if the final sum is OK.

- https://stripe.com/docs/billing/subscriptions/prorations#disable-prorations

## Test

- Signup and see that the free trial is created
- Add credit card on the newly created account
- Change plan
