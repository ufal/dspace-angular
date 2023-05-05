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
import {dataService} from "../base/data-service.decorator";
import {CoreState} from "../../core-state.model";
import {BaseDataService} from "../base/base-data.service";

export const linkName = 'clarinlicenses';
export const AUTOCOMPLETE = new ResourceType(linkName);

/**
 * A service responsible for fetching/sending license data from/to the Clarin License REST API
 */
@Injectable()
@dataService(ClarinLicense.type)
export class ClarinLicenseDataService extends BaseDataService<ClarinLicense> {
  protected linkPath = linkName;

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
  ) {
    super(linkName, requestService, rdbService, objectCache, halService, responseMsToLive);
  }
}
