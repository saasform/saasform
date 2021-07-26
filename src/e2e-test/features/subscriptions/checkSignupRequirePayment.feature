Feature: checkSignupRequirePayment
  As the admin
  I want to force payment at signup
  So that I can collect cc info right away

  Scenario: Setup
    Given admin sets settings "signup_force_payment" to "true"

  # Smoke test
  Scenario: Signup and redirect to /payment
    Given I open the url "http://localhost:7000/signup"
    When I set the element "#email" value to "test+payment@example.com"
    And I set the element "#password" value to "password"
    And I click the button "[type='submit']"
    And I wait for .5 seconds
    Then I expect the page url is "http://localhost:7000/payment"
    And I expect the element "h1" contains text "Add a payment method"
    And I expect the element "[type='submit']" contains text "Pay $49/mo"

  Scenario: After adding a payment method user is redirected to the saas
    Given I open the url "http://localhost:7000/payment"
    And I wait for 2 seconds
    When I set the element "#name" value to "test user"
    And I set the card information "4242424242424242" "04/24 424 42424" on "#card-element"
    # And I set the element "[name='cardnumber']" value to "4242424242424242" in iframe "iframe[src*='js.stripe.com']"
    # And I wait for .5 seconds
    # And I set the element "[name='exp-date']" value to "04 / 24" in iframe "iframe[src*='js.stripe.com']"
    # And I set the element "[name='cvc']" value to "242" in iframe "iframe[src*='js.stripe.com']"
    # And I wait for 1 seconds
    # # And I set the element "[name='postal']" value to "42424" in iframe "iframe[src*='js.stripe.com']"
    And I click the button "[type='submit']"
    And I wait for 2 seconds
    Then I expect the page url is "http://localhost:3000/"


  # Scenario: Logout
  #   Given I open the url "http://localhost:7000/logout"
  #   Then I expect the page url is "http://localhost:7000/"

  # # Extended test
  # Scenario: Signup and redirect to /payment
  #   Given I open the url "http://localhost:7000/signup"
  #   When I set the element "#email" value to "test2+payment@example.com"
  #   And I set the element "#password" value to "password"
  #   And I click the button "[type='submit']"
  #   And I wait for .5 seconds
  #   Then I expect the page url is "http://localhost:7000/payment"
  #   And I expect the element "h1" contains text "Add a payment method"
  #   And I expect the element "[type='submit']" contains text "Pay $49/mo"

  # Scenario: User can visit home
  #   Given I open the url "http://localhost:7000"
  #   Then I expect the page url is "http://localhost:7000/"

  # Scenario: User can visit settings
  #   Given I open the url "http://localhost:7000/user"
  #   Then I expect the page url is "http://localhost:7000/user"

  # Scenario: User can't visit saas
  #   Given I open the url "http://localhost:3000"
  #   Then I expect the page url is "http://localhost:7000/payment"
  #   And I expect the element "h1" contains text "Add a payment method"

  # Scenario: Login without logout
  #   Given I open the url "http://localhost:7000/login"
  #   Then I expect the page url is "http://localhost:7000/payment"
  #   And I expect the element "h1" contains text "Add a payment method"

  # Scenario: Logout
  #   Given I open the url "http://localhost:7000/user"
  #   When I click the link '[href="/logout"]'
  #   Then I expect the page url is "http://localhost:7000/"

  # Scenario: Login keeps sending to the payment page
  #   Given I open the url "http://localhost:7000/login"
  #   When I set the element "#email" value to "test2+payment@example.com"
  #   And I set the element "#password" value to "password"
  #   And I click the button "[type='submit']"
  #   And I wait for .5 seconds
  #   Then I expect the page url is "http://localhost:7000/payment"
  #   And I expect the element "h1" contains text "Add a payment method"

  Scenario: Setup
    Given admin sets settings "signup_force_payment" to "false"
