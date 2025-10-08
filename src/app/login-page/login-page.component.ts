import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { combineLatest as observableCombineLatest, Subscription } from 'rxjs';
import { filter, switchMap, take } from 'rxjs/operators';
import { Store } from '@ngrx/store';

import { AppState } from '../app.reducer';
import {
  AddAuthenticationMessageAction,
  AuthenticatedAction,
  AuthenticationSuccessAction,
  ResetAuthenticationMessagesAction,
} from '../core/auth/auth.actions';
import { hasValue, isNotEmpty } from '../shared/empty.util';
import { AuthTokenInfo } from '../core/auth/models/auth-token-info.model';
import { isAuthenticated } from '../core/auth/selectors';
import { AuthService } from '../core/auth/auth.service';
import { EPerson } from '../core/eperson/models/eperson.model';

/**
 * This component represents the login page
 */
@Component({
  selector: 'ds-login-page',
  styleUrls: ['./login-page.component.scss'],
  templateUrl: './login-page.component.html',
})
export class LoginPageComponent implements OnDestroy, OnInit {
  /**
   * Subscription to unsubscribe onDestroy
   * @type {Subscription}
   */
  sub: Subscription;

  /**
   * The current authenticated user. It is null if the user is not authenticated.
   */
  authenticatedUser = null;

  /**
   * Initialize instance variables
   *
   * @param {ActivatedRoute} route
   * @param {Store<AppState>} store
   */
  constructor(
    private route: ActivatedRoute,
    private store: Store<AppState>,
    private authService: AuthService
  ) {}

  /**
   * Initialize instance variables
   */
  ngOnInit() {
    // initializing the auth state
    this.initializeTheAuthenticationState();

    const queryParamsObs = this.route.queryParams;
    const authenticated = this.store.select(isAuthenticated);

    this.sub = observableCombineLatest(queryParamsObs, authenticated)
      .pipe(
        filter(
          ([params, auth]) =>
            isNotEmpty(params.token) || isNotEmpty(params.expired)
        ),
        take(1)
      )
      .subscribe(([params, auth]) => {
        console.log('is authenticated', auth);
        const token = params.token;
        let authToken: AuthTokenInfo;
        if (!auth) {
          if (isNotEmpty(token)) {
            authToken = new AuthTokenInfo(token);
            this.store.dispatch(new AuthenticatedAction(authToken));
          } else if (isNotEmpty(params.expired)) {
            this.store.dispatch(
              new AddAuthenticationMessageAction('auth.messages.expired')
            );
          }
        } else {
          if (isNotEmpty(token)) {
            authToken = new AuthTokenInfo(token);
            this.store.dispatch(new AuthenticationSuccessAction(authToken));
          }
        }
      });
  }

  // checking if user is authenticated and is in store
  initializeTheAuthenticationState() {
    this.authService
      .isAuthenticated()
      .pipe(
        take(1),
        switchMap((isUserAuthenticated: boolean) => {
          if (isUserAuthenticated) {
            return this.authService
              .getAuthenticatedUserFromStore()
              .pipe(take(1));
          } else {
            return [null];
          }
        })
      )
      .subscribe({
        next: (user: EPerson | null) => {
          this.authenticatedUser = user;

          if (user) {
          }
        },
        error: (error) => {
          this.authenticatedUser = null;
        },
      });
  }

  /**
   * Unsubscribe from subscription
   */
  ngOnDestroy() {
    if (hasValue(this.sub)) {
      this.sub.unsubscribe();
    }
    // Clear all authentication messages when leaving login page
    this.store.dispatch(new ResetAuthenticationMessagesAction());
  }
}
