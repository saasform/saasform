Feature: checkAuthentication
  As a user
  I want to be able to login
  So that I can use the saas

  Scenario: Signup and redirect
    Given I open the url "http://localhost:7000/signup"
    When I set the element "#email" value to "test@example.com"
    And I set the element "#password" value to "password"
    And I click the button "[type='submit']"
    Then I expect the page url is "http://localhost:3000/"
    And I expect that the title is "SaaS Placeholder"

  Scenario: User profile link
    Given I open the url "http://localhost:3000"
    When I click the link '[href="http://localhost:7000/user"]'
    Then I expect the page url is "http://localhost:7000/user"

  Scenario: User profile
    Given I open the url "http://localhost:7000/user"
    Then I expect the element "#email" value is "test@example.com"

  Scenario: Login without logout
    Given I open the url "http://localhost:7000/login"
    Then I expect the page url is "http://localhost:3000/"
    And I expect that the title is "SaaS Placeholder"

  Scenario: Logout
    Given I open the url "http://localhost:7000/user"
    When I click the link '[href="/logout"]'
    Then I expect the page url is "http://localhost:7000/"

  Scenario: Login
    Given I open the url "http://localhost:7000/login"
    When I set the element "#email" value to "test@example.com"
    And I set the element "#password" value to "password"
    And I click the button "[type='submit']"
    And I wait for .5 seconds
    Then I expect the page url is "http://localhost:3000/"
    And I expect that the title is "SaaS Placeholder"
