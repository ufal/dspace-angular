import {
  TEST_ADMIN_PASSWORD,
  TEST_ADMIN_USER,
  TEST_SUBMIT_COLLECTION_UUID,
} from '../support';

/**
 * Test menu options for admin
 */
describe('Admin Menu Page', () => {
  beforeEach(() => {
    cy.visit('/');
    // Create a new submission
    cy.visit('/submit?collection=' + TEST_SUBMIT_COLLECTION_UUID + '&entityType=none');

    // This page is restricted, so we will be shown the login form. Fill it out & submit.
    cy.loginViaForm(TEST_ADMIN_USER, TEST_ADMIN_PASSWORD);
  });

  it('should pass accessibility tests', () => {
    // Check handles redirect url in the <a> tag
    cy.get('.sidebar-top-level-items a[href = "/handle-table"]').scrollIntoView().should('be.visible');

    // Check licenses redirect url in the <a> tag
    cy.get('.sidebar-top-level-items a[href = "/licenses"]').scrollIntoView().should('be.visible');
  });
});
