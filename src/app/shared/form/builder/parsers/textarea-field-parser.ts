import { FieldParser } from './field-parser';
import { DynamicFormControlLayout } from '@ng-dynamic-forms/core';
import { FormFieldMetadataValueObject } from '../models/form-field-metadata-value.model';
import {
  DsDynamicTextAreaModel,
  DsDynamicTextAreaModelConfig
} from '../ds-dynamic-form-ui/models/ds-dynamic-textarea.model';
import { environment } from '../../../../../environments/environment';
import { MARKDOWN_DESCRIPTION_METADATA_ALLOW_LIST } from '../constants/markdown-description-metadata-allow-list';

export class TextareaFieldParser extends FieldParser {
  protected readonly markdownDescriptionMetadataAllowList: string[] = MARKDOWN_DESCRIPTION_METADATA_ALLOW_LIST;

  public modelFactory(fieldValue?: FormFieldMetadataValueObject | any, label?: boolean): any {
    const textAreaModelConfig: DsDynamicTextAreaModelConfig = this.initModel(null, label);

    let layout: DynamicFormControlLayout;

    layout = {
      element: {
        label: 'col-form-label'
      }
    };

    textAreaModelConfig.rows = 10;
    textAreaModelConfig.spellCheck = environment.form.spellCheck;
    textAreaModelConfig.supportsMarkdownPreview = this.isDescriptionMetadataField(textAreaModelConfig.metadataFields);
    this.setValues(textAreaModelConfig, fieldValue);
    const textAreaModel = new DsDynamicTextAreaModel(textAreaModelConfig, layout);

    return textAreaModel;
  }

  /**
   * Check if any metadata field used by this textarea represents a description field.
   */
  protected isDescriptionMetadataField(metadataFields: string[] = []): boolean {
    return metadataFields.some((metadataField: string) => this.markdownDescriptionMetadataAllowList.includes(metadataField));
  }
}
