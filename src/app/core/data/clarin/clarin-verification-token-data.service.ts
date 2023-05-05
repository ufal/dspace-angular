import { Injectable } from '@angular/core';
import { RequestService } from '../request.service';
import { RemoteDataBuildService } from '../../cache/builders/remote-data-build.service';
import { Store } from '@ngrx/store';
import { HALEndpointService } from '../../shared/hal-endpoint.service';
import { ObjectCacheService } from '../../cache/object-cache.service';
import { DefaultChangeAnalyzer } from '../default-change-analyzer.service';
import { HttpClient } from '@angular/common/http';
import { NotificationsService } from '../../../shared/notifications/notifications.service';
import { ClarinVerificationToken } from '../../shared/clarin/clarin-verification-token.model';
import { BaseDataService } from '../base/base-data.service';
import { CoreState } from '../../core-state.model';
import { dataService } from '../base/data-service.decorator';

export const linkName = 'clarinverificationtokens';
/**
 * A service responsible for fetching/sending license data from/to the ClarinVerificationToken REST API
 */
@Injectable()
@dataService(ClarinVerificationToken.type)
export class ClarinVerificationTokenDataService extends BaseDataService<ClarinVerificationToken> {
  protected linkPath = linkName;

  constructor(
    protected requestService: RequestService,
    protected rdbService: RemoteDataBuildService,
    protected store: Store<CoreState>,
    protected halService: HALEndpointService,
    protected objectCache: ObjectCacheService,
    protected comparator: DefaultChangeAnalyzer<ClarinVerificationToken>,
    protected http: HttpClient,
    protected notificationsService: NotificationsService,
    protected responseMsToLive?: number,
  ) {
    super(linkName, requestService, rdbService, objectCache, halService, responseMsToLive);
  }
}
