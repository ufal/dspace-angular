import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';
import { SortOptions } from 'src/app/core/cache/models/sort-options.model';
import { EpicHandleDataService } from 'src/app/core/data/epic-handle-data.service';
import { NotificationsService } from 'src/app/shared/notifications/notifications.service';
import { PaginationComponentOptions } from 'src/app/shared/pagination/pagination-component-options.model';
import { EPIC_HANDLE_TABLE_EDIT_HANDLE_PATH, EPIC_HANDLE_TABLE_NEW_HANDLE_PATH, getEpicHandleTableModulePath } from '../epic-handle-routing-paths';
import { take } from 'rxjs/operators';
import { isEmpty } from '../../shared/empty.util';
import { defaultPagination, defaultSortConfiguration } from 'src/app/clarin-licenses/clarin-license-table-pagination';

@Component({
  selector: 'ds-epic-handle-table',
  templateUrl: './epic-handle-table.component.html',
  styleUrls: ['./epic-handle-table.component.scss']
})
export class EpicHandleTableComponent implements OnInit {
  constructor(private epicHandleDataService: EpicHandleDataService,
    public router: Router,
    private cdr: ChangeDetectorRef,
    private translateService: TranslateService,
    private notificationsService: NotificationsService,
    private route: ActivatedRoute) {
  }
  handlesRD$: BehaviorSubject<any> = new BehaviorSubject<any>(null);
  pageSize = 10;
  options: PaginationComponentOptions;
  sortConfiguration: SortOptions;
  searchQuery: string = '';
  pidQuery: string = '';
  private previousSearchQuery = '';
  isLoading = false;
  handleRoute: string;
  newHandleRoute = EPIC_HANDLE_TABLE_NEW_HANDLE_PATH;
  editHandlePath = EPIC_HANDLE_TABLE_EDIT_HANDLE_PATH;
  selectedHandle = null;
  prefix = '';
  totalElements: number = null;

  ngOnInit(): void {
    // get the prefix from query params and initialize inside the subscription so we only
    // proceed once we have the prefix available
    this.route.queryParams.pipe(take(1)).subscribe(params => {
      this.prefix = params['prefix'];
      if (!this.prefix) {
        this.router.navigate(['/epic-handle-table/prefix']);
        return;
      }

      // setting the prefix in the service
      this.epicHandleDataService.setPrefix(this.prefix);
      this.handleRoute = getEpicHandleTableModulePath();
      this.initializePaginationOptions();
      this.initializeSortingOptions();
      this.getAllHandles();
    });
  }

  getAllHandles() {
    this.isLoading = true;

    if (this.searchQuery !== this.previousSearchQuery) {
      this.options.currentPage = 1;
      this.totalElements = null;
      this.previousSearchQuery = this.searchQuery
    }

    const urlPattern = this.searchQuery?.trim() !== '' ? this.searchQuery?.trim() : undefined;

    this.epicHandleDataService.findAll(
      {
        currentPage: this.options?.currentPage,
        elementsPerPage: this.options?.pageSize
      },
      this.prefix,
      urlPattern,
      this.totalElements,
    ).subscribe((response) => {
      this.handlesRD$.next(response);
      this.isLoading = false;

      if (response?.payload?.totalElements !== undefined) {
        this.totalElements = response.payload.totalElements
      }
      this.cdr.detectChanges()
    }, (error) => {
      console.error('Error loading epic handles: ', error);
      this.isLoading = false;
      this.notificationsService.error(null, this.translateService.instant('error'))
    })
  }

  clearSearch() {
    this.searchQuery = '';
    this.totalElements = null;
    this.getAllHandles();
  }

  private initializeSortingOptions() {
    this.sortConfiguration = defaultSortConfiguration;
  }

  private initializePaginationOptions() {
    this.options = Object.assign({}, defaultPagination, {
      id: 'epic-handle-pagination',
      pageSize: this.pageSize,
      currentPage: 1
    });
  }


