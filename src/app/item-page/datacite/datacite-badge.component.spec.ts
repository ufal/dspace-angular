import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DataciteBadgeComponent } from './datacite-badge.component';

describe('DataciteComponent', () => {
  let component: DataciteBadgeComponent;
  let fixture: ComponentFixture<DataciteBadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DataciteBadgeComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DataciteBadgeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
