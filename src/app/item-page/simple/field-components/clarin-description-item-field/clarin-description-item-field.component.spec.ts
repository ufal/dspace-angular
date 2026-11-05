import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ClarinDescriptionItemFieldComponent } from './clarin-description-item-field.component';
import { Item } from '../../../../core/shared/item.model';
import { createSuccessfulRemoteDataObject$ } from '../../../../shared/remote-data.utils';
import { createPaginatedList } from '../../../../shared/testing/utils.test';
import { APP_CONFIG } from '../../../../../config/app-config.interface';
import { environment } from '../../../../../environments/environment';
import { MarkdownPipe } from '../../../../shared/utils/markdown.pipe';

describe('ClarinDescriptionItemFieldComponent', () => {
  let component: ClarinDescriptionItemFieldComponent;
  let fixture: ComponentFixture<ClarinDescriptionItemFieldComponent>;

  const mockItem: Item = Object.assign(new Item(), {
    bundles: createSuccessfulRemoteDataObject$(createPaginatedList([])),
    metadata: {
      'dc.identifier.uri': [
        {
          language: 'en_US',
          value: 'some handle'
        }
      ]
    }
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ClarinDescriptionItemFieldComponent, MarkdownPipe ],
      providers: [
        { provide: APP_CONFIG, useValue: environment }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClarinDescriptionItemFieldComponent);
    component = fixture.componentInstance;
    component.fields = ['dc.identifier.uri'];
    component.item = mockItem;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
