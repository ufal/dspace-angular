import { Component, OnDestroy, OnInit } from '@angular/core';
import { UntypedFormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, combineLatest, Observable, of as observableOf, Subscription } from 'rxjs';
import { catchError, map, switchMap, take } from 'rxjs/operators';
import { AuthService } from '../../core/auth/auth.service';
import { RequestParam } from '../../core/cache/models/request-param.model';
import { buildPaginatedList, PaginatedList } from '../../core/data/paginated-list.model';
import { RemoteData } from '../../core/data/remote-data';
import { EPersonDataService } from '../../core/eperson/eperson-data.service';
import { EPerson } from '../../core/eperson/models/eperson.model';
import { GroupDataService } from '../../core/eperson/group-data.service';
import { Group } from '../../core/eperson/models/group.model';
import { hasValue } from '../../shared/empty.util';
import { NotificationsService } from '../../shared/notifications/notifications.service';
import { PaginationComponentOptions } from '../../shared/pagination/pagination-component-options.model';
import { EpersonDtoModel } from '../../core/eperson/models/eperson-dto.model';
import { FeatureID } from '../../core/data/feature-authorization/feature-id';
import { AuthorizationDataService } from '../../core/data/feature-authorization/authorization-data.service';
import { getAllSucceededRemoteData, getFirstCompletedRemoteData } from '../../core/shared/operators';
import { ConfirmationModalComponent } from '../../shared/confirmation-modal/confirmation-modal.component';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { FindListOptions } from '../../core/data/find-list-options.model';
import { RequestService } from '../../core/data/request.service';
import { PageInfo } from '../../core/shared/page-info.model';
import { NoContent } from '../../core/shared/NoContent.model';
import { PaginationService } from '../../core/pagination/pagination.service';
import { DSONameService } from '../../core/breadcrumbs/dso-name.service';
import { WorkspaceitemDataService } from '../../core/submission/workspaceitem-data.service';
import { WorkflowItemDataService } from '../../core/submission/workflowitem-data.service';
import { getEPersonEditRoute, getEPersonsRoute } from '../access-control-routing-paths';
import { SearchService } from '../../core/shared/search/search.service';
import { PaginatedSearchOptions } from '../../shared/search/models/paginated-search-options.model';
import { DSpaceObject } from '../../core/shared/dspace-object.model';
import { SearchObjects } from '../../shared/search/models/search-objects.model';

@Component({
  selector: 'ds-epeople-registry',
  templateUrl: './epeople-registry.component.html',
})
/**
 * A component used for managing all existing epeople within the repository.
 * The admin can create, edit or delete epeople here.
 */
export class EPeopleRegistryComponent implements OnInit, OnDestroy {

  labelPrefix = 'admin.access-control.epeople.';
  selfDeleteWarningLabel = this.labelPrefix + 'notification.deleted.forbidden.self';

  currentAuthenticatedUserId: string;

  /**
   * A list of all the current EPeople within the repository or the result of the search
   */
  ePeople$: BehaviorSubject<PaginatedList<EPerson>> = new BehaviorSubject(buildPaginatedList<EPerson>(new PageInfo(), []));
  /**
   * A BehaviorSubject with the list of EpersonDtoModel objects made from the EPeople in the repository or
   * as the result of the search
   */
  ePeopleDto$: BehaviorSubject<PaginatedList<EpersonDtoModel>> = new BehaviorSubject<PaginatedList<EpersonDtoModel>>({} as any);

  activeEPerson$: Observable<EPerson>;

  /**
   * An observable for the pageInfo, needed to pass to the pagination component
   */
  pageInfoState$: BehaviorSubject<PageInfo> = new BehaviorSubject<PageInfo>(undefined);

  /**
   * A boolean representing if a search is pending
   */
  searching$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  /**
   * Pagination config used to display the list of epeople
   */
  config: PaginationComponentOptions = Object.assign(new PaginationComponentOptions(), {
    id: 'elp',
    pageSize: 5,
    currentPage: 1
  });

  // The search form
  searchForm;

  // Current search in epersons registry
  currentSearchQuery: string;
  currentSearchScope: string;

  /**
   * FindListOptions
   */
  findListOptionsSub: Subscription;

  /**
   * List of subscriptions
   */
  subs: Subscription[] = [];

  /**
   * Date format used for ePerson lastActive table column
   */
  dateFormat = 'yyyy-MM-dd HH:mm:ss';

