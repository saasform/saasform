Feature: checkSignupRequirePayment
  As the admin
  I want to force payment at signup
  So that I can collect cc info right away

  # Scenario: Setup
  #   Given admin sets settings "pricing_plans" to "[{\"name\": \"Free\", \"price_year\": 0, \"price_month\": 0}]"

  # Smoke test
  Scenario: Signup and redirect to /payment
    Given I open the url "http://localhost:7000/signup"
    When I set the element "#email" value to "test+payment@example.com"
    And I set the element "#password" value to "password"
    And I click the button "[type='submit']"
    And I wait for .5 seconds
    Then I expect the page url is "http://localhost:3000/"
    And I expect that the title is "SaaS Placeholder"

  # Scenario: Setup
  #  Given admin sets settings "pricing_plans" to ""
