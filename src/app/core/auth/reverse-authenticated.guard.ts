import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { Observable } from 'rxjs';
import { map, find, switchMap } from 'rxjs/operators';
import { select, Store } from '@ngrx/store';
import { isAuthenticated, isAuthenticationLoading } from './selectors';
import { CoreState } from '../core-state.model';

/**
 * Prevent authenticated users from accessing login page
 * @class ReverseAuthGuard
 */
@Injectable()
export class ReverseAuthGuard implements CanActivate {
  constructor(private router: Router, private store: Store<CoreState>) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> {
    return this.handleAuth();
  }

  canActivateChild(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> {
    return this.canActivate(route, state);
  }

  private handleAuth(): Observable<boolean | UrlTree> {
    return this.store.pipe(select(isAuthenticationLoading)).pipe(
      find((isLoading: boolean) => isLoading === false),
      switchMap(() => this.store.pipe(select(isAuthenticated))),
      map((authenticated) => {
        if (authenticated) {
          return this.router.createUrlTree(['/home']);
        } else {
          return true;
        }
      })
    );
  }
}
