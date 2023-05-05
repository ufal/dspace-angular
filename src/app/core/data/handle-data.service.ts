import { Injectable } from '@angular/core';
import { RequestService } from './request.service';
import { RemoteDataBuildService } from '../cache/builders/remote-data-build.service';
import { Store } from '@ngrx/store';
import { HALEndpointService } from '../shared/hal-endpoint.service';
import { ObjectCacheService } from '../cache/object-cache.service';
import { DefaultChangeAnalyzer } from './default-change-analyzer.service';
import { HttpClient } from '@angular/common/http';
import { NotificationsService } from '../../shared/notifications/notifications.service';
import { Handle } from '../handle/handle.model';
import { HANDLE } from '../handle/handle.resource-type';
import { Observable } from 'rxjs';
import { RemoteData } from './remote-data';
import { PaginatedList } from './paginated-list.model';
import { CoreState } from '../core-state.model';
import { BaseDataService } from './base/base-data.service';
import { dataService } from './base/data-service.decorator';
import {FindListOptions} from "./find-list-options.model";
import {linkName} from "./clarin/clarin-user-registration.service";

/**
 * A service responsible for fetching/sending data from/to the REST API on the metadatafields endpoint
 */
@Injectable()
@dataService(HANDLE)
export class HandleDataService extends BaseDataService<Handle> {
  protected linkPath = 'handles';

  constructor(
    protected requestService: RequestService,
    protected rdbService: RemoteDataBuildService,
    protected store: Store<CoreState>,
    protected halService: HALEndpointService,
    protected objectCache: ObjectCacheService,
    protected comparator: DefaultChangeAnalyzer<Handle>,
    protected http: HttpClient,
    protected notificationsService: NotificationsService,
    protected responseMsToLive?: number,) {
    super(linkName, requestService, rdbService, objectCache, halService, responseMsToLive);
  }

  findAll(options: FindListOptions = {}, useCachedVersionIfAvailable: boolean = true, reRequestOnStale: boolean = true, ...linksToFollow): Observable<RemoteData<PaginatedList<Handle>>> {
    return super.findAll(options, useCachedVersionIfAvailable, reRequestOnStale, ...linksToFollow);
  }
}
