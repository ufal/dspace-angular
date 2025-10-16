import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EpicHandleTableComponent } from './epic-handle-table.component';
import { EpicHandleDataService } from 'src/app/core/data/epic-handle-data.service';
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { getMockTranslateService } from 'src/app/shared/mocks/translate.service.mock';
import { TranslateLoaderMock } from 'src/app/shared/mocks/translate-loader.mock';
import { NotificationsService } from 'src/app/shared/notifications/notifications.service';
import { Router, ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';

describe('EpicHandleTableComponent', () => {
  let component: EpicHandleTableComponent;
  let fixture: ComponentFixture<EpicHandleTableComponent>;
  let epicHandleDataService: jasmine.SpyObj<EpicHandleDataService>;
  let notificationsService: jasmine.SpyObj<NotificationsService>;
  let router: jasmine.SpyObj<Router>;
  let translateService: TranslateService;
  let activatedRoute: any;

  const mockHandles = [
    {
      id: '11148/TEST-001',
      url: 'http://example1.com'
    },
    {
      id: '11148/TEST-002',
      url: 'http://example2.com'
    }
  ];

  const mockResponse = {
    payload: {
      page: mockHandles,
      pageInfo: {
        elementsPerPage: 10,
        totalElements: 2,
        totalPages: 1,
        currentPage: 1
      },
      totalElements: 2
    }
  };
  beforeEach(async () => {
    const epicHandleDataServiceSpy = jasmine.createSpyObj('EpicHandleDataService', ['findAll', 'deleteByHandleId', 'setPrefix']);
    const notificationsSpy = jasmine.createSpyObj('NotificationsService', ['success', 'error']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    translateService = getMockTranslateService();
    activatedRoute = {
      queryParams: of({ prefix: '11148' })
    };

    await TestBed.configureTestingModule({
      declarations: [ EpicHandleTableComponent ],
      imports: [TranslateModule.forRoot({
                            loader: {
                              provide: TranslateLoader,
                              useClass: TranslateLoaderMock
                            }
                          })],
      providers: [
        { provide: EpicHandleDataService, useValue: epicHandleDataServiceSpy },
        { provide: NotificationsService, useValue: notificationsSpy },
        { provide: Router, useValue: routerSpy},
        { provide: ActivatedRoute, useValue: activatedRoute },
      ]
    })
    .compileComponents();
    epicHandleDataService = TestBed.inject(EpicHandleDataService) as jasmine.SpyObj<EpicHandleDataService>;
    translateService = TestBed.inject(TranslateService) as jasmine.SpyObj<TranslateService>;
    notificationsService = TestBed.inject(NotificationsService) as jasmine.SpyObj<NotificationsService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    fixture = TestBed.createComponent(EpicHandleTableComponent);
    component = fixture.componentInstance;
    // make findAll return the mockResponse by default
    epicHandleDataService.findAll.and.returnValue(of(mockResponse));
    // epicHandleDataService.deleteByHandleId && (epicHandleDataService.deleteByHandleId as jasmine.Spy).and.returnValue(of({ hasSucceeded: true, statusCode: 204 }));
    if (epicHandleDataService.deleteByHandleId) {
      (epicHandleDataService.deleteByHandleId as jasmine.Spy).and.returnValue(of({ hasSucceeded: true, statusCode: 204 }));
    }
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Component Initialization', () => {
    it('should redirect to prefix page if no prefix in localStorage', () => {
      // simulate no prefix in query params
      activatedRoute.queryParams = of({});
      const f = TestBed.createComponent(EpicHandleTableComponent);
      f.detectChanges();

      expect(router.navigate).toHaveBeenCalledWith(['/epic-handle-table/prefix']);
    });

    it('should set prefix from localStorage', () => {
      fixture.detectChanges();
      expect(component.prefix).toBe('11148');
      expect(epicHandleDataService.setPrefix).toHaveBeenCalledWith('11148');
    });

    it('should load handles on init', () => {
      fixture.detectChanges();

      expect(epicHandleDataService.findAll).toHaveBeenCalled();
    });

    it('should initialize pagination options', () => {
      fixture.detectChanges();

      expect(component.options).toBeDefined();
      expect(component.options.pageSize).toBe(10);
      expect(component.options.currentPage).toBe(1);
    });
  });

  describe('getAllHandles', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should fetch handles successfully', (done) => {
      component.getAllHandles();

      setTimeout(() => {
        component.handlesRD$.subscribe(result => {
          expect(result.payload.page.length).toBe(2);
          expect(component.isLoading).toBe(false);
          done();
        });
      }, 100);
    });

    it('should handle error when loading handles', (done) => {
      epicHandleDataService.findAll.and.returnValue(throwError({ error: 'Error' }));

      component.getAllHandles();

      setTimeout(() => {
        expect(component.isLoading).toBe(false);
        expect(notificationsService.error).toHaveBeenCalled();
        done();
      }, 100);
    });

    it('should reset pagination when search query changes', () => {
      component.searchQuery = 'example.com';
      // make findAll return a response with totalElements so totalElements would be set
      epicHandleDataService.findAll.and.returnValue(of(mockResponse));
      component.getAllHandles();

      expect(component.options.currentPage).toBe(1);
      // since findAll returns totalElements, totalElements shouldn't be null after fetch
      expect(component.totalElements).toBe(2);
    });

    it('should include URL pattern in API call when searching', () => {
      component.searchQuery = 'example.com';
      component.getAllHandles();

      expect(epicHandleDataService.findAll).toHaveBeenCalledWith(
        jasmine.any(Object),
        '11148',
        'example.com',
        null,
      );
    });
  });

  describe('Search Functionality', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should trigger search on searchHandles()', () => {
      spyOn(component, 'getAllHandles');
      component.searchQuery = 'test';

      component.searchHandles();

      expect(component.getAllHandles).toHaveBeenCalled();
    });

    it('should clear search and reset', () => {
      spyOn(component, 'getAllHandles');
      component.searchQuery = 'test';
      component.totalElements = 10;

      component.clearSearch();

      expect(component.searchQuery).toBe('');
      expect(component.totalElements).toBeNull();
      expect(component.getAllHandles).toHaveBeenCalled();
    });
  });

  describe('Selection Management', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should select handle', () => {
      component.switchSelectedHandle('11148/TEST-001');

      expect(component.selectedHandle).toBe('11148/TEST-001');
    });

    it('should unselect handle when clicking same handle', () => {
      component.selectedHandle = '11148/TEST-001';

      component.switchSelectedHandle('11148/TEST-001');

      expect(component.selectedHandle).toBeNull();
    });

    it('should switch selection to different handle', () => {
      component.selectedHandle = '11148/TEST-001';

      component.switchSelectedHandle('11148/TEST-002');

      expect(component.selectedHandle).toBe('11148/TEST-002');
    });
  });

  describe('Navigation', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should navigate to new handle page', () => {
      component.redirectToNewHandle();

      expect(router.navigate).toHaveBeenCalledWith(
        ['/epic-handle-table', 'new-epic-handle'],
        { queryParams: { currentPage: 1, prefix: '11148' } }
      );
    });

    it('should navigate to edit page with selected handle', (done) => {
      component.handlesRD$.next(mockResponse);
      component.selectedHandle = '11148/TEST-001';

      component.redirectToEditHandle();

      setTimeout(() => {
        expect(router.navigate).toHaveBeenCalledWith(
          ['/epic-handle-table', 'edit-epic-handle'],
          jasmine.objectContaining({
            queryParams: jasmine.objectContaining({
              id: '11148/TEST-001'
            })
          })
        );
        done();
      }, 100);
    });

    it('should not navigate to edit when no handle selected', () => {
      component.selectedHandle = null;

      component.redirectToEditHandle();

      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should navigate to prefix page on changePrefix', () => {
      component.changePrefix();
      expect(router.navigate).toHaveBeenCalledWith(['/epic-handle-table/prefix']);
    });
  });

  describe('Delete Functionality', () => {
    beforeEach(() => {
      fixture.detectChanges();
      epicHandleDataService.deleteByHandleId.and.returnValue(of({
        hasSucceeded: true,
        statusCode: 204
      } as any));
    });

    it('should not delete when no handle selected', () => {
      component.selectedHandle = null;

      component.deleteHandle();

      expect(epicHandleDataService.deleteByHandleId).not.toHaveBeenCalled();
    });

    it('should show confirmation dialog', () => {
      spyOn(window, 'confirm').and.returnValue(false);
      component.selectedHandle = '11148/TEST-001';

      component.deleteHandle();

      expect(window.confirm).toHaveBeenCalled();
      expect(epicHandleDataService.deleteByHandleId).not.toHaveBeenCalled();
    });

    it('should delete handle when confirmed', (done) => {
      spyOn(window, 'confirm').and.returnValue(true);
      spyOn(component, 'getAllHandles');
      component.selectedHandle = '11148/TEST-001';

      component.deleteHandle();

      setTimeout(() => {
        expect(epicHandleDataService.deleteByHandleId).toHaveBeenCalledWith('11148/TEST-001');
        expect(notificationsService.success).toHaveBeenCalled();
        expect(component.getAllHandles).toHaveBeenCalled();
        done();
      }, 100);
    });

    it('should handle delete error', (done) => {
      spyOn(window, 'confirm').and.returnValue(true);
      epicHandleDataService.deleteByHandleId.and.returnValue(throwError({ error: 'Error' }));
      component.selectedHandle = '11148/TEST-001';

      component.deleteHandle();

      setTimeout(() => {
        expect(notificationsService.error).toHaveBeenCalled();
        expect(component.isLoading).toBe(false);
        done();
      }, 100);
    });
  });

  describe('goToHandle', () => {
    it('should open handle in new tab', () => {
      spyOn(window, 'open');

      component.goToHandle('11148/TEST-001');

      expect(window.open).toHaveBeenCalledWith('/handle/11148/TEST-001', '_blank');
    });

    it('should not open when handleId is empty', () => {
      spyOn(window, 'open');

      component.goToHandle('');

      expect(window.open).not.toHaveBeenCalled();
    });
  });

  describe('Pagination', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should call getAllHandles on page change', () => {
      spyOn(component, 'getAllHandles');

      component.onPageChange();

      expect(component.getAllHandles).toHaveBeenCalled();
    });
  });
});
