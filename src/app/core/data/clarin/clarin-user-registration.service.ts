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
import { ClarinUserRegistration } from '../../shared/clarin/clarin-user-registration.model';
import { BaseDataService } from '../base/base-data.service';
import { dataService } from '../base/data-service.decorator';
import { CoreState } from '../../core-state.model';

export const linkName = 'clarinuserregistrations';
export const AUTOCOMPLETE = new ResourceType(linkName);

/**
 * A service responsible for fetching/sending user registration data from/to the Clarin User Registration REST API
 */
@Injectable()
@dataService(ClarinUserRegistration.type)
export class ClarinUserRegistrationDataService extends BaseDataService<ClarinUserRegistration> {
  protected linkPath = linkName;

  constructor(
    protected requestService: RequestService,
    protected rdbService: RemoteDataBuildService,
    protected store: Store<CoreState>,
    protected halService: HALEndpointService,
    protected objectCache: ObjectCacheService,
    protected comparator: DefaultChangeAnalyzer<ClarinUserRegistration>,
    protected http: HttpClient,
    protected notificationsService: NotificationsService,
    protected responseMsToLive?: number,
  ) {
    super(linkName, requestService, rdbService, objectCache, halService, responseMsToLive);
  }
}
