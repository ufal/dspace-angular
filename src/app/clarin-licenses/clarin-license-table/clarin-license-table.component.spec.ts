import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ClarinLicenseTableComponent } from './clarin-license-table.component';
import { NotificationsServiceStub } from '../../shared/testing/notifications-service.stub';
import { ClarinLicenseDataService } from '../../core/data/clarin/clarin-license-data.service';
import { RequestService } from '../../core/data/request.service';
import { EventEmitter } from '@angular/core';
import { of as observableOf, throwError } from 'rxjs';
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
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { HostWindowService } from '../../shared/host-window.service';
import { HostWindowServiceStub } from '../../shared/testing/host-window-service.stub';
import {
  createdLicenseLabelRD$,
  createdLicenseRD$,
  mockExtendedLicenseLabel,
  mockLicenseLabelListRD$,
  mockLicense, mockLicenseRD$,
  mockNonExtendedLicenseLabel, successfulResponse
} from '../../shared/testing/clarin-license-mock';
import {GroupDataService} from '../../core/eperson/group-data.service';
import {createSuccessfulRemoteDataObject$} from '../../shared/remote-data.utils';
import { createFailedRemoteDataObject$, createNoContentRemoteDataObject$ } from '../../shared/remote-data.utils';
import {createPaginatedList} from '../../shared/testing/utils.test';
import {LinkHeadService} from '../../core/services/link-head.service';
import {ConfigurationDataService} from '../../core/data/configuration-data.service';
import {ConfigurationProperty} from '../../core/shared/configuration-property.model';
import {SearchConfigurationService} from '../../core/shared/search/search-configuration.service';
import { DefineLicenseLabelFormComponent } from './modal/define-license-label-form/define-license-label-form.component';
import { ConfirmationModalComponent } from '../../shared/confirmation-modal/confirmation-modal.component';

