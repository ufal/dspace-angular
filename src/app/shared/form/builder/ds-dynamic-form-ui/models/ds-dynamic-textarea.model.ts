import { DYNAMIC_FORM_CONTROL_TYPE_TEXTAREA, DynamicFormControlLayout, serializable } from '@ng-dynamic-forms/core';
import { DsDynamicInputModel, DsDynamicInputModelConfig } from './ds-dynamic-input.model';

export interface DsDynamicTextAreaModelConfig extends DsDynamicInputModelConfig {
  cols?: number;
  rows?: number;
  wrap?: string;
  supportsMarkdownPreview?: boolean;
}

export class DsDynamicTextAreaModel extends DsDynamicInputModel {
  @serializable() cols: number;
  @serializable() rows: number;
  @serializable() wrap: string;
  @serializable() supportsMarkdownPreview: boolean;
  @serializable() type = DYNAMIC_FORM_CONTROL_TYPE_TEXTAREA;

  constructor(config: DsDynamicTextAreaModelConfig, layout?: DynamicFormControlLayout) {
    super(config, layout);

    this.cols = config.cols;
    this.rows = config.rows;
    this.wrap = config.wrap;
    this.supportsMarkdownPreview = config.supportsMarkdownPreview;
  }

}
