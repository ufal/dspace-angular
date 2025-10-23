import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewsDownloadsStatisticsComponent } from './views-downloads-statistics.component';

describe('ViewsDownloadsStatisticsComponent', () => {
  let component: ViewsDownloadsStatisticsComponent;
  let fixture: ComponentFixture<ViewsDownloadsStatisticsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ViewsDownloadsStatisticsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ViewsDownloadsStatisticsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
