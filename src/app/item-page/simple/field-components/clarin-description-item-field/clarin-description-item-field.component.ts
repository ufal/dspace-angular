import { Component, Inject, Input, OnInit } from '@angular/core';
import { Item } from '../../../../core/shared/item.model';
import { makeLinks } from '../../../../shared/clarin-shared-util';
import { APP_CONFIG, AppConfig } from '../../../../../config/app-config.interface';

@Component({
  selector: 'ds-clarin-description-item-field',
  templateUrl: './clarin-description-item-field.component.html',
  styleUrls: ['./clarin-description-item-field.component.scss']
})
export class ClarinDescriptionItemFieldComponent implements OnInit {

  constructor(@Inject(APP_CONFIG) private appConfig: AppConfig) {}

  /**
   * The item to display metadata for
   */
  @Input() item: Item;

  /**
   * Fields (schema.element.qualifier) used to render their values.
   */
  @Input() fields: string[];

  /**
   * The valid text metadata to display - updated with links
   */
  validTextMetadata: string;

  /**
   * This variable will be true if {@link appConfig.markdown.enabled} is true.
   */
  renderMarkdown: boolean;

  ngOnInit(): void {
    this.renderMarkdown = !!this.appConfig.markdown.enabled && this.markdownEnabled();

    // Store all description metadata values
    let updatedMVs = [];
    this.item.allMetadataValues(this.fields).forEach((value) => {
      updatedMVs.push(this.renderMarkdown ? value : makeLinks(value));
    });

    // Join the metadata values with a line break
    this.validTextMetadata = updatedMVs.join('<br>');
  }

  /**
   * Check if the item uses Markdown to render description text.
   * */
  private markdownEnabled() {
    const useMarkdown = this.item.metadata?.['local.description.usemarkdown']?.[0]?.value;
    return useMarkdown !== undefined && useMarkdown.toLowerCase() === 'yes';
  }

}
