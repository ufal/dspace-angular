import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { firstValueFrom, of as observableOf } from 'rxjs';
import { HTML_SUFFIX, STATIC_FILES_PROJECT_PATH } from '../static-page/static-page-routing-paths';
import { isEmpty } from './empty.util';
import { LocaleService } from '../core/locale/locale.service';

/**
 * Service for loading static `.html` files stored in the `/static-files` folder.
 */
@Injectable()
export class HtmlContentService {
  constructor(private http: HttpClient,
              private localeService: LocaleService,) {}

  /**
   * Load `.html` file content and return the full response.
   * @param url file location
   */
  fetchHtmlContent(url: string) {
    return this.http.get(url, { responseType: 'text', observe: 'response' }).pipe(
      catchError((error) => observableOf(new HttpResponse({ status: error.status || 0, body: '' }))));
  }

  /**
   * Append a cache-busting query parameter to force a fresh response.
    * Uses a deterministic value to remain SSR-safe and cache-friendly.
   * @param url file location
   */
  private appendCacheBust(url: string): string {
    const cacheBustParam = 'cacheBust=';
    if (url.includes(cacheBustParam)) {
      return url;
    }
    const separator = url.includes('?') ? '&' : '?';
    const cacheBustValue = '1';
    return `${url}${separator}${cacheBustParam}${cacheBustValue}`;
  }

  /**
   * Load HTML content and handle cached 304 responses.
   * @param url file location
   */
  private async loadHtmlContent(url: string): Promise<string | undefined> {
    const response = await firstValueFrom(this.fetchHtmlContent(url));
    if (response.status === 404) {
      const refreshed = await firstValueFrom(this.fetchHtmlContent(this.appendCacheBust(url)));
      if (refreshed.status === 404) {
        return undefined;
      }
      if (refreshed.status === 200) {
        return refreshed.body ?? '';
      }
    }
    if (response.status === 200) {
      return response.body ?? '';
    }
    if (response.status === 304) {
      return response.body ?? '';
    }
    return undefined;
  }

  /**
   * Get the html file content as a string by the file name and the current locale.
   */
  async getHmtlContentByPathAndLocale(fileName: string) {
    let url = '';
    // Get current language
    let language = this.localeService.getCurrentLanguageCode();
    // If language is default = `en` do not load static files from translated package e.g. `cs`.
    language = language === 'en' ? '' : language;

    // Try to find the html file in the translated package. `static-files/language_code/some_file.html`
    // Compose url
    url = STATIC_FILES_PROJECT_PATH;
    url += isEmpty(language) ? '/' + fileName : '/' + language + '/' + fileName;
    // Add `.html` suffix to get the current html file
    url = url.endsWith(HTML_SUFFIX) ? url : url + HTML_SUFFIX;
    let potentialContent = await this.loadHtmlContent(url);
    if (potentialContent !== undefined) {
      return potentialContent;
    }

    // If the file wasn't find, get the non-translated file from the default package.
    url = STATIC_FILES_PROJECT_PATH + '/' + fileName;
    // Add `.html` suffix to match localized request behavior
    url = url.endsWith(HTML_SUFFIX) ? url : url + HTML_SUFFIX;
    potentialContent = await this.loadHtmlContent(url);
    if (potentialContent !== undefined) {
      return potentialContent;
    }
  }
}
