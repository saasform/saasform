# Buy a plan

Issues:

- [161](https://github.com/saasform/saasform/issues/161)
- [150](https://github.com/saasform/saasform/issues/150)
- [149](https://github.com/saasform/saasform/issues/148)

As a saas user
I want to set my billing data
So that I can purchase a saas subscription

Make sure:

- The user can see the current plan
- The user should see the next payment date as well as the amount to be payed
- The user can see the other plans and the plan details
- The user can add a payment method
- The user can see the list of his payment methods
- The list should show enough data of the payment method to recognize it, but not too many to break user privacy

## Design process

### Create payment method

This is a simple form.
So far we are sending a POST and we then refresh the page. This is easy and fast. Later we might user Javascript to gracefully refresh the page.

## Test

- Signup and see that the free trial is created
- Add credit card on the newly created account
- See the credit card in the list
- Show the other plans and see the feature details
