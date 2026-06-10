import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth/auth.service';
import { hasValue } from '../empty.util';
import { Store } from '@ngrx/store';
import { AppState } from '../../app.reducer';
import { LogOutAction } from '../../core/auth/auth.actions';
import { finalize, take } from 'rxjs/operators';

@Component({
  selector: 'ds-idle-modal',
  templateUrl: 'idle-modal.component.html',
})
export class IdleModalComponent implements OnInit {

  /**
   * Total time of idleness before session expires (in minutes)
   * (environment.auth.ui.timeUntilIdle + environment.auth.ui.idleGracePeriod / 1000 / 60)
   */
  timeToExpire: number;

  /**
   * Timer to track time grace period
   */
  private graceTimer;

  /**
   * Guards against multiple rapid extension attempts.
   */
  private extending = false;

  /**
   * An event fired when the modal is closed
   */
  @Output()
  response = new EventEmitter<boolean>();

  constructor(private activeModal: NgbActiveModal,
              private authService: AuthService,
              private store: Store<AppState>) {
    this.timeToExpire = (environment.auth.ui.timeUntilIdle + environment.auth.ui.idleGracePeriod) / 1000 / 60; // ms => min
  }

  ngOnInit() {
    if (hasValue(this.graceTimer)) {
      clearTimeout(this.graceTimer);
    }
    this.graceTimer = setTimeout(() => {
      this.logOutPressed();
    }, environment.auth.ui.idleGracePeriod);
  }

  /**
   * When extend session is pressed
   */
  extendSessionPressed() {
    this.extendSessionAndCloseModal();
  }

  /**
   * Close modal and logout
   */
  logOutPressed() {
    this.closeModal();
    this.store.dispatch(new LogOutAction());
  }

  /**
   * When close is pressed
   */
  closePressed() {
    this.extendSessionAndCloseModal();
  }

  /**
   * Close the modal and extend session
   */
  extendSessionAndCloseModal() {
    if (this.extending) {
      return;
    }
    this.extending = true;

    if (hasValue(this.graceTimer)) {
      clearTimeout(this.graceTimer);
    }

    this.authService.setIdle(false);

    this.authService.refreshAuthenticationToken(this.authService.getToken()).pipe(
      take(1),
      finalize(() => this.extending = false)
    ).subscribe({
      next: (token) => {
        this.authService.replaceToken(token);
        this.closeModal();
      },
      error: () => {
        this.store.dispatch(new LogOutAction());
        this.closeModal();
      }
    });
  }

  /**
   * Close the modal and set the response to true so RootComponent knows the modal was closed
   */
  closeModal() {
    this.activeModal.close();
    this.response.emit(true);
  }
}
