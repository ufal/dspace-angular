import { Component, OnDestroy, OnInit } from '@angular/core';

import { BehaviorSubject, EMPTY, Observable } from 'rxjs';
import { mergeMap, tap } from 'rxjs/operators';

import { RemoteData } from '../../../../core/data/remote-data';
import { PoolTask } from '../../../../core/tasks/models/pool-task-object.model';
import { SearchResultDetailElementComponent } from '../search-result-detail-element.component';
import {
  MyDspaceItemStatusType
} from '../../../object-collection/shared/mydspace-item-status/my-dspace-item-status-type';
import { WorkflowItem } from '../../../../core/submission/models/workflowitem.model';
import { ViewMode } from '../../../../core/shared/view-mode.model';
import { listableObjectComponent } from '../../../object-collection/shared/listable-object/listable-object.decorator';
import { PoolTaskSearchResult } from '../../../object-collection/shared/pool-task-search-result.model';
import { followLink } from '../../../utils/follow-link-config.model';
import { LinkService } from '../../../../core/cache/builders/link.service';
import { Item } from '../../../../core/shared/item.model';
import { getFirstCompletedRemoteData } from '../../../../core/shared/operators';
import { isNotEmpty } from '../../../empty.util';
import { ObjectCacheService } from '../../../../core/cache/object-cache.service';

/**
 * This component renders pool task object for the search result in the detail view.
 */
@Component({
  selector: 'ds-pool-search-result-detail-element',
  styleUrls: ['../search-result-detail-element.component.scss'],
  templateUrl: './pool-search-result-detail-element.component.html',
})

@listableObjectComponent(PoolTaskSearchResult, ViewMode.DetailedListElement)
export class PoolSearchResultDetailElementComponent extends SearchResultDetailElementComponent<PoolTaskSearchResult, PoolTask> implements OnInit, OnDestroy  {

  /**
   * The item object that belonging to the result object
   */
  public item$: BehaviorSubject<Item> = new BehaviorSubject<Item>(null);

  /**
   * A boolean representing if to show submitter information
   */
  public showSubmitter = true;

  /**
   * Represent item's status
   */
  public status = MyDspaceItemStatusType.WAITING_CONTROLLER;

  /**
   * The workflowitem object that belonging to the result object
   */
  public workflowitem$: BehaviorSubject<WorkflowItem> = new BehaviorSubject<WorkflowItem>(null);

  constructor(protected linkService: LinkService, protected objectCache: ObjectCacheService) {
    super();
  }

  /**
   * Initialize all instance variables
   */
  ngOnInit() {
    super.ngOnInit();
    this.linkService.resolveLinks(this.dso, followLink('workflowitem', {},
      followLink('item', {}, followLink('bundles')),
      followLink('submitter')
    ), followLink('action'));

    (this.dso.workflowitem as Observable<RemoteData<WorkflowItem>>).pipe(
      getFirstCompletedRemoteData(),
      mergeMap((wfiRD: RemoteData<WorkflowItem>) => {
        if (wfiRD.hasSucceeded) {
          this.workflowitem$.next(wfiRD.payload);
          return (wfiRD.payload.item as Observable<RemoteData<Item>>).pipe(
            getFirstCompletedRemoteData()
          );
        } else {
          return EMPTY;
        }
      }),
      tap((itemRD: RemoteData<Item>) => {
        if (isNotEmpty(itemRD) && itemRD.hasSucceeded) {
          this.item$.next(itemRD.payload);
        }
      })
    ).subscribe();

  }

  ngOnDestroy() {
    // This ensures the object is removed from cache, when action is performed on task
    this.objectCache.remove(this.dso._links.workflowitem.href);
  }

}
