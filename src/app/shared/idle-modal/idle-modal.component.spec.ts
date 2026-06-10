import { DebugElement, NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick, waitForAsync } from '@angular/core/testing';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { of as observableOf, Subject, throwError } from 'rxjs';
import { IdleModalComponent } from './idle-modal.component';
import { AuthService } from '../../core/auth/auth.service';
import { By } from '@angular/platform-browser';
import { Store } from '@ngrx/store';
import { LogOutAction, RefreshTokenSuccessAction } from '../../core/auth/auth.actions';
import { AuthTokenInfo } from '../../core/auth/models/auth-token-info.model';

describe('IdleModalComponent', () => {
  let component: IdleModalComponent;
  let fixture: ComponentFixture<IdleModalComponent>;
  let debugElement: DebugElement;

  let modalStub;
  let authServiceStub;
  let storeStub;

  beforeEach(waitForAsync(() => {
    modalStub = jasmine.createSpyObj('modalStub', ['close']);
    authServiceStub = jasmine.createSpyObj('authService', ['setIdle', 'getToken', 'refreshAuthenticationToken']);
    const token = new AuthTokenInfo('test-token');
    authServiceStub.getToken.and.returnValue(token);
    authServiceStub.refreshAuthenticationToken.and.returnValue(observableOf(token));
    storeStub = jasmine.createSpyObj('store', ['dispatch']);
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      declarations: [IdleModalComponent],
      providers: [
        { provide: NgbActiveModal, useValue: modalStub },
        { provide: AuthService, useValue: authServiceStub },
        { provide: Store, useValue: storeStub }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(IdleModalComponent);
    component = fixture.componentInstance;
    debugElement = fixture.debugElement;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('extendSessionPressed', () => {
    beforeEach(fakeAsync(() => {
      spyOn(component.response, 'emit');
      component.extendSessionPressed();
    }));
    it('should set idle to false', () => {
      expect(authServiceStub.setIdle).toHaveBeenCalledWith(false);
    });
    it('should close the modal', () => {
      expect(modalStub.close).toHaveBeenCalled();
    });
    it('response \'closed\' should emit true', () => {
      expect(component.response.emit).toHaveBeenCalledWith(true);
    });

    it('should refresh authentication token with current token', () => {
      const currentToken = authServiceStub.getToken();
      expect(authServiceStub.refreshAuthenticationToken).toHaveBeenCalledWith(currentToken);
    });

    it('should dispatch refreshed token before closing modal', () => {
      expect(storeStub.dispatch).toHaveBeenCalledWith(new RefreshTokenSuccessAction(authServiceStub.getToken()));
      const dispatchOrder = storeStub.dispatch.calls.first().invocationOrder;
      const closeOrder = modalStub.close.calls.first().invocationOrder;
      expect(dispatchOrder).toBeLessThan(closeOrder);
    });
  });

  describe('extendSessionAndCloseModal hardening', () => {
    it('should dispatch LogOutAction and close modal when refresh fails', () => {
      authServiceStub.refreshAuthenticationToken.and.returnValue(throwError(() => new Error('refresh failed')));
      spyOn(component, 'closeModal').and.callThrough();

      component.extendSessionAndCloseModal();

      expect(storeStub.dispatch).toHaveBeenCalledWith(new LogOutAction());
      expect(component.closeModal).toHaveBeenCalled();
      expect(modalStub.close).toHaveBeenCalled();
    });

    it('should prevent duplicate refresh requests on rapid double click', () => {
      const refresh$ = new Subject<AuthTokenInfo>();
      authServiceStub.refreshAuthenticationToken.and.returnValue(refresh$.asObservable());

      component.extendSessionAndCloseModal();
      component.extendSessionAndCloseModal();

      expect(authServiceStub.refreshAuthenticationToken).toHaveBeenCalledTimes(1);

      refresh$.next(new AuthTokenInfo('updated-token'));
      refresh$.complete();
    });

    it('should not close modal before token refresh completes', () => {
      const refresh$ = new Subject<AuthTokenInfo>();
      authServiceStub.refreshAuthenticationToken.and.returnValue(refresh$.asObservable());
      spyOn(component, 'closeModal').and.callThrough();

      component.extendSessionAndCloseModal();

      expect(component.closeModal).not.toHaveBeenCalled();
      expect(modalStub.close).not.toHaveBeenCalled();

      refresh$.next(new AuthTokenInfo('updated-token'));
      refresh$.complete();

      expect(component.closeModal).toHaveBeenCalledTimes(1);
      expect(modalStub.close).toHaveBeenCalledTimes(1);
    });
  });

  describe('logOutPressed', () => {
    beforeEach(() => {
      component.logOutPressed();
    });
    it('should close the modal', () => {
      expect(modalStub.close).toHaveBeenCalled();
    });
    it('should send logout action', () => {
      expect(storeStub.dispatch).toHaveBeenCalledWith(new LogOutAction());
    });
  });

  describe('closePressed', () => {
    beforeEach(fakeAsync(() => {
      spyOn(component.response, 'emit');
      component.closePressed();
    }));
    it('should set idle to false', () => {
      expect(authServiceStub.setIdle).toHaveBeenCalledWith(false);
    });
    it('should close the modal', () => {
      expect(modalStub.close).toHaveBeenCalled();
    });
    it('response \'closed\' should emit true', () => {
      expect(component.response.emit).toHaveBeenCalledWith(true);
    });
  });

  describe('when the click method emits on extend session button', () => {
    beforeEach(fakeAsync(() => {
      spyOn(component, 'extendSessionPressed');
      debugElement.query(By.css('button.confirm')).triggerEventHandler('click', {
        preventDefault: () => {/**/
        }
      });
      tick();
      fixture.detectChanges();
    }));
    it('should call the extendSessionPressed method on the component', () => {
      expect(component.extendSessionPressed).toHaveBeenCalled();
    });
  });

  describe('when the click method emits on log out button', () => {
    beforeEach(fakeAsync(() => {
      spyOn(component, 'logOutPressed');
      debugElement.query(By.css('button.cancel')).triggerEventHandler('click', {
        preventDefault: () => {/**/
        }
      });
      tick();
      fixture.detectChanges();
    }));
    it('should call the logOutPressed method on the component', () => {
      expect(component.logOutPressed).toHaveBeenCalled();
    });
  });

  describe('when the click method emits on close button', () => {
    beforeEach(fakeAsync(() => {
      spyOn(component, 'closePressed');
      debugElement.query(By.css('.close')).triggerEventHandler('click', {
        preventDefault: () => {/**/
        }
      });
      tick();
      fixture.detectChanges();
    }));
    it('should call the closePressed method on the component', () => {
      expect(component.closePressed).toHaveBeenCalled();
    });
  });
});
