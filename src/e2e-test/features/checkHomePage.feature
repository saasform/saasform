Feature: checkHomePaage
  As a saas owner
  I want to have a working home page
  So that I can attract users
  
  Scenario: Check title
    When  I open the url "http://localhost:7000"
    Then  I expect that the title is "MultiPreview - Supercharged content sharing." 
  
  Scenario: Check prices
    When  I open the url "http://localhost:7000"
    Then I expect the element "#pricingStarter" exists # contains text "2.99"
    And I expect the element "#pricingUnlimited" exists # contains text "9.99"
