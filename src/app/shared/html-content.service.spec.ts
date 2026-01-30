import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';
import { HtmlContentService } from './html-content.service';
import { LocaleService } from '../core/locale/locale.service';

describe('HtmlContentService', () => {
  let service: HtmlContentService;
  let httpClient: jasmine.SpyObj<HttpClient>;
  let localeService: jasmine.SpyObj<LocaleService>;

  beforeEach(() => {
    const httpSpy = jasmine.createSpyObj('HttpClient', ['get']);
    const localeSpy = jasmine.createSpyObj('LocaleService', ['getCurrentLanguageCode']);

    TestBed.configureTestingModule({
      providers: [
        HtmlContentService,
        { provide: HttpClient, useValue: httpSpy },
        { provide: LocaleService, useValue: localeSpy }
      ]
    });

    service = TestBed.inject(HtmlContentService);
    httpClient = TestBed.inject(HttpClient) as jasmine.SpyObj<HttpClient>;
    localeService = TestBed.inject(LocaleService) as jasmine.SpyObj<LocaleService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getHmtlContentByPathAndLocale - fallback mechanism', () => {
    it('should return English fallback when Czech translation not found (404)', async () => {
      localeService.getCurrentLanguageCode.and.returnValue('cs');

      const czechContent404 = new HttpResponse({ status: 404, body: '' });
      const englishContent200 = new HttpResponse({ status: 200, body: '<div>English Content</div>' });

      httpClient.get.and.returnValues(
        of(czechContent404),
        of(czechContent404),
        of(englishContent200)
      );

      const result = await service.getHmtlContentByPathAndLocale('license');

      expect(result).toBe('<div>English Content</div>');
      expect(httpClient.get).toHaveBeenCalledTimes(3);
    });

    it('should return localized content when translation exists (200)', async () => {
      localeService.getCurrentLanguageCode.and.returnValue('cs');

      const czechContent200 = new HttpResponse({ status: 200, body: '<div>Czech Content</div>' });

      httpClient.get.and.returnValue(of(czechContent200));

      const result = await service.getHmtlContentByPathAndLocale('license');

      expect(result).toBe('<div>Czech Content</div>');
      expect(httpClient.get).toHaveBeenCalledTimes(1);
    });

    it('should return English content directly when language is "en"', async () => {
      localeService.getCurrentLanguageCode.and.returnValue('en');

      const englishContent200 = new HttpResponse({ status: 200, body: '<div>English Content</div>' });

      httpClient.get.and.returnValue(of(englishContent200));

      const result = await service.getHmtlContentByPathAndLocale('license');

      expect(result).toBe('<div>English Content</div>');
      expect(httpClient.get).toHaveBeenCalledTimes(1);
      expect(httpClient.get.calls.mostRecent().args[0]).toContain('static-files/license.html');
      expect(httpClient.get.calls.mostRecent().args[0]).not.toContain('/cs/');
    });

    it('should return undefined when both Czech and English files not found', async () => {
      localeService.getCurrentLanguageCode.and.returnValue('cs');

      const content404 = new HttpResponse({ status: 404, body: '' });

      httpClient.get.and.returnValue(of(content404));

      const result = await service.getHmtlContentByPathAndLocale('nonexistent');

      expect(result).toBeUndefined();
      expect(httpClient.get).toHaveBeenCalledTimes(4);
    });
  });
});
