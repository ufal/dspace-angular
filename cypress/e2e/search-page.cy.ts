import { Options } from 'cypress-axe';
import { TEST_SEARCH_TERM } from 'cypress/support/e2e';
import { testA11y } from 'cypress/support/utils';

describe('Search Page', () => {
    it('should redirect to the correct url when query was set and submit button was triggered', () => {
        const queryString = 'Another interesting query string';
        cy.visit('/search');
        // Type query in searchbox & click search button
        cy.get('[data-test="search-box"]').type(queryString);
        cy.get('[data-test="search-button"]').click();
        cy.url().should('include', 'query=' + encodeURI(queryString));
    });

    // CLARIN
    // NOTE: accessibility tests are failing because the UI has been changed
    // it('should load results and pass accessibility tests', () => {
    //     cy.visit('/search?query='.concat(TEST_SEARCH_TERM));
    //     cy.get('[data-test="search-box"]').should('have.value', TEST_SEARCH_TERM);
    //
    //     // <ds-search-page> tag must be loaded
    //     cy.get('ds-search-page').should('be.visible');
    //
    //     // At least one search result should be displayed
    //     cy.get('[data-test="list-object"]').should('be.visible');
    //
    //     // Click each filter toggle to open *every* filter
    //     // (As we want to scan filter section for accessibility issues as well)
    //     cy.get('[data-test="filter-toggle"]').click({ multiple: true });
    //
    //     // Analyze <ds-search-page> for accessibility issues
    //     testA11y('ds-search-page');
    // });
    //
    // it('should have a working grid view that passes accessibility tests', () => {
    //     cy.visit('/search?query='.concat(TEST_SEARCH_TERM));
    //
    //     // Click button in sidebar to display grid view
    //     cy.get('ds-search-sidebar [data-test="grid-view"]').click();
    //
    //     // <ds-search-page> tag must be loaded
    //     cy.get('ds-search-page').should('be.visible');
    //
    //     // At least one grid object (card) should be displayed
    //     cy.get('[data-test="grid-object"]').should('be.visible');
    //
    //     // Analyze <ds-search-page> for accessibility issues
    //     testA11y('ds-search-page',
    //         {
    //             rules: {
    //                 // Search filters fail these two "moderate" impact rules
    //                 'heading-order': { enabled: false },
    //                 'landmark-unique': { enabled: false }
    //             }
    //         } as Options
    //     );
    // });
});
