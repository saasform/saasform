Feature: checkSignupRequirePayment
  As the admin
  I want to force payment at signup
  So that I can collect cc info right away

  Scenario: Setup
    Given admin sets settings "signup_force_payment" to "true"

  Scenario: Signup and redirect to /payment
    Given I open the url "http://localhost:7000/signup"
    When I set the element "#email" value to "test+payment@example.com"
    And I set the element "#password" value to "password"
    And I click the button "[type='submit']"
    And I wait for .5 seconds
    Then I expect the page url is "http://localhost:7000/payment"
    And I expect the element "h1" contains text "Add a payment method"
    And I expect the element "[type='submit']" contains text "Pay $49/mo"

  Scenario: User can visit home
    Given I open the url "http://localhost:7000"
    Then I expect the page url is "http://localhost:7000/"

  Scenario: User can visit settings
    Given I open the url "http://localhost:7000/user"
    Then I expect the page url is "http://localhost:7000/user"

  Scenario: User can't visit saas
    Given I open the url "http://localhost:3000"
    Then I expect the page url is "http://localhost:7000/payment"
    And I expect the element "h1" contains text "Add a payment method"

  Scenario: Login without logout
    Given I open the url "http://localhost:7000/login"
    Then I expect the page url is "http://localhost:7000/payment"
    And I expect the element "h1" contains text "Add a payment method"

  Scenario: Logout
    Given I open the url "http://localhost:7000/user"
    When I click the link '[href="/logout"]'
    Then I expect the page url is "http://localhost:7000/"

  Scenario: Login
    Given I open the url "http://localhost:7000/login"
    When I set the element "#email" value to "test+payment@example.com"
    And I set the element "#password" value to "password"
    And I click the button "[type='submit']"
    And I wait for .5 seconds
    Then I expect the page url is "http://localhost:7000/payment"
    And I expect the element "h1" contains text "Add a payment method"

#  Scenario: Setup
#    Given admin sets settings "signup_force_payment" to "false"
