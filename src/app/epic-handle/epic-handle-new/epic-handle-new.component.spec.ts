import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { EpicHandleDataService } from '../../core/data/epic-handle-data.service';
import { NotificationsService } from '../../shared/notifications/notifications.service';
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { of, throwError, Observable } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateLoaderMock } from 'src/app/shared/testing/translate-loader.mock';
import { getMockTranslateService } from 'src/app/shared/mocks/translate.service.mock';
import { NotificationsServiceStub } from 'src/app/shared/testing/notifications-service.stub';
import { EpicHandleNewComponent } from './epic-handle-new.component';

describe('EpicNewHandlePageComponent', () => {
  let component: EpicHandleNewComponent;
  let fixture: ComponentFixture<EpicHandleNewComponent>;
  let epicHandleService: jasmine.SpyObj<EpicHandleDataService>;
  let router: jasmine.SpyObj<Router>;
  let translateService: TranslateService;
  let notificationService: NotificationsServiceStub;
  const mockHandle = {
    id: '11148/TEST-001',
    url: 'http://example.com',
    hasSucceeded: true,
    hasFailed: false
  };

  beforeEach(async () => {
    const epicHandleServiceSpy = jasmine.createSpyObj('EpicHandleDataService', ['create']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    const activatedRoute = {
      snapshot: {
        queryParams: { prefix: '11148' }
      }
    };
    translateService = getMockTranslateService();
    notificationService = new NotificationsServiceStub();
    await TestBed.configureTestingModule({
      declarations: [EpicHandleNewComponent],
      imports: [FormsModule,  TranslateModule.forRoot({
                loader: {
                  provide: TranslateLoader,
                  useClass: TranslateLoaderMock
                }
              }),],
      providers: [
        { provide: EpicHandleDataService, useValue: epicHandleServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: activatedRoute },
        { provide: NotificationsService, useValue: notificationService },
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    epicHandleService = TestBed.inject(EpicHandleDataService) as jasmine.SpyObj<EpicHandleDataService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    translateService = TestBed.inject(TranslateService) as jasmine.SpyObj<TranslateService>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(EpicHandleNewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Component Initialization', () => {
    it('should redirect to prefix page if no prefix', () => {
      // simulate missing prefix in route snapshot
      (component as any).route = { snapshot: { queryParams: {} } } as any;
      component.ngOnInit();
      expect(router.navigate).toHaveBeenCalledWith(['/epic-handle-table/prefix']);
    });
  });

  describe('Form Submission', () => {
    beforeEach(() => {
      // Wrap the mockHandle in a RemoteData-like object expected by getFirstCompletedRemoteData
      const remoteMock = { hasCompleted: true, hasSucceeded: true, payload: mockHandle } as any;
      epicHandleService.create.and.returnValue(of(remoteMock));
    });

    it('should create handle with URL', (done) => {
      const formValue = {
        url: 'http://example.com'
      };

      component.onClickSubmit(formValue);

      setTimeout(() => {
        expect(epicHandleService.create).toHaveBeenCalledWith(
          '11148',
          'http://example.com',
          undefined,
          undefined
        );
        expect(notificationService.success).toHaveBeenCalled();
        done();
      }, 100);
    });

    it('should include sub-prefix and sub-suffix when provided', (done) => {
      const formValue = {
        url: 'http://example.com',
        subPrefix: 'TEST',
        subSuffix: 'UFAL'
      };

      component.onClickSubmit(formValue);

      setTimeout(() => {
        expect(epicHandleService.create).toHaveBeenCalledWith(
          '11148',
          'http://example.com',
          'TEST',
          'UFAL'
        );
        done();
      }, 100);
    });

    it('should trim whitespace from inputs', (done) => {
      const formValue = {
        url: '  http://example.com  ',
        subPrefix: '  TEST  ',
        subSuffix: '  UFAL  '
      };

      component.onClickSubmit(formValue);

      setTimeout(() => {
        expect(epicHandleService.create).toHaveBeenCalledWith(
          '11148',
          'http://example.com',
          'TEST',
          'UFAL'
        );
        done();
      }, 100);
    });

    it('should show error when URL is empty', () => {
      const formValue = { url: '' };

      component.onClickSubmit(formValue);

      expect(notificationService.error).toHaveBeenCalled();
      expect(epicHandleService.create).not.toHaveBeenCalled();
    });

    it('should show error when URL is whitespace only', () => {
      const formValue = { url: '   ' };

      component.onClickSubmit(formValue);

      expect(notificationService.error).toHaveBeenCalled();
      expect(epicHandleService.create).not.toHaveBeenCalled();
    });

    it('should handle API error', (done) => {
      epicHandleService.create.and.returnValue(throwError({ error: 'Error' }));
      const formValue = { url: 'http://example.com' };

      component.onClickSubmit(formValue);

      setTimeout(() => {
        expect(notificationService.error).toHaveBeenCalled();
        expect(component.isLoading).toBe(false);
        done();
      }, 100);
    });

    it('should handle failed response', (done) => {
      const failedResponse = {
        ...mockHandle,
        hasSucceeded: false,
        hasFailed: true,
        errorMessage: 'Failed'
      };
      epicHandleService.create.and.returnValue(of({ ...failedResponse, hasCompleted: true } as any));
      const formValue = { url: 'http://example.com' };

      component.onClickSubmit(formValue);

      setTimeout(() => {
        expect(notificationService.error).toHaveBeenCalled();
        done();
      }, 100);
    });

    it('should set loading state during submission', () => {
      epicHandleService.create.and.returnValue(new Observable(observer => {
        // emit asynchronously to simulate in-flight request
        setTimeout(() => {
          observer.next({ hasCompleted: true, hasSucceeded: true, payload: mockHandle } as any);
          observer.complete();
        }, 50);
      }));
      const formValue = { url: 'http://example.com' };

      component.onClickSubmit(formValue);

      expect(component.isLoading).toBe(true);
    });
  });

  describe('Navigation', () => {
    it('should redirect back after successful creation', (done) => {
      epicHandleService.create.and.returnValue(of({ hasCompleted: true, hasSucceeded: true, payload: mockHandle } as any));
      const formValue = { url: 'http://example.com' };

      component.onClickSubmit(formValue);

      setTimeout(() => {
        expect(router.navigate).toHaveBeenCalledWith(
          ['/epic-handle-table'],
          { queryParams: { prefix: '11148' } }
        );
        done();
      }, 100);
    });

    it('should redirect back on cancel', () => {
      component.onCancel();
      expect(router.navigate).toHaveBeenCalledWith(
        ['/epic-handle-table'],
        { queryParams: { prefix: '11148' } }
      );
    });

    it('should redirect without currentPage when not provided', () => {
      component.currentPage = undefined;
      component.redirectBack();

      expect(router.navigate).toHaveBeenCalledWith(
        ['/epic-handle-table'],
        { queryParams: { prefix: '11148' } }
      );
    });
  });
});
