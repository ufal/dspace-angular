import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { RemoteData } from '../core/data/remote-data';
import { Collection } from '../core/shared/collection.model';
import { CollectionDataService } from '../core/data/collection-data.service';
import { License } from '../core/shared/license.model';
import { followLink } from '../shared/utils/follow-link-config.model';
import { filter } from 'rxjs/operators';
import { isNotEmpty, isNotUndefined } from '../shared/empty.util';
import { PaginatedList } from '../core/data/paginated-list.model';
import { PaginationComponentOptions } from '../shared/pagination/pagination-component-options.model';
import { FindListOptions } from '../core/data/find-list-options.model';
import { PaginationService } from '../core/pagination/pagination.service';

/**
 * The component load and show distribution license based on the collection.
 */
@Component({
  selector: 'ds-license-contract-page',
  templateUrl: './license-contract-page.component.html',
  styleUrls: ['./license-contract-page.component.scss']
})
export class LicenseContractPageComponent implements OnInit, OnDestroy {

  readonly paginationId = 'contract-collections';

  constructor(private route: ActivatedRoute,
              protected collectionDataService: CollectionDataService,
              protected paginationService: PaginationService,) {
  }

  /**
   * Show distribution license for the collection with this Id. The collection Id is loaded from the URL.
   */
  collectionId: string;

  /**
   * Collection RemoteData object loaded from the API.
   */
  collectionRD$: BehaviorSubject<RemoteData<Collection>> = new BehaviorSubject<RemoteData<Collection>>(null);

  /**
   * License RemoteData object loaded from the API.
   */
  licenseRD$: BehaviorSubject<RemoteData<License>> = new BehaviorSubject<RemoteData<License>>(null);

  /**
   * Collection list RemoteData object loaded from the API.
   */
  collectionsRD$: Observable<RemoteData<PaginatedList<Collection>>>;

  /**
   * The current pagination configuration for the page used by the authorized collection request.
   */
  config: FindListOptions = Object.assign(new FindListOptions(), {
    elementsPerPage: 10
  });

  /**
   * The current pagination configuration for the page.
   */
  pageConfig: PaginationComponentOptions = Object.assign(new PaginationComponentOptions(), {
    id: this.paginationId,
    pageSize: 10
  });

  ngOnInit(): void {
    this.collectionId = this.route.snapshot.queryParams.collectionId;
    if (isNotEmpty(this.collectionId)) {
      this.collectionDataService.findById(this.collectionId, false, true, followLink('license'))
        .pipe(
          filter((collectionData: RemoteData<Collection>) => isNotUndefined(collectionData.payload)))
        .subscribe((res) => {
          this.collectionRD$.next(res);
          res.payload.license.subscribe((licenseRD$) => {
            this.licenseRD$.next(licenseRD$);
          });
        });
    } else {
      this.loadAuthorizedCollections();
    }
  }

  ngOnDestroy(): void {
    if (this.isListMode()) {
      this.paginationService.clearPagination(this.paginationId);
    }
  }

  isListMode(): boolean {
    return !isNotEmpty(this.collectionId);
  }

  private loadAuthorizedCollections(): void {
    this.collectionsRD$ = this.paginationService.getFindListOptions(this.paginationId, this.config).pipe(
      switchMap((config: FindListOptions) => this.collectionDataService.getAuthorizedCollection('', config, true, true, followLink('license')))
    );
  }
}
