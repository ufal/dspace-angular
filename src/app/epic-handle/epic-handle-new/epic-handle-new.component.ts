import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { isNull } from 'lodash';
import { EpicHandleDataService } from 'src/app/core/data/epic-handle-data.service';
import { RemoteData } from 'src/app/core/data/remote-data';
import { Handle } from 'src/app/core/handle/handle.model';
import { getFirstCompletedRemoteData } from 'src/app/core/shared/operators';
import { NotificationsService } from 'src/app/shared/notifications/notifications.service';
import { getEpicHandleTableModulePath } from '../epic-handle-routing-paths';

@Component({
  selector: 'ds-epic-handle-new',
  templateUrl: './epic-handle-new.component.html',
  styleUrls: ['./epic-handle-new.component.scss']
})
export class EpicHandleNewComponent implements OnInit {
  url: string;
  subPrefix: string;
  subSuffix: string;
  prefix: string;
  isLoading = false;
  currentPage: number;

  constructor(private notificationService: NotificationsService,
    private route: ActivatedRoute,
    private router: Router,
    private translateService: TranslateService,
    private epicHandleService: EpicHandleDataService
  ) { }
  ngOnInit(): void {
    const params = this.route.snapshot.queryParams || {};
    this.currentPage = params.currentPage;
    this.prefix = params.prefix;
    if (!this.prefix) {
      this.router.navigate(['/epic-handle-table/prefix']);
      return;
    }
  }

  onClickSubmit(value: any) {
    if (!value.url || value.url.trim() === '') {
      this.notificationService.error(
        this.translateService.instant('epic-handle-table.new-handle.notify.error.url-required'),
        this.translateService.instant('epic-handle-table.new-handle.notify.error')
      );
      return;
    }

    this.isLoading = true;

    this.epicHandleService.create(
      this.prefix,
      value.url.trim(),
      value.subPrefix?.trim(),
      value.subSuffix?.trim()
    ).pipe(getFirstCompletedRemoteData())
      .subscribe((handleResponse: RemoteData<Handle>) => {
        this.isLoading = false;
        if (isNull(handleResponse)) {
          this.notificationService.error(
            '', this.translateService.instant('epic-handle-table.new-handle.notify.error')
          );
          return;
        }

        if (handleResponse.hasSucceeded) {
          this.notificationService.success('', this.translateService.instant('epic-handle-table.new-handle.notify.successful'));
          this.redirectBack();
        } else if (handleResponse.hasFailed) {
          const errorMsg = handleResponse.errorMessage || this.translateService.instant('epic-handle-table.new-handle.notify.error');
          this.notificationService.error('', errorMsg);
        }
      }, error => {
        this.isLoading = false;
        this.notificationService.error('', this.translateService.instant('epic-handle-table.new-handle.notify.error'));
      });
  }

  redirectBack() {
    const queryParams: any = this.currentPage ? { currentPage: this.currentPage } : {};
    if (this.prefix) {
      queryParams.prefix = this.prefix;
    }
    this.router.navigate([getEpicHandleTableModulePath()], { queryParams });
  }

  onCancel() {
    this.redirectBack();
  }
}
