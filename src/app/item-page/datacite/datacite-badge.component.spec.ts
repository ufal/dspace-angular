import { ComponentFixture, fakeAsync, TestBed, tick, waitForAsync } from '@angular/core/testing';

import { DataciteBadgeComponent } from './datacite-badge.component';
import { ItemIdentifierService } from 'src/app/shared/item-identifier.service';
import { APP_CONFIG, AppConfig } from 'src/config/app-config.interface';
import { Item } from 'src/app/core/shared/item.model';
import { Metadata } from 'src/app/core/shared/metadata.utils';
import { MetadataMap, MetadataValue } from 'src/app/core/shared/metadata.models';
import { Data } from '@angular/router';
import { NO_ERRORS_SCHEMA, PLATFORM_ID } from '@angular/core';

describe('DataciteBadgeComponent', () => {
  let component: DataciteBadgeComponent;
  let fixture: ComponentFixture<DataciteBadgeComponent>;
  let itemIdentifierService: ItemIdentifierService;
  let appConfig: AppConfig;

  const mockItemWithDOI: Item = Object.assign(new Item(), {
    uuid: 'test-item-1',
    metadata: {
      'dc.identifier.doi': [
        {
          language: null,
          value: 'https://doi.org/10.1234/test-doi'
        }
      ]
    }
  });

  const mockItemWithCleanDOI: Item = Object.assign(new Item(), {
    uuid: 'test-item-2',
    metadata: {
      'dc.identifier.doi': [
        {
          lanaguage: null,
          value: '10.1234/test-doi'
        }
      ]
    }
  });

  const mockItemWithoutDOI: Item = Object.assign(new Item(), {
    uuid: 'test-item-3',
    metadata: {
      'dc.title': [
        {
          language: 'en',
          value: 'Test Item without DOI'
        }
      ]
    }
  });

  const mockItemWithEmptyDOI: Item = Object.assign(new Item(), {
    uuid: 'test-item-4',
    metadata: {
      'dc.identifier.doi': [
        {
          language: null,
          value: ''
        }
      ]
    }
  });

  const mockItemWithNullDOI: Item = Object.assign(new Item(), {
    uuid: 'test-item-5',
    metadata: {
      'dc.identifier.doi': [
        {
          language: null,
          value: null
        }
      ]
    }
  });

  function setupTestBed(platformId: any, dataciteConfig?: string | null) {
    const mockAppConfig: AppConfig = {
      datacite: dataciteConfig
    } as AppConfig;

    const mockItemIdentifierService = jasmine.createSpyObj('ItemIdentifierService', ['prettifyIdentifier']);

    TestBed.configureTestingModule({
      declarations: [DataciteBadgeComponent],
      providers: [
        { provide: PLATFORM_ID, useValue: platformId},
        { provide: APP_CONFIG, useValue: mockAppConfig},
        { provide: ItemIdentifierService, useValue: mockItemIdentifierService }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    itemIdentifierService = TestBed.inject(ItemIdentifierService) as jasmine.SpyObj<ItemIdentifierService>;
    appConfig = TestBed.inject(APP_CONFIG);
  }

  function createComponent() {
    fixture = TestBed.createComponent(DataciteBadgeComponent);
    component = fixture.componentInstance;
  }

  describe('Component Initialization', () => {
    beforeEach(waitForAsync(() => {
      setupTestBed('browser');
    }));

    beforeEach(() => {
      createComponent();
    });

    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with default values', () => {
      expect(component.showBadge).toBe(true);
      expect(component.doi).toBeNull();
      expect(component.displayMode).toBe('small');
      expect(component['scriptsLoaded']).toBe(false);
    });

    it('should set isBrowser to true when running in browser', () => {
      expect(component.isBrowser).toBe(true);
    });
  });

  describe('Configuration handling', () => {
    describe('when datacite configuration is enabled', () => {
      beforeEach(waitForAsync(() => {
        setupTestBed('browser', 'dc.identifier.doi');
      }));

      beforeEach(() => {
        createComponent();
        (itemIdentifierService.prettifyIdentifier as jasmine.Spy).and.returnValue('10.1234/test-doi');
      });

      it('should use the configured metadata field', fakeAsync(() => {
        component.item = mockItemWithDOI;
        component.ngOnInit();
        tick();

        expect(itemIdentifierService.prettifyIdentifier).toHaveBeenCalledWith('https://doi.org/10.1234/test-doi', ['dc.identifier.doi']);
      }));

      it('should extract the doi when configuration is set', fakeAsync(() => {
        component.item = mockItemWithDOI;
        component.ngOnInit();
        tick();

        expect(component.doi).toBe('10.1234/test-doi');
        expect(component.showBadge).toBe(true);
      }));
    });

    describe('when datacite configuration is disabled', () => {
      beforeEach(waitForAsync(() => {
        setupTestBed('browser', null);
      }));

      beforeEach(() => {
        createComponent();
      });

      it('should exit early from the ngOnInit', fakeAsync(() => {
        component.item = mockItemWithDOI;
        component.ngOnInit();
        tick();

        expect(component.doi).toBeNull();
      }));
    });
  });

  describe('Item handling', () => {
    beforeEach(waitForAsync(() => {
      setupTestBed('browser', 'dc.identifier.doi');
    }));

    beforeEach(() => {
      createComponent();
    });

    describe('when item is null', () => {
      it('should exit early from ngOnInit', fakeAsync(() => {
        component.item = null;
        component.ngOnInit();
        tick();

        expect(itemIdentifierService.prettifyIdentifier).not.toHaveBeenCalled();
      }));
    });

    describe('when item has no metadata', () => {
      it('should handle gracefully', fakeAsync(() => {
        const emptyItem: Object = Object.assign(new Item(), {
          uuid: 'empty-item',
          metadata: {}
        });

        (itemIdentifierService.prettifyIdentifier as jasmine.Spy).and.returnValue(Promise.resolve(null));
        component.item = emptyItem as Item;
        component.ngOnInit();
        tick();

        expect(component.doi).toBeNull();

      }));
    });
  });
});
