import { TestBed } from '@angular/core/testing';

import { StaticPageComponent } from './static-page.component';
import { HtmlContentService } from '../shared/html-content.service';
import { Router } from '@angular/router';
import { RouterMock } from '../shared/mocks/router.mock';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import { APP_CONFIG } from '../../config/app-config.interface';
import { environment } from '../../environments/environment';
import { ClarinSafeHtmlPipe } from '../shared/utils/clarin-safehtml.pipe';
import { ServerResponseService } from '../core/services/server-response.service';

describe('StaticPageComponent', () => {
  async function setupTest(html: string, restBase?: string) {
    const htmlContentService = jasmine.createSpyObj('htmlContentService', {
      fetchHtmlContent: of(html),
      getHmtlContentByPathAndLocale: Promise.resolve(html)
    });

    const responseService = jasmine.createSpyObj('responseService', {
      setNotFound: null
    });

    const appConfig = {
      ...environment,
      ui: {
        ...(environment as any).ui,
        namespace: 'testNamespace'
      },
      rest: {
        ...(environment as any).rest,
        baseUrl: restBase
      }
    };

    await TestBed.configureTestingModule({
      declarations: [ StaticPageComponent, ClarinSafeHtmlPipe ],
      imports: [
        TranslateModule.forRoot()
      ],
      providers: [
        { provide: HtmlContentService, useValue: htmlContentService },
        { provide: Router, useValue: new RouterMock() },
        { provide: ServerResponseService, useValue: responseService },
        { provide: APP_CONFIG, useValue: appConfig }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(StaticPageComponent);
    const component = fixture.componentInstance;
    return { fixture, component, htmlContentService };
  }

  it('should create', async () => {
    const { component } = await setupTest('<div>test</div>');
    expect(component).toBeTruthy();
  });

  it('should load html file content', async () => {
    const { component } = await setupTest('<div id="idShouldNotBeRemoved">TEST MESSAGE</div>');
    await component.ngOnInit();
    expect(component.htmlContent.value).toBe('<div id="idShouldNotBeRemoved">TEST MESSAGE</div>');
  });

  it('should rewrite OAI link with rest.baseUrl', async () => {
    const oaiHtml = '<a href="/server/oai/request?verb=ListSets">OAI</a>';
    const { fixture, component } = await setupTest(oaiHtml, 'https://api.example.org/rest');

    await component.ngOnInit();
    fixture.detectChanges();

    const rewritten = 'https://api.example.org/server/oai/request?verb=ListSets';
    expect(component.htmlContent.value).toContain(rewritten);
    const anchor = fixture.nativeElement.querySelector('a');
    expect(anchor.getAttribute('href')).toBe(rewritten);
  });

  it('should leave OAI link unchanged when rest.baseUrl is missing', async () => {
    const oaiHtml = '<a href="/server/oai/request?verb=Identify">OAI</a>';
    const { fixture, component } = await setupTest(oaiHtml, undefined);

    await component.ngOnInit();
    fixture.detectChanges();

    expect(component.htmlContent.value).toContain('/server/oai/request?verb=Identify');
  });

  it('should avoid double slashes when rest.baseUrl ends with slash', async () => {
    const oaiHtml = '<a href="/server/oai/request?verb=ListRecords">OAI</a>';
    const { fixture, component } = await setupTest(oaiHtml, 'https://api.example.org/rest/');

    await component.ngOnInit();
    fixture.detectChanges();

    expect(component.htmlContent.value).toContain('https://api.example.org/server/oai/request?verb=ListRecords');
    expect(component.htmlContent.value).not.toContain('//server');
  });

  it('should leave content unchanged when no OAI link is present', async () => {
    const otherHtml = '<a href="/server/other">Other</a>';
    const { fixture, component } = await setupTest(otherHtml, 'https://api.example.org/rest');

    await component.ngOnInit();
    fixture.detectChanges();

    expect(component.htmlContent.value).toBe(otherHtml);
  });

  describe('contentState behavior', () => {
    it('should initialize contentState to "loading"', async () => {
      const { component } = await setupTest('<div>test</div>');
      expect(component.contentState).toBe('loading');
    });

    it('should set contentState to "found" when content loads successfully', async () => {
      const { component } = await setupTest('<div>Test Content</div>');
      await component.ngOnInit();
      expect(component.contentState).toBe('found');
    });

    it('should set contentState to "not-found" when content is undefined', async () => {
      const htmlContentService = jasmine.createSpyObj('htmlContentService', {
        getHmtlContentByPathAndLocale: Promise.resolve(undefined)
      });

      const responseService = jasmine.createSpyObj('responseService', {
        setNotFound: null
      });

      const appConfig = {
        ...environment,
        ui: { ...(environment as any).ui, namespace: 'testNamespace' },
        rest: { ...(environment as any).rest }
      };

      await TestBed.configureTestingModule({
        declarations: [ StaticPageComponent, ClarinSafeHtmlPipe ],
        imports: [ TranslateModule.forRoot() ],
        providers: [
          { provide: HtmlContentService, useValue: htmlContentService },
          { provide: Router, useValue: new RouterMock() },
          { provide: ServerResponseService, useValue: responseService },
          { provide: APP_CONFIG, useValue: appConfig }
        ]
      }).compileComponents();

      const fixture = TestBed.createComponent(StaticPageComponent);
      const component = fixture.componentInstance;

      await component.ngOnInit();

      expect(component.contentState).toBe('not-found');
      expect(responseService.setNotFound).toHaveBeenCalled();
    });
  });

  describe('change detection', () => {
    it('should call changeDetector.detectChanges() after successful content load', async () => {
      const { component } = await setupTest('<div>test</div>');
      spyOn((component as any).changeDetector, 'detectChanges');

      await component.ngOnInit();

      expect((component as any).changeDetector.detectChanges).toHaveBeenCalled();
    });

    it('should call changeDetector.detectChanges() when content not found', async () => {
      const htmlContentService = jasmine.createSpyObj('htmlContentService', {
        getHmtlContentByPathAndLocale: Promise.resolve(undefined)
      });

      const responseService = jasmine.createSpyObj('responseService', {
        setNotFound: null
      });

      const appConfig = {
        ...environment,
        ui: { ...(environment as any).ui, namespace: 'testNamespace' },
        rest: { ...(environment as any).rest }
      };

      await TestBed.configureTestingModule({
        declarations: [ StaticPageComponent, ClarinSafeHtmlPipe ],
        imports: [ TranslateModule.forRoot() ],
        providers: [
          { provide: HtmlContentService, useValue: htmlContentService },
          { provide: Router, useValue: new RouterMock() },
          { provide: ServerResponseService, useValue: responseService },
          { provide: APP_CONFIG, useValue: appConfig }
        ]
      }).compileComponents();

      const fixture = TestBed.createComponent(StaticPageComponent);
      const component = fixture.componentInstance;

      spyOn((component as any).changeDetector, 'detectChanges');

      await component.ngOnInit();

      expect((component as any).changeDetector.detectChanges).toHaveBeenCalled();
    });
  });
});
