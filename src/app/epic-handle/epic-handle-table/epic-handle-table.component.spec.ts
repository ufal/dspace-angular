import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EpicHandleTableComponent } from './epic-handle-table.component';

describe('EpicHandleTableComponent', () => {
  let component: EpicHandleTableComponent;
  let fixture: ComponentFixture<EpicHandleTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EpicHandleTableComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EpicHandleTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
