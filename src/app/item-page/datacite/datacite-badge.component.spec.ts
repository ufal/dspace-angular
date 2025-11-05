import { ComponentFixture, fakeAsync, TestBed, tick, waitForAsync } from '@angular/core/testing';

import { DataciteBadgeComponent } from './datacite-badge.component';
import { ItemIdentifierService } from 'src/app/shared/item-identifier.service';
import { APP_CONFIG, AppConfig } from 'src/config/app-config.interface';
import { Item } from 'src/app/core/shared/item.model';
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
          language: null,
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
      expect(component.scriptsLoaded).toBe(false);
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

  describe('DOI Extraction', () => {
    beforeEach(waitForAsync(() => {
      setupTestBed('browser', 'dc.identifier.doi');
    }));

    beforeEach(() => {
      createComponent();
    });

    describe('when item has valid DOI with resolver', () => {
      it('should extract and prettify the DOI correctly', fakeAsync(() => {
        (itemIdentifierService.prettifyIdentifier as jasmine.Spy).and.returnValue(Promise.resolve('10.1234/test-doi'));

        component.item = mockItemWithDOI;
        component.ngOnInit();
        tick();

        expect(component.doi).toBe('10.1234/test-doi');
        expect(component.showBadge).toBe(true);
      }));
    });

    describe('when item has clean DOI without resolver', () => {
      it('should extract the DOI successfully', fakeAsync(() => {
        (itemIdentifierService.prettifyIdentifier as jasmine.Spy).and.returnValue(Promise.resolve('10.1234/clean-doi'));
        component.item = mockItemWithCleanDOI;
        component.ngOnInit();
        tick();

        expect(component.doi).toBe('10.1234/clean-doi');
        expect(component.showBadge).toBe(true);
      }));
    });

    describe('when item has no DOI metadata', () => {
      it('should return null and not show the badge', fakeAsync(() => {
        (itemIdentifierService.prettifyIdentifier as jasmine.Spy).and.returnValue(Promise.resolve(null));
        component.item = mockItemWithoutDOI;
        component.ngOnInit();
        tick();

        expect(component.doi).toBeNull();
      }));
    });

    describe('when item has empty DOI value', () => {
      it('should return null for empty string', fakeAsync(() => {
        (itemIdentifierService.prettifyIdentifier as jasmine.Spy).and.returnValue(Promise.resolve(null));

        component.item = mockItemWithEmptyDOI;
        component.ngOnInit();
        tick();

        expect(component.doi).toBeNull();
      }));
    });

    describe('when item has null DOI value', () => {
      it('should return null', fakeAsync(() => {
        (itemIdentifierService.prettifyIdentifier as jasmine.Spy).and.returnValue(Promise.resolve(null));

        component.item = mockItemWithNullDOI;
        component.ngOnInit();
        tick();

        expect(component.doi).toBeNull();
      }));
    });
  });


  describe('Badge Visibility', () => {

    beforeEach(waitForAsync(() => {
      setupTestBed('browser', 'dc.identifier.doi');
    }));

    beforeEach(() => {
      createComponent();
    });

    describe('when DOI is present', () => {
      it('should show badge', fakeAsync(() => {
        (itemIdentifierService.prettifyIdentifier as jasmine.Spy).and.returnValue(Promise.resolve('10.1234/test-doi'));

        component.item = mockItemWithDOI;
        component.ngOnInit();
        tick();

        expect(component.showBadge).toBe(true);
      }));
    });

    describe('when DOI is not present', () => {
      it('should keep default showBadge value', fakeAsync(() => {
        (itemIdentifierService.prettifyIdentifier as jasmine.Spy).and.returnValue(Promise.resolve(null));

        component.item = mockItemWithoutDOI;
        component.ngOnInit();
        tick();

        expect(component.doi).toBeNull();
      }));
    });
  });

  describe('Script Loading', () => {

    beforeEach(waitForAsync(() => {
      setupTestBed('browser', 'dc.identifier.doi');
    }));

    beforeEach(() => {
      createComponent();
    });

    describe('loadDataCiteScripts method', () => {

      beforeEach(() => {
        spyOn(document.head, 'appendChild').and.callFake((script: any) => {
          setTimeout(() => script.onload(), 0);
          return script;
        });
      });

      it('should load all required scripts', fakeAsync(() => {
        component.loadDataCiteScripts();
        tick();

        expect(document.head.appendChild).toHaveBeenCalledTimes(3);
      }));

      it('should load Vue.js script first', fakeAsync(() => {
        component.loadDataCiteScripts();
        tick();

        const firstCall = (document.head.appendChild as jasmine.Spy).calls.argsFor(0)[0];
        expect(decodeURI(firstCall.src)).toBe('https://unpkg.com/vue@^2/dist/vue.min.js');
      }));

      it('should load webcomponents loader script second', fakeAsync(() => {
        component.loadDataCiteScripts();
        tick();

        const secondCall = (document.head.appendChild as jasmine.Spy).calls.argsFor(1)[0];
        expect(secondCall.src).toBe('https://unpkg.com/@webcomponents/webcomponentsjs@2.0.0/webcomponents-loader.js');
      }));

      it('should load data-metrics-badge script third', fakeAsync(() => {
        component.loadDataCiteScripts();
        tick();

        const thirdCall = (document.head.appendChild as jasmine.Spy).calls.argsFor(2)[0];
        expect(thirdCall.src).toBe('https://unpkg.com/data-metrics-badge/dist/data-metrics-badge.min.js');
      }));

      it('should set scriptsLoaded flag to true after loading', fakeAsync(() => {
        component.loadDataCiteScripts();
        tick();

        expect(component.scriptsLoaded).toBe(true);
      }));

      it('should not reload scripts if already loaded', fakeAsync(() => {
        component.loadDataCiteScripts();
        tick();

        (document.head.appendChild as jasmine.Spy).calls.reset();

        component.loadDataCiteScripts();
        tick();

        expect(document.head.appendChild).not.toHaveBeenCalled();
      }));

      it('should handle script loading errors', fakeAsync(() => {
        (document.head.appendChild as jasmine.Spy).and.callFake((script: any) => {
          setTimeout(() => script.onerror(new Error('Script load failed')), 0);
          return script;
        });

        component.loadDataCiteScripts();
        tick();

        expect(component.showBadge).toBe(false);
      }));

      it('should set showBadge to false on error', fakeAsync(() => {
        (document.head.appendChild as jasmine.Spy).and.callFake((script: any) => {
          setTimeout(() => script.onerror(new Error('Network error')), 0);
          return script;
        });

        component.showBadge = true;
        component.loadDataCiteScripts();
        tick();

        expect(component.showBadge).toBe(false);
      }));
    });

    describe('loadScript method', () => {

      it('should create script element with correct properties', fakeAsync(() => {
        const mockScript = document.createElement('script');
        spyOn(document, 'createElement').and.returnValue(mockScript);
        spyOn(document.head, 'appendChild').and.callFake((script: any) => {
          setTimeout(() => script.onload(), 0);
          return script;
        });

        component.loadScript('https://example.com/script.js');
        tick();

        expect(document.createElement).toHaveBeenCalledWith('script');
        expect(mockScript.type).toBe('text/javascript');
        expect(mockScript.src).toBe('https://example.com/script.js');
      }));

      it('should resolve promise on successful load', fakeAsync(() => {
        spyOn(document.head, 'appendChild').and.callFake((script: any) => {
          setTimeout(() => script.onload(), 0);
          return script;
        });

        let resolved = false;
        component.loadScript('https://example.com/script.js').then(() => {
          resolved = true;
        });

        tick();
        expect(resolved).toBe(true);
      }));

      it('should reject promise on error', fakeAsync(() => {
        spyOn(document.head, 'appendChild').and.callFake((script: any) => {
          setTimeout(() => script.onerror(new Error('Load failed')), 0);
          return script;
        });

        let rejected = false;
        component.loadScript('https://example.com/script.js').catch(() => {
          rejected = true;
        });

        tick();
        expect(rejected).toBe(true);
      }));

      it('should not load script if already exists in document', fakeAsync(() => {
        const existingScript = document.createElement('script');
        existingScript.src = 'https://example.com/existing.js';
        document.head.appendChild(existingScript);

        spyOn(document.head, 'appendChild').and.callThrough();

        let resolved = false;
        component.loadScript('https://example.com/existing.js').then(() => {
          resolved = true;
        });

        tick();

        expect(resolved).toBe(true);
        expect(document.head.appendChild).not.toHaveBeenCalled();

        document.head.removeChild(existingScript);
      }));
    });
  });
});
