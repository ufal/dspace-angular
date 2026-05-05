import { ChangeDetectorRef, Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { UntypedFormGroup } from '@angular/forms';
import {
  DynamicCheckboxModel,
  DynamicFormControlModel,
  DynamicFormLayout,
  DynamicInputModel
} from '@ng-dynamic-forms/core';
import { TranslateService } from '@ngx-translate/core';
import { combineLatest as observableCombineLatest, Observable, of as observableOf, Subscription } from 'rxjs';
import { debounceTime, finalize, map, switchMap, take } from 'rxjs/operators';
import { PaginatedList } from '../../../core/data/paginated-list.model';
import { RemoteData } from '../../../core/data/remote-data';
import { RequestParam } from '../../../core/cache/models/request-param.model';
import { EPersonDataService } from '../../../core/eperson/eperson-data.service';
import { GroupDataService } from '../../../core/eperson/group-data.service';
import { EPerson } from '../../../core/eperson/models/eperson.model';
import { Group } from '../../../core/eperson/models/group.model';
import {
  getFirstCompletedRemoteData,
  getFirstSucceededRemoteData,
  getRemoteDataPayload
} from '../../../core/shared/operators';
import { hasValue } from '../../../shared/empty.util';
import { FormBuilderService } from '../../../shared/form/builder/form-builder.service';
import { NotificationsService } from '../../../shared/notifications/notifications.service';
import { PaginationComponentOptions } from '../../../shared/pagination/pagination-component-options.model';
import { AuthService } from '../../../core/auth/auth.service';
import { AuthorizationDataService } from '../../../core/data/feature-authorization/authorization-data.service';
import { FeatureID } from '../../../core/data/feature-authorization/feature-id';
import { ConfirmationModalComponent } from '../../../shared/confirmation-modal/confirmation-modal.component';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { FindListOptions } from '../../../core/data/find-list-options.model';
import { RequestService } from '../../../core/data/request.service';
import { NoContent } from '../../../core/shared/NoContent.model';
import { PaginationService } from '../../../core/pagination/pagination.service';
import { followLink } from '../../../shared/utils/follow-link-config.model';
import { ValidateEmailNotTaken } from './validators/email-taken.validator';
import { Registration } from '../../../core/shared/registration.model';
import { EpersonRegistrationService } from '../../../core/data/eperson-registration.service';
import { TYPE_REQUEST_FORGOT } from '../../../register-email-form/register-email-form.component';
import { DSONameService } from '../../../core/breadcrumbs/dso-name.service';
import { ActivatedRoute, Router } from '@angular/router';
import { getEPersonsRoute } from '../../access-control-routing-paths';
import { WorkspaceitemDataService } from '../../../core/submission/workspaceitem-data.service';
import { WorkflowItemDataService } from '../../../core/submission/workflowitem-data.service';
import { SearchService } from '../../../core/shared/search/search.service';
import { PaginatedSearchOptions } from '../../../shared/search/models/paginated-search-options.model';
import { DSpaceObject } from '../../../core/shared/dspace-object.model';
import { SearchObjects } from '../../../shared/search/models/search-objects.model';

@Component({
  selector: 'ds-eperson-form',
  templateUrl: './eperson-form.component.html',
})
/**
 * A form used for creating and editing EPeople
 */
export class EPersonFormComponent implements OnInit, OnDestroy {

  labelPrefix = 'admin.access-control.epeople.form.';
  selfDeleteWarningLabel = 'admin.access-control.epeople.notification.deleted.forbidden.self';

  currentAuthenticatedUserId: string;

  /**
   * A unique id used for ds-form
   */
  formId = 'eperson-form';

  /**
   * The labelPrefix for all messages related to this form
   */
  messagePrefix = 'admin.access-control.epeople.form';

  /**
   * Dynamic input models for the inputs of form
   */
  firstName: DynamicInputModel;
  lastName: DynamicInputModel;
  email: DynamicInputModel;
  // booleans
  canLogIn: DynamicCheckboxModel;
  requireCertificate: DynamicCheckboxModel;

  /**
   * A list of all dynamic input models
   */
  formModel: DynamicFormControlModel[];

  /**
   * Layout used for structuring the form inputs
   */
  formLayout: DynamicFormLayout = {
    firstName: {
      grid: {
        host: 'row'
      }
    },
    lastName: {
      grid: {
        host: 'row'
      }
    },
    email: {
      grid: {
        host: 'row'
      }
    },
    canLogIn: {
      grid: {
        host: 'col col-sm-6 d-inline-block'
      }
    },
    requireCertificate: {
      grid: {
        host: 'col col-sm-6 d-inline-block'
      }
    },
  };

  /**
   * A FormGroup that combines all inputs
   */
  formGroup: UntypedFormGroup;

  /**
   * An EventEmitter that's fired whenever the form is being submitted
   */
  @Output() submitForm: EventEmitter<any> = new EventEmitter();

  /**
   * An EventEmitter that's fired whenever the form is cancelled
   */
  @Output() cancelForm: EventEmitter<any> = new EventEmitter();

  /**
   * Observable whether or not the admin is allowed to reset the EPerson's password
   * TODO: Initialize the observable once the REST API supports this (currently hardcoded to return false)
   */
  canReset$: Observable<boolean>;

  /**
   * Observable whether or not the admin is allowed to delete the EPerson
   */
  canDelete$: Observable<boolean>;

  /**
   * Observable whether or not the admin is allowed to impersonate the EPerson
   */
  canImpersonate$: Observable<boolean>;

  /**
   * The current {@link EPerson}
   */
  activeEPerson$: Observable<EPerson>;

  /**
   * List of subscriptions
   */
  subs: Subscription[] = [];

  /**
   * A list of all the groups this EPerson is a member of
   */
  groups: Observable<RemoteData<PaginatedList<Group>>>;

  /**
   * Pagination config used to display the list of groups
   */
  config: PaginationComponentOptions = Object.assign(new PaginationComponentOptions(), {
    id: 'gem',
    pageSize: 5,
    currentPage: 1
  });

  /**
   * Try to retrieve initial active eperson, to fill in checkboxes at component creation
   */
  epersonInitial: EPerson;

  /**
   * Whether or not this EPerson is currently being impersonated
   */
  isImpersonated = false;

  /**
   * A boolean that indicate if to display EPersonForm's Rest password button
   */
  displayResetPassword = false;

  /**
   * A string that indicate the label of Submit button
   */
  submitLabel = 'form.create';
  /**
   * Subscription to email field value change
   */
  emailValueChangeSubscribe: Subscription;

  constructor(
    protected changeDetectorRef: ChangeDetectorRef,
    public epersonService: EPersonDataService,
    public groupsDataService: GroupDataService,
    private formBuilderService: FormBuilderService,
    private translateService: TranslateService,
    private notificationsService: NotificationsService,
    private authService: AuthService,
    private authorizationService: AuthorizationDataService,
    private modalService: NgbModal,
    private paginationService: PaginationService,
    private workspaceItemDataService: WorkspaceitemDataService,
    private workflowItemDataService: WorkflowItemDataService,
    private searchService: SearchService,
    public requestService: RequestService,
    private epersonRegistrationService: EpersonRegistrationService,
    public dsoNameService: DSONameService,
    protected route: ActivatedRoute,
    protected router: Router,
  ) {
  }

  ngOnInit() {
    this.activeEPerson$ = this.epersonService.getActiveEPerson();
    this.subs.push(this.authService.getAuthenticatedUserFromStore().subscribe((currentUser: EPerson) => {
      this.currentAuthenticatedUserId = currentUser?.id;
    }));
    this.subs.push(this.activeEPerson$.subscribe((eperson: EPerson) => {
      this.epersonInitial = eperson;
      if (hasValue(eperson)) {
        this.isImpersonated = this.authService.isImpersonatingUser(eperson.id);
        this.displayResetPassword = true;
        this.submitLabel = 'form.submit';
      }
    }));
    this.initialisePage();
  }

  /**
   * This method will initialise the page
   */
  initialisePage() {
    if (this.route.snapshot.params.id) {
      this.subs.push(this.epersonService.findById(this.route.snapshot.params.id).subscribe((ePersonRD: RemoteData<EPerson>) => {
        this.epersonService.editEPerson(ePersonRD.payload);
      }));
    }
    this.firstName = new DynamicInputModel({
      id: 'firstName',
      label: this.translateService.instant(`${this.messagePrefix}.firstName`),
      name: 'firstName',
      validators: {
        required: null,
      },
      required: true,
    });
    this.lastName = new DynamicInputModel({
      id: 'lastName',
      label: this.translateService.instant(`${this.messagePrefix}.lastName`),
      name: 'lastName',
      validators: {
        required: null,
      },
      required: true,
    });
    this.email = new DynamicInputModel({
      id: 'email',
      label: this.translateService.instant(`${this.messagePrefix}.email`),
      name: 'email',
      validators: {
        required: null,
        pattern: '^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,4}$',
      },
      required: true,
      errorMessages: {
        emailTaken: 'error.validation.emailTaken',
        pattern: 'error.validation.NotValidEmail'
      },
      hint: this.translateService.instant(`${this.messagePrefix}.emailHint`),
    });
    this.canLogIn = new DynamicCheckboxModel(
      {
        id: 'canLogIn',
        label: this.translateService.instant(`${this.messagePrefix}.canLogIn`),
        name: 'canLogIn',
        value: (this.epersonInitial != null ? this.epersonInitial.canLogIn : true)
      });
    this.requireCertificate = new DynamicCheckboxModel(
      {
        id: 'requireCertificate',
        label: this.translateService.instant(`${this.messagePrefix}.requireCertificate`),
        name: 'requireCertificate',
        value: (this.epersonInitial != null ? this.epersonInitial.requireCertificate : false)
      });
    this.formModel = [
      this.firstName,
      this.lastName,
      this.email,
      this.canLogIn,
      this.requireCertificate,
    ];
    this.formGroup = this.formBuilderService.createFormGroup(this.formModel);
    this.subs.push(this.activeEPerson$.subscribe((eperson: EPerson) => {
      if (eperson != null) {
        this.groups = this.groupsDataService.findListByHref(eperson._links.groups.href, {
          currentPage: 1,
          elementsPerPage: this.config.pageSize
        }, undefined, undefined, followLink('object'));
      }
      this.formGroup.patchValue({
        firstName: eperson != null ? eperson.firstMetadataValue('eperson.firstname') : '',
        lastName: eperson != null ? eperson.firstMetadataValue('eperson.lastname') : '',
        email: eperson != null ? eperson.email : '',
        canLogIn: eperson != null ? eperson.canLogIn : true,
        requireCertificate: eperson != null ? eperson.requireCertificate : false
      });

      if (eperson === null && !!this.formGroup.controls.email) {
        this.formGroup.controls.email.setAsyncValidators(ValidateEmailNotTaken.createValidator(this.epersonService));
        this.emailValueChangeSubscribe = this.email.valueChanges.pipe(debounceTime(300)).subscribe(() => {
          this.changeDetectorRef.detectChanges();
        });
      }
    }));

    this.groups = this.activeEPerson$.pipe(
      switchMap((eperson) => {
        return observableCombineLatest([observableOf(eperson), this.paginationService.getFindListOptions(this.config.id, {
          currentPage: 1,
          elementsPerPage: this.config.pageSize
        })]);
      }),
      switchMap(([eperson, findListOptions]) => {
        if (eperson != null) {
          return this.groupsDataService.findListByHref(eperson._links.groups.href, findListOptions, true, true, followLink('object'));
        }
        return observableOf(undefined);
      })
    );

    this.canImpersonate$ = this.activeEPerson$.pipe(
      switchMap((eperson) => {
        if (hasValue(eperson)) {
          return this.authorizationService.isAuthorized(FeatureID.LoginOnBehalfOf, eperson.self);
        } else {
          return observableOf(false);
        }
      })
    );
    this.canDelete$ = this.activeEPerson$.pipe(
      switchMap((eperson) => this.authorizationService.isAuthorized(FeatureID.CanDelete, hasValue(eperson) ? eperson.self : undefined))
    );
    this.canReset$ = observableOf(true);
  }

  private getDeleteAccess(): Observable<boolean> {
    return this.activeEPerson$.pipe(
      switchMap((eperson) => this.authorizationService.isAuthorized(FeatureID.CanDelete, hasValue(eperson) ? eperson.self : undefined))
    );
  }

  /**
   * Stop editing the currently selected eperson
   */
  onCancel() {
    this.epersonService.cancelEditEPerson();
    this.cancelForm.emit();
    void this.router.navigate([getEPersonsRoute()]);
  }

  /**
   * Submit the form
   * When the eperson has an id attached -> Edit the eperson
   * When the eperson has no id attached -> Create new eperson
   * Emit the updated/created eperson using the EventEmitter submitForm
   */
  onSubmit() {
    this.activeEPerson$.pipe(take(1)).subscribe(
      (ePerson: EPerson) => {
        const values = {
          metadata: {
            'eperson.firstname': [
              {
                value: this.firstName.value
              }
            ],
            'eperson.lastname': [
              {
                value: this.lastName.value
              },
            ],
          },
          email: this.email.value,
          canLogIn: this.canLogIn.value,
          requireCertificate: this.requireCertificate.value,
        };
        if (ePerson == null) {
          this.createNewEPerson(values);
        } else {
          this.editEPerson(ePerson, values);
        }
      }
    );
  }

  /**
   * Creates new EPerson based on given values from form
   * @param values
   */
  createNewEPerson(values) {
    const ePersonToCreate = Object.assign(new EPerson(), values);

    const response = this.epersonService.create(ePersonToCreate);
    response.pipe(
      getFirstCompletedRemoteData()
    ).subscribe((rd: RemoteData<EPerson>) => {
      if (rd.hasSucceeded) {
        this.notificationsService.success(this.translateService.get(this.labelPrefix + 'notification.created.success', { name: this.dsoNameService.getName(ePersonToCreate) }));
        this.submitForm.emit(ePersonToCreate);
        this.epersonService.clearEPersonRequests();
        void this.router.navigateByUrl(getEPersonsRoute());
      } else {
        this.notificationsService.error(this.translateService.get(this.labelPrefix + 'notification.created.failure', { name: this.dsoNameService.getName(ePersonToCreate) }));
        this.cancelForm.emit();
      }
    });
    this.showNotificationIfEmailInUse(ePersonToCreate, 'created');
  }

  /**
   * Edits existing EPerson based on given values from form and old EPerson
   * @param ePerson   ePerson to edit
   * @param values    new ePerson values (of form)
   */
  editEPerson(ePerson: EPerson, values) {
    const editedEperson = Object.assign(new EPerson(), {
      id: ePerson.id,
      metadata: {
        'eperson.firstname': [
          {
            value: (this.firstName.value ? this.firstName.value : ePerson.firstMetadataValue('eperson.firstname'))
          }
        ],
        'eperson.lastname': [
          {
            value: (this.lastName.value ? this.lastName.value : ePerson.firstMetadataValue('eperson.lastname'))
          },
        ],
      },
      email: (hasValue(values.email) ? values.email : ePerson.email),
      canLogIn: (hasValue(values.canLogIn) ? values.canLogIn : ePerson.canLogIn),
      requireCertificate: (hasValue(values.requireCertificate) ? values.requireCertificate : ePerson.requireCertificate),
      _links: ePerson._links,
    });

    const response = this.epersonService.updateEPerson(editedEperson);
    response.pipe(getFirstCompletedRemoteData()).subscribe((rd: RemoteData<EPerson>) => {
      if (rd.hasSucceeded) {
        this.notificationsService.success(this.translateService.get(this.labelPrefix + 'notification.edited.success', { name: this.dsoNameService.getName(editedEperson) }));
        this.submitForm.emit(editedEperson);
        void this.router.navigateByUrl(getEPersonsRoute());
      } else {
        this.notificationsService.error(this.translateService.get(this.labelPrefix + 'notification.edited.failure', { name: this.dsoNameService.getName(editedEperson) }));
        this.cancelForm.emit();
      }
    });

    if (values.email != null && values.email !== ePerson.email) {
      this.showNotificationIfEmailInUse(editedEperson, 'edited');
    }
  }

  /**
   * Event triggered when the user changes page
   * @param event
   */
  onPageChange(event) {
    this.updateGroups({
      currentPage: event,
      elementsPerPage: this.config.pageSize
    });
  }

  /**
   * Start impersonating the EPerson
   */
  impersonate() {
    this.authService.impersonate(this.epersonInitial.id);
    this.isImpersonated = true;
  }

  /**
   * Deletes the EPerson from the Repository. The EPerson will be the only that this form is showing.
   * It'll either show a success or error message depending on whether the delete was successful or not.
   */
  delete(): void {
    this.activeEPerson$.pipe(
      take(1),
      switchMap((eperson: EPerson) => {
        if (!hasValue(eperson?.id)) {
          return observableOf(null);
        }

        if (!hasValue(this.currentAuthenticatedUserId)) {
          return observableOf(null);
        }

        if (this.isCurrentUser(eperson)) {
          this.showSelfDeleteNotification();
          return observableOf(null);
        }

        return this.getDeleteWarningLabel(eperson).pipe(
          take(1),
          switchMap((warningLabel: string | undefined) => {
            const modalRef = this.modalService.open(ConfirmationModalComponent);
            modalRef.componentInstance.dso = eperson;
            modalRef.componentInstance.headerLabel = 'confirmation-modal.delete-eperson.header';
            modalRef.componentInstance.infoLabel = 'confirmation-modal.delete-eperson.info';
            modalRef.componentInstance.warningLabel = warningLabel;
            modalRef.componentInstance.cancelLabel = 'confirmation-modal.delete-eperson.cancel';
            modalRef.componentInstance.confirmLabel = 'confirmation-modal.delete-eperson.confirm';
            modalRef.componentInstance.brandColor = 'danger';
            modalRef.componentInstance.confirmIcon = 'fas fa-trash';

            return modalRef.componentInstance.response.pipe(
              take(1),
              switchMap((confirm: boolean) => {
                if (confirm) {
                  this.canDelete$ = observableOf(false);
                  return this.epersonService.deleteEPerson(eperson).pipe(
                    getFirstCompletedRemoteData(),
                    map((restResponse: RemoteData<NoContent>) => ({ restResponse, eperson, attempted: true }))
                  );
                }

                return observableOf({ restResponse: null, eperson, attempted: false });
              }),
              finalize(() => this.canDelete$ = this.getDeleteAccess())
            );
          })
        );
      })
    ).subscribe((result: { restResponse: RemoteData<NoContent> | null, eperson: EPerson, attempted: boolean } | null) => {
      if (!result?.attempted) {
        return;
      }

      const { restResponse, eperson } = result;
      if (restResponse?.hasSucceeded) {
        this.notificationsService.success(this.translateService.get(this.labelPrefix + 'notification.deleted.success', { name: this.dsoNameService.getName(eperson) }));
        void this.router.navigate([getEPersonsRoute()]);
      } else if (this.isSelfDeletionError(restResponse)) {
        this.showSelfDeleteNotification();
      } else {
        this.notificationsService.error(this.translateService.get(this.labelPrefix + 'notification.deleted.failure', {
          name: this.dsoNameService.getName(eperson),
          id: eperson?.id,
          statusCode: restResponse?.statusCode,
          errorMessage: restResponse?.errorMessage,
          restResponse,
        }));
      }
      this.cancelForm.emit();
    });
  }

  isCurrentUser(ePerson: EPerson): boolean {
    return hasValue(ePerson?.id) && ePerson.id === this.currentAuthenticatedUserId;
  }

  private getDeleteWarningLabel(ePerson: EPerson): Observable<string | undefined> {
    return observableCombineLatest([
      this.hasSubmittedItems(ePerson.id),
      this.isAdministrator(ePerson),
    ]).pipe(
      map(([hasSubmittedItems, isAdmin]: [boolean, boolean]) => {
        if (hasSubmittedItems && isAdmin) {
          return 'admin.access-control.epeople.delete.warning.submitterAndAdmin';
        }
        if (hasSubmittedItems) {
          return 'admin.access-control.epeople.delete.warning.submitter';
        }
        if (isAdmin) {
          return 'admin.access-control.epeople.delete.warning.admin';
        }
        return undefined;
      })
    );
  }

  private hasSubmittedItems(epersonId: string): Observable<boolean> {
    const submitterSearchOptions = Object.assign(new FindListOptions(), {
      currentPage: 1,
      elementsPerPage: 1,
      searchParams: [new RequestParam('uuid', epersonId)],
    });
    const archivedSearchOptions = new PaginatedSearchOptions({
      query: `submitter_authority:${epersonId}`,
      pagination: Object.assign(new PaginationComponentOptions(), {
        currentPage: 1,
        pageSize: 1,
      }),
    });

    return observableCombineLatest([
      this.workspaceItemDataService.searchBy('findBySubmitter', submitterSearchOptions).pipe(
        getFirstCompletedRemoteData(),
        map((rd: RemoteData<PaginatedList<any>>) => rd.hasSucceeded && rd.payload.totalElements > 0),
      ),
      this.workflowItemDataService.searchBy('findBySubmitter', submitterSearchOptions).pipe(
        getFirstCompletedRemoteData(),
        map((rd: RemoteData<PaginatedList<any>>) => rd.hasSucceeded && rd.payload.totalElements > 0),
      ),
      this.searchService.search<DSpaceObject>(archivedSearchOptions).pipe(
        getFirstCompletedRemoteData(),
        map((rd: RemoteData<SearchObjects<DSpaceObject>>) => rd.hasSucceeded && rd.payload.totalElements > 0),
      ),
    ]).pipe(
      map((results: boolean[]) => results.some(Boolean))
    );
  }

  private isAdministrator(ePerson: EPerson): Observable<boolean> {
    const options = Object.assign(new FindListOptions(), {
      currentPage: 1,
      elementsPerPage: 100,
    });

    return this.groupsDataService.findListByHref(ePerson._links.groups.href, options).pipe(
      getFirstCompletedRemoteData(),
      map((rd: RemoteData<PaginatedList<Group>>) => rd.hasSucceeded && rd.payload.page.some((group: Group) => group.name?.toLowerCase() === 'administrator')),
    );
  }

  private isSelfDeletionError(restResponse: RemoteData<NoContent> | null): boolean {
    return restResponse?.statusCode === 400 && restResponse?.errorMessage?.toLowerCase().includes('cannot delete yourself');
  }

  private showSelfDeleteNotification(): void {
    this.notificationsService.error(this.translateService.get(this.selfDeleteWarningLabel));
  }

  /**
   * Stop impersonating the EPerson
   */
  stopImpersonating() {
    this.authService.stopImpersonatingAndRefresh();
    this.isImpersonated = false;
  }

  /**
   * Sends an email to current eperson address with the information
   * to reset password
   */
  resetPassword() {
    if (hasValue(this.epersonInitial.email)) {
      this.epersonRegistrationService.registerEmail(this.epersonInitial.email, null, TYPE_REQUEST_FORGOT).pipe(getFirstCompletedRemoteData())
        .subscribe((response: RemoteData<Registration>) => {
            if (response.hasSucceeded) {
              this.notificationsService.success(this.translateService.get('admin.access-control.epeople.actions.reset'),
                this.translateService.get('forgot-email.form.success.content', {email: this.epersonInitial.email}));
            } else {
              this.notificationsService.error(this.translateService.get('forgot-email.form.error.head'),
                this.translateService.get('forgot-email.form.error.content', {email: this.epersonInitial.email}));
            }
          }
        );
    }
  }

  /**
   * Cancel the current edit when component is destroyed & unsub all subscriptions
   */
  ngOnDestroy(): void {
    this.subs.filter((sub) => hasValue(sub)).forEach((sub) => sub.unsubscribe());
    this.paginationService.clearPagination(this.config.id);
    if (hasValue(this.emailValueChangeSubscribe)) {
      this.emailValueChangeSubscribe.unsubscribe();
    }
  }

  /**
   * Checks for the given ePerson if there is already an ePerson in the system with that email
   * and shows notification if this is the case
   * @param ePerson               ePerson values to check
   * @param notificationSection   whether in create or edit
   */
  private showNotificationIfEmailInUse(ePerson: EPerson, notificationSection: string) {
    // Relevant message for email in use
    this.subs.push(this.epersonService.searchByScope('email', ePerson.email, {
      currentPage: 1,
      elementsPerPage: 0
    }).pipe(getFirstSucceededRemoteData(), getRemoteDataPayload())
      .subscribe((list: PaginatedList<EPerson>) => {
        if (list.totalElements > 0) {
          this.notificationsService.error(this.translateService.get(this.labelPrefix + 'notification.' + notificationSection + '.failure.emailInUse', {
            name: this.dsoNameService.getName(ePerson),
            email: ePerson.email
          }));
        }
      }));
  }

  /**
   * Update the list of groups by fetching it from the rest api or cache
   */
  private updateGroups(options) {
    this.subs.push(this.activeEPerson$.subscribe((eperson: EPerson) => {
      this.groups = this.groupsDataService.findListByHref(eperson._links.groups.href, options);
    }));
  }
}