  constructor(private epersonService: EPersonDataService,
              private translateService: TranslateService,
              private notificationsService: NotificationsService,
              private authorizationService: AuthorizationDataService,
              private authService: AuthService,
              private groupDataService: GroupDataService,
              private formBuilder: UntypedFormBuilder,
              private router: Router,
              private modalService: NgbModal,
              private paginationService: PaginationService,
              private workspaceItemDataService: WorkspaceitemDataService,
              private workflowItemDataService: WorkflowItemDataService,
              private searchService: SearchService,
              public requestService: RequestService,
              public dsoNameService: DSONameService,
  ) {
    this.currentSearchQuery = '';
    this.currentSearchScope = 'metadata';
    this.searchForm = this.formBuilder.group(({
      scope: 'metadata',
      query: '',
    }));
  }

  ngOnInit() {
    this.initialisePage();
  }

  /**
   * This method will initialise the page
   */
  initialisePage() {
    this.searching$.next(true);
    this.search({scope: this.currentSearchScope, query: this.currentSearchQuery});
    this.activeEPerson$ = this.epersonService.getActiveEPerson();
    this.subs.push(this.authService.getAuthenticatedUserFromStore().subscribe((currentUser: EPerson) => {
      this.currentAuthenticatedUserId = currentUser?.id;
    }));
    this.subs.push(this.ePeople$.pipe(
      switchMap((epeople: PaginatedList<EPerson>) => {
        if (epeople.pageInfo.totalElements > 0) {
          return combineLatest(epeople.page.map((eperson: EPerson) => {
            return this.authorizationService.isAuthorized(FeatureID.CanDelete, hasValue(eperson) ? eperson.self : undefined).pipe(
              map((authorized) => {
                const epersonDtoModel: EpersonDtoModel = new EpersonDtoModel();
                epersonDtoModel.ableToDelete = authorized;
                epersonDtoModel.eperson = eperson;
                return epersonDtoModel;
              })
            );
          })).pipe(map((dtos: EpersonDtoModel[]) => {
            return buildPaginatedList(epeople.pageInfo, dtos);
          }));
        } else {
          return observableOf(buildPaginatedList(epeople.pageInfo, []));
        }
      })).subscribe((value: PaginatedList<EpersonDtoModel>) => {
      this.searching$.next(false);this.ePeopleDto$.next(value);
      this.pageInfoState$.next(value.pageInfo);
    }));
  }

  /**
   * Search in the EPeople by metadata (default) or email
   * @param data  Contains scope and query param
   */
  search(data: any) {
    this.searching$.next(true);
    if (hasValue(this.findListOptionsSub)) {
      this.findListOptionsSub.unsubscribe();
    }
    this.findListOptionsSub = this.paginationService.getCurrentPagination(this.config.id, this.config).pipe(
      switchMap((findListOptions) => {
          const query: string = data.query;
          const scope: string = data.scope;
          if (query != null && this.currentSearchQuery !== query) {
            void this.router.navigate([getEPersonsRoute()], {
              queryParamsHandling: 'merge'
            });
            this.currentSearchQuery = query;
            this.paginationService.resetPage(this.config.id);
          }
          if (scope != null && this.currentSearchScope !== scope) {
            void this.router.navigate([getEPersonsRoute()], {
              queryParamsHandling: 'merge'
            });
            this.currentSearchScope = scope;
            this.paginationService.resetPage(this.config.id);

          }
          return this.epersonService.searchByScope(this.currentSearchScope, this.currentSearchQuery, {
            currentPage: findListOptions.currentPage,
            elementsPerPage: findListOptions.pageSize
          });
        }
      ),
      getAllSucceededRemoteData(),
    ).subscribe((peopleRD) => {
        this.ePeople$.next(peopleRD.payload);
        this.pageInfoState$.next(peopleRD.payload.pageInfo);
      }
    );
  }

