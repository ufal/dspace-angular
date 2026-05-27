import { ComponentFixture, fakeAsync, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ClarinLicenseTableComponent } from './clarin-license-table.component';
import { NotificationsServiceStub } from '../../shared/testing/notifications-service.stub';
import { ClarinLicenseDataService } from '../../core/data/clarin/clarin-license-data.service';
import { RequestService } from '../../core/data/request.service';
import { of as observableOf } from 'rxjs';
import { SharedModule } from '../../shared/shared.module';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { PaginationService } from '../../core/pagination/pagination.service';
import { PaginationServiceStub } from '../../shared/testing/pagination-service.stub';
import { NotificationsService } from '../../shared/notifications/notifications.service';
import { defaultPagination } from '../clarin-license-table-pagination';
import { ClarinLicenseLabelDataService } from '../../core/data/clarin/clarin-license-label-data.service';
import { NgbActiveModal, NgbTooltip } from '@ng-bootstrap/ng-bootstrap';
import { HostWindowService } from '../../shared/host-window.service';
import { HostWindowServiceStub } from '../../shared/testing/host-window-service.stub';
import {
  createdLicenseLabelRD$,
  createdLicenseRD$,
  mockExtendedLicenseLabel,
  mockLicense, mockLicenseRD$,
  mockNonExtendedLicenseLabel, successfulResponse
} from '../../shared/testing/clarin-license-mock';
import {GroupDataService} from '../../core/eperson/group-data.service';
import { createNoContentRemoteDataObject$, createSuccessfulRemoteDataObject$ } from '../../shared/remote-data.utils';
import {createPaginatedList} from '../../shared/testing/utils.test';
import {LinkHeadService} from '../../core/services/link-head.service';
import {ConfigurationDataService} from '../../core/data/configuration-data.service';
import {ConfigurationProperty} from '../../core/shared/configuration-property.model';
import {SearchConfigurationService} from '../../core/shared/search/search-configuration.service';