  redirectToNewHandle() {
    this.router.navigate([this.handleRoute, this.newHandleRoute],
      { queryParams: { currentPage: this.options.currentPage, prefix: this.prefix } }
    );
  }
  redirectToEditHandle() {

    if (isEmpty(this.selectedHandle)) {
      return
    }

    this.handlesRD$.pipe(
      take(1)
    ).subscribe(handlesRD => {
      const handles = handlesRD?.payload?.page || [];
      const handle = handles.find(h => h.id === this.selectedHandle);

      if (handle) {
        this.switchSelectedHandle(this.selectedHandle);
        this.router.navigate([this.handleRoute, this.editHandlePath],
          {
            queryParams: {
              id: handle.id,
              url: handle.url,
              currentPage: this.options.currentPage,
              prefix: this.prefix
            }
          }
        );
      }
    })
  }

  goToHandle(id) {
    if (!id) {
      return;
    }
    window.open(`/handle/${id}`, '_blank');
  }

  deleteHandle() {
    if (isEmpty(this.selectedHandle)) {
      return;
    }

    if (!confirm(this.translateService.instant('epic-handle-table.delete-handle.confirm'))) {
      return;
    }

    this.isLoading = true;

    this.epicHandleDataService.deleteByHandleId(this.selectedHandle)
      .pipe(take(1))
      .subscribe(
        (response) => {
          if (response?.hasSucceeded || response?.statusCode === 204) {
            this.notificationsService.success(
              null,
              this.translateService.instant('epic-handle-table.delete-handle.notify.successful')
            );
            this.switchSelectedHandle(this.selectedHandle);
            this.totalElements = null;
            this.getAllHandles();
          } else {
            this.isLoading = false;
            this.notificationsService.error(
              null,
              this.translateService.instant('epic-handle-table.delete-handle.notify.error')
            );
          }
        },
        (error) => {
          this.isLoading = false;
          const errorMessage = error?.error?.message ||
            this.translateService.instant('epic-handle-table.delete-handle.notify.error');
          this.notificationsService.error(null, errorMessage);
        }
      );
  }

  onPageChange() {
    this.getAllHandles()
  }

  switchSelectedHandle(handleId) {
    if (this.selectedHandle === handleId) {
      this.selectedHandle = null;
    } else {
      this.selectedHandle = handleId;
    }
  }

  searchHandles() {
    this.getAllHandles()
  }


  changePrefix() {
    this.router.navigate(['/epic-handle-table/prefix']);
  }


  goToPID() {
    const raw = (this.pidQuery || '').trim();
    if (!raw) {
      return;
    }

    if (!this.isPidInputValid()) {
      // show an inline notification
      this.notificationsService.error(null, this.translateService.instant('epic-handle-table.pid.invalid'));
      return;
    }

    this.handlesRD$.pipe(
      take(1)
    ).subscribe(handlesRD => {
      const handles = handlesRD?.payload?.page || [];

      // only accept full id (prefix/suffix)
      const handle = handles.find(h => h.id === raw);

      if (handle) {
        this.switchSelectedHandle(handle.id);
        this.router.navigate([this.handleRoute, this.editHandlePath],
          {
            queryParams: {
              id: handle.id,
              url: handle.url,
              currentPage: this.options.currentPage,
              prefix: this.prefix
            }
          }
        );
      } else {
        this.notificationsService.error(null, this.translateService.instant('epic-handle-table.pid.notfound'));
      }
    });
  }

  /**
   * Validate the PID input.
   * Accepts either a suffix-only (e.g. "TEST-001") or a full id "prefix/suffix".
   * If the user enters only the prefix (equal to this.prefix) without a suffix, treat as invalid.
   */
  isPidInputValid(): boolean {
    const val = (this.pidQuery || '').trim();
    if (!val) {
      return false;
    }
    // require explicit prefix/suffix format
    if (val.includes('/')) {
      const parts = val.split('/');
      return parts.length === 2 && parts[0].length > 0 && parts[1].length > 0;
    }
    return false;
  }

}