describe('ClarinLicenseTableComponent', () => {
  let component: ClarinLicenseTableComponent;
  let fixture: ComponentFixture<ClarinLicenseTableComponent>;

  let clarinLicenseDataService: ClarinLicenseDataService;
  let clarinLicenseLabelDataService: ClarinLicenseLabelDataService;
  let requestService: RequestService;
  let notificationService: NotificationsServiceStub;
  let activeModalStub: NgbActiveModal;
  let modalServiceStub: jasmine.SpyObj<NgbModal>;
  let groupsDataService: GroupDataService;
  let service: ConfigurationDataService;
  let searchConfigurationServiceStub: SearchConfigurationService;
  let labelEditModalRef: any;
  let labelDeleteModalRef: any;

  beforeEach(async () => {
    notificationService = new NotificationsServiceStub();
    clarinLicenseDataService = jasmine.createSpyObj('clarinLicenseService', {
      findAll: mockLicenseRD$,
      create: createdLicenseRD$,
      put: createdLicenseRD$,
      searchBy: mockLicenseRD$,
      getLinkPath: observableOf('')
    });
    clarinLicenseLabelDataService = jasmine.createSpyObj('clarinLicenseLabelService', {
      create: createdLicenseLabelRD$,
      findAll: mockLicenseLabelListRD$,
      put: createdLicenseLabelRD$,
      delete: observableOf({ hasSucceeded: true })
    });
    requestService = jasmine.createSpyObj('requestService', {
      send: observableOf('response'),
      getByUUID: observableOf(successfulResponse),
      generateRequestId: observableOf('123456'),
    });
    activeModalStub = jasmine.createSpyObj('activeModal', ['close', 'open']);
    modalServiceStub = jasmine.createSpyObj('modalService', ['open']);
    labelEditModalRef = {
      componentInstance: {},
      result: Promise.resolve(null)
    };
    labelDeleteModalRef = {
      componentInstance: {
        response: new EventEmitter<boolean>()
      }
    };
    modalServiceStub.open.and.callFake((modalComponent) => {
      if (modalComponent === DefineLicenseLabelFormComponent) {
        return labelEditModalRef;
      }
      if (modalComponent === ConfirmationModalComponent) {
        return labelDeleteModalRef;
      }
      return { componentInstance: {}, result: Promise.resolve(null) } as any;
    });
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
        { provide: PaginationService, useValue: new PaginationServiceStub() },
        { provide: NotificationsService, useValue: notificationService },
        { provide: NgbActiveModal, useValue: activeModalStub },
        { provide: NgbModal, useValue: modalServiceStub },
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

  describe('label edit flow', () => {
    beforeEach(() => {
      notificationService.success.calls.reset();
      notificationService.error.calls.reset();
      (clarinLicenseLabelDataService.put as jasmine.Spy).calls.reset();
    });

    it('should open edit modal with the selected label when editLabel is called', () => {
      component.editLabel(mockExtendedLicenseLabel);

      expect(modalServiceStub.open).toHaveBeenCalledWith(DefineLicenseLabelFormComponent);
      expect(labelEditModalRef.componentInstance.clarinLicenseLabel).toBe(mockExtendedLicenseLabel);
    });

    it('should call clarinLicenseLabelService.put with updated label on modal submit', fakeAsync(() => {
      const refreshSpy = spyOn(component, 'refreshLabels').and.stub();
      const reloadLicensesSpy = spyOn(component, 'loadAllLicenses').and.stub();
      labelEditModalRef.result = Promise.resolve({
        label: 'EDIT',
        title: 'Edited title',
        extended: false
      });

      component.editLabel(mockExtendedLicenseLabel);
      tick();

      expect((clarinLicenseLabelDataService.put as jasmine.Spy)).toHaveBeenCalled();
      const putArgument = (clarinLicenseLabelDataService.put as jasmine.Spy).calls.mostRecent().args[0];
      expect(putArgument.id).toBe(mockExtendedLicenseLabel.id);
      expect(putArgument._links).toEqual(mockExtendedLicenseLabel._links);
      expect(putArgument.label).toBe('EDIT');
      expect(putArgument.title).toBe('Edited title');
      expect(putArgument.extended).toBeFalse();
      expect(notificationService.success).toHaveBeenCalled();
      expect(refreshSpy).toHaveBeenCalled();
      expect(reloadLicensesSpy).toHaveBeenCalled();
    }));

    it('should show error notification on failed edit', fakeAsync(() => {
      spyOn(component, 'refreshLabels').and.stub();
      (clarinLicenseLabelDataService.put as jasmine.Spy).and.returnValue(createFailedRemoteDataObject$('put failed', 500));

      component.editLicenseLabel({
        label: 'ERR',
        title: 'Failed title',
        extended: true
      }, mockExtendedLicenseLabel);
      tick();

      expect(notificationService.error).toHaveBeenCalled();
    }));
  });

  describe('label delete flow', () => {
    beforeEach(() => {
      notificationService.success.calls.reset();
      notificationService.error.calls.reset();
      (clarinLicenseLabelDataService.delete as jasmine.Spy).calls.reset();
      labelDeleteModalRef.componentInstance.response = new EventEmitter<boolean>();
    });

    it('should open confirmation modal when confirmDeleteLabel is called', () => {
      component.confirmDeleteLabel(mockNonExtendedLicenseLabel);

      expect(modalServiceStub.open).toHaveBeenCalledWith(ConfirmationModalComponent);
      expect(labelDeleteModalRef.componentInstance.headerLabel).toBe('clarin.license.label.delete.confirm.title');
      expect(labelDeleteModalRef.componentInstance.infoLabel).toBe('clarin.license.label.delete.confirm.message');
      expect(labelDeleteModalRef.componentInstance.dso.name).toBe(mockNonExtendedLicenseLabel.label);
    });

    it('should call clarinLicenseLabelService.delete with correct id on confirmation', fakeAsync(() => {
      const refreshSpy = spyOn(component, 'refreshLabels').and.stub();
      const reloadLicensesSpy = spyOn(component, 'loadAllLicenses').and.stub();
      (clarinLicenseLabelDataService.delete as jasmine.Spy).and.returnValue(createNoContentRemoteDataObject$());

      component.confirmDeleteLabel(mockNonExtendedLicenseLabel);
      labelDeleteModalRef.componentInstance.response.emit(true);
      tick();

      expect((clarinLicenseLabelDataService.delete as jasmine.Spy)).toHaveBeenCalledWith(String(mockNonExtendedLicenseLabel.id));
      expect(notificationService.success).toHaveBeenCalled();
      expect(refreshSpy).toHaveBeenCalled();
      expect(reloadLicensesSpy).toHaveBeenCalled();
    }));

    it('should show error notification on failed delete', () => {
      spyOn(component, 'refreshLabels').and.stub();
      (clarinLicenseLabelDataService.delete as jasmine.Spy).and.returnValue(throwError(() => new Error('delete failed')));

      component.confirmDeleteLabel(mockNonExtendedLicenseLabel);
      labelDeleteModalRef.componentInstance.response.emit(true);

      expect(notificationService.error).toHaveBeenCalled();
    });

    it('should not call delete service when confirmation is cancelled', () => {
      component.confirmDeleteLabel(mockNonExtendedLicenseLabel);
      labelDeleteModalRef.componentInstance.response.emit(false);

      expect((clarinLicenseLabelDataService.delete as jasmine.Spy)).not.toHaveBeenCalled();
    });
  });

  describe('label row actions', () => {
    it('should render edit and delete buttons for each label row', () => {
      fixture.detectChanges();

      const firstRowButtons = fixture.debugElement.queryAll(By.css('.labels-section tbody tr'))[0]
        .queryAll(By.css('button'));

      expect(firstRowButtons.length).toBe(2);
      expect((firstRowButtons[0].nativeElement as HTMLButtonElement).disabled).toBeFalse();
      expect((firstRowButtons[1].nativeElement as HTMLButtonElement).disabled).toBeFalse();
    });
  });
});
