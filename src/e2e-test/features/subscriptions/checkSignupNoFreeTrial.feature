Feature: checkSignupRequirePayment
  As the admin
  I want to force payment at signup
  So that I can collect cc info right away

  Scenario: Setup
    Given admin sets settings "pricing_free_trial" to "0"

  # Smoke test
  Scenario: Signup and redirect to /payment, add method and redirect to SaaS, logout
    Given I open the url "http://localhost:7000/signup"
    When I set the element "#email" value to "test+payment@example.com"
    And I set the element "#password" value to "password"
    And I click the button "[type='submit']"
    And I wait for 1 seconds

    Then I expect the page url is "http://localhost:7000/payment"
    And I expect the element "h1" contains text "Add a payment method"
    And I expect the element "[type='submit']" contains text "Pay $49/mo"
    When I set the element "#name" value to "test user"
    And I set the card information "4242424242424242" "04/24 424 42424" on "#card-element"
    And I click the button "[type='submit']"
    And I wait for 3 seconds

    Then I expect the page url is "http://localhost:3000/"
    And I expect that the title is "SaaS Placeholder"

    And I click the button "[href*='/logout']"
    And I wait for .5 seconds
    Then I expect the page url is "http://localhost:7000/"

  Scenario: Setup
    Given admin sets settings "pricing_free_trial" to "7"