describe('ClarinLicenseTableComponent', () => {
  let component: ClarinLicenseTableComponent;
  let fixture: ComponentFixture<ClarinLicenseTableComponent>;

  let clarinLicenseDataService: ClarinLicenseDataService;
  let clarinLicenseLabelDataService: ClarinLicenseLabelDataService;
  let requestService: RequestService;
  let notificationService: NotificationsServiceStub;
  let modalStub: NgbActiveModal;
  let groupsDataService: GroupDataService;
  let service: ConfigurationDataService;
  let searchConfigurationServiceStub: SearchConfigurationService;
  let paginationServiceStub: PaginationServiceStub;

  beforeEach(async () => {
    notificationService = new NotificationsServiceStub();
    clarinLicenseDataService = jasmine.createSpyObj('clarinLicenseService', {
      findAll: mockLicenseRD$,
      create: createdLicenseRD$,
      put: createdLicenseRD$,
      delete: createNoContentRemoteDataObject$(),
      searchBy: mockLicenseRD$,
      getLinkPath: observableOf('')
    });
    clarinLicenseLabelDataService = jasmine.createSpyObj('clarinLicenseLabelService', {
      create: createdLicenseLabelRD$
    });
    requestService = jasmine.createSpyObj('requestService', {
      send: observableOf('response'),
      getByUUID: observableOf(successfulResponse),
      generateRequestId: observableOf('123456'),
    });
    modalStub = jasmine.createSpyObj('modalService', ['close', 'open']);
    groupsDataService = jasmine.createSpyObj('groupsDataService', {
      findListByHref: createSuccessfulRemoteDataObject$(createPaginatedList([])),
      getGroupRegistryRouterLink: ''
    });
    const linkHeadService = jasmine.createSpyObj('linkHeadService', {
      addTag: {},
      removeTag: {}
    });
    const configurationDataService = jasmine.createSpyObj('configurationDataService', {
      findByPropertyName: createSuccessfulRemoteDataObject$(Object.assign(new ConfigurationProperty(), {
        name: 'test',
        values: [
          'org.dspace.ctask.general.ProfileFormats = test'
        ]
      }))
    });
    searchConfigurationServiceStub = jasmine.createSpyObj('SearchConfigurationService', {
      getCurrentConfiguration: observableOf('default'),
      getCurrentScope: observableOf('test-id'),
      updateFixedFilter: jasmine.createSpy('updateFixedFilter'),
      setPaginationId: jasmine.createSpy('setPaginationId')
    });
    paginationServiceStub = new PaginationServiceStub();

    await TestBed.configureTestingModule({
      imports: [
        SharedModule,
        CommonModule,
        ReactiveFormsModule,
        TranslateModule.forRoot(),
        RouterTestingModule.withRoutes([])
      ],
      declarations: [ ClarinLicenseTableComponent ],
      providers: [
        { provide: RequestService, useValue: requestService },
        { provide: ClarinLicenseDataService, useValue: clarinLicenseDataService },
        { provide: ClarinLicenseLabelDataService, useValue: clarinLicenseLabelDataService },
        { provide: PaginationService, useValue: paginationServiceStub },
        { provide: NotificationsService, useValue: notificationService },
        { provide: NgbActiveModal, useValue: modalStub },
        { provide: HostWindowService, useValue: new HostWindowServiceStub(0) },
        { provide: GroupDataService, useValue: groupsDataService },
        { provide: LinkHeadService, useValue: linkHeadService },
        { provide: ConfigurationDataService, useValue: configurationDataService },
        { provide: SearchConfigurationService, useValue: searchConfigurationServiceStub },
      ],
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ClarinLicenseTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    component = null;
    clarinLicenseLabelDataService = null;
    fixture.destroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize paginationOptions', () => {
    (component as ClarinLicenseTableComponent).ngOnInit();
    expect((component as ClarinLicenseTableComponent).options).toEqual(defaultPagination);
  });

  it('should onInit should initialize clarin license table data', () => {
    (component as ClarinLicenseTableComponent).ngOnInit();
    expect((component as any).clarinLicenseService.searchBy).toHaveBeenCalled();
    expect((component as ClarinLicenseTableComponent).licensesRD$).not.toBeNull();
  });

  it('should create new clarin license and reload the licenses table', () => {
    (component as ClarinLicenseTableComponent).defineNewLicense(mockLicense);
    expect((component as any).clarinLicenseService.create).toHaveBeenCalled();
    // notificate successful response
    expect((component as any).notificationService.success).toHaveBeenCalled();
    // load table data
    expect((component as any).clarinLicenseService.searchBy).toHaveBeenCalled();
    expect((component as ClarinLicenseTableComponent).licensesRD$).not.toBeNull();
  });

  it('should create new clarin license label when icon image is null', () => {
    // non extended ll has no icon
    (component as ClarinLicenseTableComponent).defineLicenseLabel(mockNonExtendedLicenseLabel);
    expect((component as any).notificationService.success).toHaveBeenCalled();
  });

  it('should create new clarin license label and load table data', fakeAsync(() => {
    // extended ll has icon
    (component as ClarinLicenseTableComponent).defineLicenseLabel(mockExtendedLicenseLabel);
    fixture.detectChanges();
    fixture.whenStable().then(() => {
      expect((component as any).clarinLicenseLabelService.create).toHaveBeenCalled();
      // notificate successful response
      expect((component as any).notificationService.success).toHaveBeenCalled();
      // load table data
      expect((component as any).clarinLicenseService.searchBy).toHaveBeenCalled();
      expect((component as ClarinLicenseTableComponent).licensesRD$).not.toBeNull();
    });
  }));

  it('should successful edit clarin license', () => {
    // some license must be selected
    (component as ClarinLicenseTableComponent).selectedLicense = mockLicense;
    // non extended ll has no icon
    (component as ClarinLicenseTableComponent).editLicense(mockLicense);
    expect((component as any).clarinLicenseService.put).toHaveBeenCalled();
    // notificate successful response
    expect((component as any).notificationService.success).toHaveBeenCalled();
    // load table data
    expect((component as any).clarinLicenseService.searchBy).toHaveBeenCalled();
    expect((component as ClarinLicenseTableComponent).licensesRD$).not.toBeNull();
  });

  describe('license delete button', () => {
    const getDeleteControls = () => {
      const actionsRow = fixture.debugElement.query(By.css('.mt-2'));
      const deleteWrapper = actionsRow.query(By.css('.btn-group.pr-1:last-child span'));
      const deleteButton = deleteWrapper.query(By.css('button.btn-danger'));
      return { deleteWrapper, deleteButton };
    };

    beforeEach(() => {
      (clarinLicenseDataService.delete as jasmine.Spy).calls.reset();
    });

    it('should disable delete button and expose tooltip when selected license has bitstreams', () => {
      component.selectedLicense = Object.assign({}, mockLicense, { bitstreams: 2 });
      fixture.detectChanges();

      const { deleteWrapper, deleteButton } = getDeleteControls();
      const deleteTooltip = deleteWrapper.injector.get(NgbTooltip);

      expect(deleteButton.attributes['aria-disabled']).toBe('true');
      expect(deleteButton.nativeElement.classList.contains('disabled')).toBeTrue();
      expect((deleteWrapper.nativeElement as HTMLElement).getAttribute('tabindex')).toBe('0');
      expect(deleteTooltip.ngbTooltip as string).toContain('clarin-license.button.delete-l');
    });

    it('should not call delete when clicking disabled delete button', () => {
      component.selectedLicense = Object.assign({}, mockLicense, { bitstreams: 1 });
      fixture.detectChanges();

      const { deleteButton } = getDeleteControls();
      deleteButton.nativeElement.click();

      expect((clarinLicenseDataService.delete as jasmine.Spy)).not.toHaveBeenCalled();
    });

    it('should enable delete button and call delete when selected license has no bitstreams', () => {
      component.selectedLicense = Object.assign({}, mockLicense, { bitstreams: 0 });
      fixture.detectChanges();

      const { deleteWrapper, deleteButton } = getDeleteControls();
      deleteButton.nativeElement.click();

      expect(deleteButton.attributes['aria-disabled']).toBe('false');
      expect(deleteButton.nativeElement.classList.contains('disabled')).toBeFalse();
      expect((deleteWrapper.nativeElement as HTMLElement).getAttribute('tabindex')).toBeNull();
      expect((clarinLicenseDataService.delete as jasmine.Spy)).toHaveBeenCalledWith(String(mockLicense.id));
    });
  });

  it('should reset pagination to page 1 when the search term changes', () => {
    paginationServiceStub.pagination.id = defaultPagination.id;
    paginationServiceStub.pagination.currentPage = 2;
    paginationServiceStub.pagination.pageSize = 10;
    paginationServiceStub.pagination.pageSizeOptions = defaultPagination.pageSizeOptions;
    (component as any).clarinLicenseService.searchBy.calls.reset();
    paginationServiceStub.resetPage.calls.reset();

    component.searchingLicenseName = 'Universal';

    component.searchLicenses();

    expect(paginationServiceStub.resetPage).toHaveBeenCalledWith(defaultPagination.id);
    expect((component as any).clarinLicenseService.searchBy).toHaveBeenCalledWith(
      'byNameLike',
      jasmine.objectContaining({
        currentPage: 1,
        elementsPerPage: 10,
      }),
      false
    );
  });

  it('should not reset pagination when searching with the same term', () => {
    paginationServiceStub.pagination.id = defaultPagination.id;
    paginationServiceStub.pagination.currentPage = 2;
    paginationServiceStub.pagination.pageSize = 10;
    paginationServiceStub.pagination.pageSizeOptions = defaultPagination.pageSizeOptions;
    (component as any).clarinLicenseService.searchBy.calls.reset();
    paginationServiceStub.resetPage.calls.reset();
    (component as any).previousSearchTerm = 'Universal';
    component.searchingLicenseName = 'Universal';

    component.searchLicenses();

    expect(paginationServiceStub.resetPage).not.toHaveBeenCalled();
    expect((component as any).clarinLicenseService.searchBy).toHaveBeenCalledWith(
      'byNameLike',
      jasmine.objectContaining({
        currentPage: 2,
        elementsPerPage: 10,
      }),
      false
    );
  });
});
