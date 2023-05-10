import { ResourceType } from '../../shared/resource-type';
import { Injectable } from '@angular/core';
import { RequestService } from '../request.service';
import { RemoteDataBuildService } from '../../cache/builders/remote-data-build.service';
import { Store } from '@ngrx/store';
import { HALEndpointService } from '../../shared/hal-endpoint.service';
import { ObjectCacheService } from '../../cache/object-cache.service';
import { DefaultChangeAnalyzer } from '../default-change-analyzer.service';
import { HttpClient } from '@angular/common/http';
import { NotificationsService } from '../../../shared/notifications/notifications.service';
import { ClarinLicense } from '../../shared/clarin/clarin-license.model';
import {CreateData, CreateDataImpl} from '../base/create-data';
import {RequestParam} from '../../cache/models/request-param.model';
import {Observable} from 'rxjs';
import {RemoteData} from '../remote-data';
import {CoreState} from '../../core-state.model';
import {BaseDataService} from '../base/base-data.service';
import {dataService} from '../base/data-service.decorator';
import {PutData, PutDataImpl} from '../base/put-data';
import {DeleteData, DeleteDataImpl} from '../base/delete-data';
import {ConstructIdEndpoint} from '../base/identifiable-data.service';
import {NoContent} from '../../shared/NoContent.model';
import {SearchData} from '../base/search-data';
import {FindListOptions} from '../find-list-options.model';
import {FollowLinkConfig} from '../../../shared/utils/follow-link-config.model';
import {PaginatedList} from '../paginated-list.model';

export const linkName = 'clarinlicenses';
export const AUTOCOMPLETE = new ResourceType(linkName);

/**
 * A service responsible for fetching/sending license data from/to the Clarin License REST API
 */
@Injectable()
@dataService(ClarinLicense.type)
export class ClarinLicenseDataService extends BaseDataService<ClarinLicense> implements CreateData<ClarinLicense>, PutData<ClarinLicense>, DeleteData<ClarinLicense>, SearchData<ClarinLicense> {
  protected linkPath = linkName;
  private createData: CreateData<ClarinLicense>;
  private putData: PutData<ClarinLicense>;
  private deleteData: DeleteData<ClarinLicense>;
  private searchData: SearchData<ClarinLicense>;

  constructor(
    protected requestService: RequestService,
    protected rdbService: RemoteDataBuildService,
    protected store: Store<CoreState>,
    protected halService: HALEndpointService,
    protected objectCache: ObjectCacheService,
    protected comparator: DefaultChangeAnalyzer<ClarinLicense>,
    protected http: HttpClient,
    protected notificationsService: NotificationsService,
    protected responseMsToLive?: number,
    protected constructIdEndpoint: ConstructIdEndpoint = (endpoint, resourceID) => `${endpoint}/${resourceID}`,
  ) {
    super(linkName, requestService, rdbService, objectCache, halService, responseMsToLive);

    this.createData = new CreateDataImpl(this.linkPath, requestService, rdbService, objectCache, halService, notificationsService, this.responseMsToLive);
    this.putData = new PutDataImpl(this.linkPath, requestService, rdbService, objectCache, halService, this.responseMsToLive);
    this.deleteData = new DeleteDataImpl(this.linkPath, requestService, rdbService, objectCache, halService, notificationsService, this.responseMsToLive, this.constructIdEndpoint);
  }

  put(object: ClarinLicense): Observable<RemoteData<ClarinLicense>> {
    return this.putData.put(object);
  }

  create(object: ClarinLicense, ...params: RequestParam[]): Observable<RemoteData<ClarinLicense>> {
    return this.createData.create(object, ...params);
  }

  delete(objectId: string, copyVirtualMetadata?: string[]): Observable<RemoteData<NoContent>> {
    return this.deleteData.delete(objectId, copyVirtualMetadata);
  }

  deleteByHref(href: string, copyVirtualMetadata?: string[]): Observable<RemoteData<NoContent>> {
    return this.deleteData.deleteByHref(href, copyVirtualMetadata);
  }

  searchBy(searchMethod: string, options?: FindListOptions, useCachedVersionIfAvailable?: boolean, reRequestOnStale?: boolean, ...linksToFollow: FollowLinkConfig<ClarinLicense>[]): Observable<RemoteData<PaginatedList<ClarinLicense>>> {
    return this.searchData.searchBy(searchMethod, options, useCachedVersionIfAvailable, reRequestOnStale, ...linksToFollow);
  }

}