  /**
   * Deletes EPerson, show notification on success/failure & updates EPeople list
   */
  deleteEPerson(ePerson: EPerson) {
    if (hasValue(ePerson.id)) {
      if (!hasValue(this.currentAuthenticatedUserId)) {
        return;
      }

      if (this.isCurrentUser(ePerson)) {
        this.showSelfDeleteNotification();
        return;
      }

      this.getDeleteWarningLabel(ePerson).pipe(take(1)).subscribe((warningLabel: string | undefined) => {
        const modalRef = this.modalService.open(ConfirmationModalComponent);
        modalRef.componentInstance.dso = ePerson;
        modalRef.componentInstance.headerLabel = 'confirmation-modal.delete-eperson.header';
        modalRef.componentInstance.infoLabel = 'confirmation-modal.delete-eperson.info';
        modalRef.componentInstance.warningLabel = warningLabel;
        modalRef.componentInstance.cancelLabel = 'confirmation-modal.delete-eperson.cancel';
        modalRef.componentInstance.confirmLabel = 'confirmation-modal.delete-eperson.confirm';
        modalRef.componentInstance.brandColor = 'danger';
        modalRef.componentInstance.confirmIcon = 'fas fa-trash';
        modalRef.componentInstance.response.pipe(take(1)).subscribe((confirm: boolean) => {
          if (confirm) {
            this.epersonService.deleteEPerson(ePerson).pipe(getFirstCompletedRemoteData()).subscribe((restResponse: RemoteData<NoContent>) => {
              if (restResponse.hasSucceeded) {
                this.notificationsService.success(this.translateService.get(this.labelPrefix + 'notification.deleted.success', {name: this.dsoNameService.getName(ePerson)}));
              } else if (this.isSelfDeletionError(restResponse)) {
                this.showSelfDeleteNotification();
              } else {
                this.notificationsService.error(this.translateService.get(this.labelPrefix + 'notification.deleted.failure', {
                  id: ePerson.id,
                  statusCode: restResponse.statusCode,
                  errorMessage: restResponse.errorMessage,
                  restResponse,
                }));
              }
            });
          }
        });
      });
    }
  }

  isCurrentUser(ePerson: EPerson): boolean {
    return hasValue(ePerson?.id) && ePerson.id === this.currentAuthenticatedUserId;
  }

  private getDeleteWarningLabel(ePerson: EPerson): Observable<string | undefined> {
    return combineLatest([
      this.hasSubmittedItems(ePerson.id),
      this.isAdministrator(ePerson),
    ]).pipe(
      map(([hasSubmittedItems, isAdmin]: [boolean, boolean]) => {
        if (hasSubmittedItems && isAdmin) {
          return this.labelPrefix + 'delete.warning.submitterAndAdmin';
        }
        if (hasSubmittedItems) {
          return this.labelPrefix + 'delete.warning.submitter';
        }
        if (isAdmin) {
          return this.labelPrefix + 'delete.warning.admin';
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

    return combineLatest([
      this.workspaceItemDataService.searchBy('findBySubmitter', submitterSearchOptions).pipe(
        getFirstCompletedRemoteData(),
        map((rd: RemoteData<PaginatedList<any>>) => rd.hasSucceeded && rd.payload.totalElements > 0),
        catchError(() => observableOf(false))
      ),
      this.workflowItemDataService.searchBy('findBySubmitter', submitterSearchOptions).pipe(
        getFirstCompletedRemoteData(),
        map((rd: RemoteData<PaginatedList<any>>) => rd.hasSucceeded && rd.payload.totalElements > 0),
        catchError(() => observableOf(false))
      ),
      this.searchService.search<DSpaceObject>(archivedSearchOptions).pipe(
        getFirstCompletedRemoteData(),
        map((rd: RemoteData<SearchObjects<DSpaceObject>>) => rd.hasSucceeded && rd.payload.totalElements > 0),
        catchError(() => observableOf(false))
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

    return this.groupDataService.findListByHref(ePerson._links.groups.href, options).pipe(
      getFirstCompletedRemoteData(),
      map((rd: RemoteData<PaginatedList<Group>>) => rd.hasSucceeded && rd.payload.page.some((group: Group) => group.name?.toLowerCase() === 'administrator')),
      catchError(() => observableOf(false))
    );
  }

  private isSelfDeletionError(restResponse: RemoteData<NoContent>): boolean {
    return restResponse?.statusCode === 400 && restResponse?.errorMessage?.toLowerCase().includes('cannot delete yourself');
  }

  private showSelfDeleteNotification(): void {
    this.notificationsService.error(this.translateService.get(this.selfDeleteWarningLabel));
  }

  /**
   * Unsub all subscriptions
   */
  ngOnDestroy(): void {
    this.cleanupSubscribes();
    this.paginationService.clearPagination(this.config.id);
  }


  cleanupSubscribes() {
    this.subs.filter((sub) => hasValue(sub)).forEach((sub) => sub.unsubscribe());
  }

  /**
   * Reset all input-fields to be empty and search all search
   */
  clearFormAndResetResult() {
    this.searchForm.patchValue({
      query: '',
    });
    this.search({query: ''});
  }

  getEditEPeoplePage(id: string): string {
    return getEPersonEditRoute(id);
  }
}
