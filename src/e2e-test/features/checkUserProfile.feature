Feature: checkUserProfile
  As a user
  I want to be able view and edit my profile
  So that I can update my personal data

  Scenario: Check settings title
    Given I open the url "http://localhost:7000/signup"
    When I set the element "#email" value to "test2@example.com"
    And I set the element "#password" value to "password"
    And I click the button "[type='submit']"
    And I open the url "http://localhost:7000/user"
    Then I expect the element ".hero" contains text "Settings for test2@example.com"
    And I expect the element "#name" value is ""

  Scenario: Update settings
    Given I open the url "http://localhost:7000/user"
    When I set the element "#name" value to "John"
    And I set the element "#company" value to "Acme"
    And I wait for 1 seconds
    And I click the button "[type='submit']"
    And I wait for 1 seconds
    Then I expect the element ".hero" contains text "Settings for test2@example.com"
    And I expect the element "#name" value is "John"
    And I expect the element "#company" value is "Acme"

  Scenario: Update password
    Given I open the url "http://localhost:7000/user/security"
    When I set the element "#password" value to "password"
    And I set the element "#password-new" value to "password1"
    And I set the element "#password-confirm" value to "password1"
    And I click the button "[type='submit']"
    And I wait for 1 seconds
    And I click the link '[href="/logout"]'
    Then I expect the page url is "http://localhost:7000/"

  Scenario: Login old password
    And I open the url "http://localhost:7000/login"
    And I wait for 1 seconds
    When I set the element "#email" value to "test2@example.com"
    And I set the element "#password" value to "password"
    And I click the button "[type='submit']"
    Then I expect the page url is "http://localhost:7000/login"

  Scenario: Login new password
    And I open the url "http://localhost:7000/login"
    And I wait for 1 seconds
    When I set the element "#email" value to "test2@example.com"
    And I set the element "#password" value to "password1"
    And I click the button "[type='submit']"
    And I wait for 1 seconds
    Then I expect the page url is "http://localhost:3000/"
    And I expect that the title is "SaaS Placeholder"
