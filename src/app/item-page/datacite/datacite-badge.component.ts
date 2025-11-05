import { AfterViewInit, Component, Inject, Input, OnInit, PLATFORM_ID } from '@angular/core';
import { APP_CONFIG, AppConfig } from 'src/config/app-config.interface';
import { isPlatformBrowser } from '@angular/common';
import { Item } from 'src/app/core/shared/item.model';
import { ItemIdentifierService } from 'src/app/shared/item-identifier.service';
import { isEmpty, isNotEmpty } from 'src/app/shared/empty.util';

@Component({
  selector: 'ds-datacite-badge',
  templateUrl: './datacite-badge.component.html',
  styleUrls: ['./datacite-badge.component.scss']
})
export class DataciteBadgeComponent implements OnInit, AfterViewInit {
  /**
   * Item to display the badge for
   */
  @Input() item: Item;

  /**
   * Flag indicating whether the badge should be displayed
   */
  showBadge = true;

  /**
   * The DOI (Digital Object Identifier) extracted from the item's metadata
   */
  doi: string = null;

  /**
   * Display mode for the DataCite badge (e.g., 'small', 'regular')
   */
  displayMode = 'small';

  /**
   * Flag tracking whether the external DataCite scripts have been loaded
   */
  private scriptsLoaded = false;

  /**
   * Flag indicating whether the code is running in a browser environment
   */
  isBrowser: boolean;

  /**
   * Metadata field name to extract the DOI from (configured via app config)
   */
  private metadataField: string;

  constructor(@Inject(PLATFORM_ID) private platformId: Object,
    @Inject(APP_CONFIG) private appConfig: AppConfig,
    private itemIdentifierService: ItemIdentifierService) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  /**
   * Initialize the component by checking if the badge is enabled and extracting the DOI
   * Only runs in browser environment when an item is provided
   */
  async ngOnInit(): Promise<void> {
    if (!this.isBrowser || !this.item) {
      return;
    }
    const badgeEnabled = this.appConfig.datacite ? true : false;
    if (!badgeEnabled) {
      return;
    }

    this.metadataField = this.appConfig.datacite;
    this.doi = await this.extractDOI();

    if (isNotEmpty(this.doi)) {
      this.showBadge = true;
    }
  }

  /**
   * Load the DataCite scripts after the view has been initialized
   * Only runs if the badge should be shown and scripts haven't been loaded yet
   */
  ngAfterViewInit(): void {
    if (this.showBadge && this.isBrowser && !this.scriptsLoaded) {
      this.loadDataCiteScripts();
    }
  }

  /**
   * Extract and prettify the DOI from the item's metadata
   * @returns A promise that resolves to the cleaned DOI string or null if not found
   */
  async extractDOI(): Promise<string> {
    const fieldValue = this.item?.firstMetadataValue(this.metadataField);
    if (isEmpty(fieldValue)) {
      return null;
    }
    const cleanDoi = await this.itemIdentifierService.prettifyIdentifier(fieldValue, [this.metadataField]);
    return cleanDoi;
  }

  /**
   * Load the required DataCite scripts (Vue.js, Web Components polyfill, and DataCite badge)
   * Hides the badge if script loading fails
   */
  async loadDataCiteScripts() {
    if (this.scriptsLoaded) {
      return;
    }
    try {
      await this.loadScript('https://unpkg.com/vue@^2/dist/vue.min.js');
      await this.loadScript('https://unpkg.com/@webcomponents/webcomponentsjs@2.0.0/webcomponents-loader.js');
      await this.loadScript('https://unpkg.com/data-metrics-badge/dist/data-metrics-badge.min.js');
      this.scriptsLoaded = true;
    } catch (error) {
      if (error) {
        this.showBadge = false;
      }
    }
  }

  /**
   * Dynamically load a script and append it to the document head
   * @param src URL of the script to load
   * @returns A promise that resolves when the script is loaded or rejects on error
   */
  private loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const existingScript = document.querySelector(`script[src="${src}"]`);
      if (existingScript) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = src;
      script.onload = () => {
        resolve();
      };
      script.onerror = (error) => {
        reject(error);
      };
      document.head.appendChild(script);
    })
  };
}
