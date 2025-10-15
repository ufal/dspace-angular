import { Injectable } from '@angular/core';
import { RequestService } from './request.service';
import { RemoteDataBuildService } from '../cache/builders/remote-data-build.service';
import { Store } from '@ngrx/store';
import { HALEndpointService } from '../shared/hal-endpoint.service';
import { ObjectCacheService } from '../cache/object-cache.service';
import { DefaultChangeAnalyzer } from './default-change-analyzer.service';
import { HttpClient, HttpParams } from '@angular/common/http';
import { NotificationsService } from '../../shared/notifications/notifications.service';
import { Handle } from '../handle/handle.model';
import { map, mergeMap, Observable } from 'rxjs';
import { RemoteData } from './remote-data';
import { CoreState } from '../core-state.model';
import { CreateData } from './base/create-data';
import { FindAllData } from './base/find-all-data';
import { FindListOptions } from './find-list-options.model';
import { isNotEmpty } from 'src/app/shared/empty.util';
import { DeleteRequest, PostRequest, PutRequest } from './request.models';


/**
 * A service responsible for fetching/sending data from/to the REST API on the metadatafields endpoint
 */
@Injectable({
  providedIn: 'root',
})
export class EpicHandleDataService {
  private currentPrefix: string = '';
  constructor(
    protected requestService: RequestService,
    protected rdbService: RemoteDataBuildService,
    protected store: Store<CoreState>,
    protected halService: HALEndpointService,
    protected objectCache: ObjectCacheService,
    protected comparator: DefaultChangeAnalyzer<Handle>,
    protected http: HttpClient,
    protected notificationsService: NotificationsService) {
  }

  setPrefix(prefix: string) {
    this.currentPrefix = prefix;
  }

  getPrefix(): string {
    return this.currentPrefix;
  }

  findAll(options: FindListOptions, prefix: string, urlPattern?: string, totalElements?: number,): Observable<any> {
    return this.halService.getEndpoint('epichandles').pipe(
      map(baseUrl => {
        const url = `${baseUrl}/${prefix}`;
        let params = new HttpParams();

        if (isNotEmpty(urlPattern)) {
          params = params.set('url', urlPattern);
        }

        if (options.currentPage !== undefined) {
          params = params.set('page', String(options.currentPage - 1));
        }

        if (options.elementsPerPage !== undefined) {
          params = params.set('size', String(options.elementsPerPage));
        }

        if (totalElements) {
          params = params.set('totalElements', String(totalElements));
        }

        return { url, params };
      }),
      mergeMap(({ url, params }) => {
        return this.http.get<any>(url, { params });
      }),
      map(response => {
        const handles = response.content || [];
        const pageInfo = {
          elementsPerPage: response.pageable?.pageSize || options.elementsPerPage || 10,
          totalElements: response.totalElements || 0,
          totalPages: response.totalPages || 0,
          currentPage: (response.pageable?.pageNumber || 0) + 1
        };

        return {
          payload: {
            page: handles,
            pageInfo: pageInfo,
            totalElements: response.totalElements || 0
          }
        }
      })
    )}

  create(
    prefix: string,
    url: string,
    subPrefix?: string,
    subSuffix?: string,
  ): Observable<RemoteData<Handle>> {
    return this.halService.getEndpoint('epichandles').pipe(
      map(baseUrl => {
        const endpoint = `${baseUrl}/${prefix}`;
        let params = new HttpParams().set('url', url);

        if (isNotEmpty(subPrefix)) {
          params = params.set('prefix', subPrefix);
        }
        if (isNotEmpty(subSuffix)) {
          params = params.set('suffix', subSuffix)
        }

        return { endpoint, params };
      }), mergeMap(({ endpoint, params }) => {
        const requestId = this.requestService.generateRequestId();
        const fullUrl = `${endpoint}?${params.toString()}`;
        const request = new PostRequest(requestId, fullUrl, null);
        this.requestService.send(request);

        return this.rdbService.buildFromRequestUUID<Handle>(requestId)
      })
    )}

  update(
    prefix: string,
    suffix: string,
    url: string
  ): Observable<RemoteData<Handle>> {
    return this.halService.getEndpoint('epichandles').pipe(
      map(baseUrl => {
        const endpoint = `${baseUrl}/${prefix}/${suffix}`;
        const params = new HttpParams().set('url', url)
        return { endpoint, params }
      }),
      mergeMap(({ endpoint, params }) => {
        const requestId = this.requestService.generateRequestId();
        const fullUrl = `${endpoint}?${params.toString()}`;
        const request = new PutRequest(requestId, fullUrl, null);
        this.requestService.send(request);
        return this.rdbService.buildFromRequestUUID<Handle>(requestId)
      })
    )
  }
  delete(prefix: string, suffix: string): Observable<RemoteData<any>> {
    return this.halService.getEndpoint('epichandles').pipe(
      map(baseUrl => `${baseUrl}/${prefix}/${suffix}`),
      mergeMap(url => {
        const requestId = this.requestService.generateRequestId();
        const request = new DeleteRequest(requestId, url);
        this.requestService.send(request);
        return this.rdbService.buildFromRequestUUID(requestId);
      })
    );
  }

  deleteByHandleId(handleId: string): Observable<RemoteData<any>> {
    const parts = handleId.split('/');
    if (parts.length !== 2) {
      throw new Error('Invalid handle ID format. Expected: prefix/suffix');
    }
    return this.delete(parts[0], parts[1]);
  }

}
