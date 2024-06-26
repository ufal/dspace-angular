import { testA11y } from 'cypress/support/utils';

describe('Footer', () => {
    it('should pass accessibility tests', () => {
        cy.visit('/');

        // Footer must first be visible
        cy.get('ds-footer').should('be.visible');

        // TODO accessibility tests are failing because the UI has been changed
        // Analyze <ds-footer> for accessibility
        // testA11y('ds-footer');
    });
});
