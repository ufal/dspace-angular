import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
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
    private notificationsService: NotificationsService,) {
  }
  handlesRD$: BehaviorSubject<any> = new BehaviorSubject<any>(null);
  pageSize = 10;
  options: PaginationComponentOptions;
  sortConfiguration: SortOptions;
  searchQuery: '';
  pidQuery: '';
  private previousSearchQuery = '';
  isLoading = false;
  handleRoute: string;
  newHandleRoute = EPIC_HANDLE_TABLE_NEW_HANDLE_PATH;
  editHandlePath = EPIC_HANDLE_TABLE_EDIT_HANDLE_PATH;
  selectedHandle = null;
  prefix = '';
  totalElements: number = null;

  ngOnInit(): void {
    const persistedPrefix = localStorage.getItem('prefix');
    if (!persistedPrefix) {
      this.router.navigate(['/epic-handle-table/prefix']);
      return;
    }
    this.epicHandleDataService.setPrefix(persistedPrefix);
    this.prefix = persistedPrefix;
    this.handleRoute = getEpicHandleTableModulePath();
    this.initializePaginationOptions();
    this.initializeSortingOptions();
    this.getAllHandles()
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
      false
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
    console.log("redirecting to new handle page")
    this.router.navigate([this.handleRoute, this.newHandleRoute],
      { queryParams: { currentPage: this.options.currentPage } }
    )
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
              currentPage: this.options.currentPage
            }
          }
        )
      }
    })
  }

  goToHandle(id) { }

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
    localStorage.removeItem('prefix');
    this.router.navigate(['/epic-handle-table/prefix']);
  }


  goToPID() {
    this.handlesRD$.pipe(
      take(1)
    ).subscribe(handlesRD => {
      const handles = handlesRD?.payload?.page || [];
      const handle = handles.find(h => {
        const parts = h.id.split('/');
        return parts[1] === this.pidQuery
      });

      if (handle) {
        this.switchSelectedHandle(this.selectedHandle);
        this.router.navigate([this.handleRoute, this.editHandlePath],
          {
            queryParams: {
              id: handle.id,
              url: handle.url,
              currentPage: this.options.currentPage
            }
          }
        )
      }
    })
  }

}
