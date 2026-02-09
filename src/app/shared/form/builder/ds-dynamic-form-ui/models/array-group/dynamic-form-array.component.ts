import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { Component, EventEmitter, Input, Output, QueryList } from '@angular/core';
import { UntypedFormGroup } from '@angular/forms';
import {
  DynamicFormArrayComponent,
  DynamicFormControlCustomEvent,
  DynamicFormControlEvent,
  DynamicFormControlLayout,
  DynamicFormControlModel,
  DynamicFormLayout,
  DynamicFormLayoutService,
  DynamicFormValidationService,
  DynamicTemplateDirective
} from '@ng-dynamic-forms/core';
import { Relationship } from '../../../../../../core/shared/item-relationships/relationship.model';
import { hasValue } from '../../../../../empty.util';
import { DynamicRowArrayModel } from '../ds-dynamic-row-array-model';

@Component({
  selector: 'ds-dynamic-form-array',
  templateUrl: './dynamic-form-array.component.html',
  styleUrls: ['./dynamic-form-array.component.scss']
})
export class DsDynamicFormArrayComponent extends DynamicFormArrayComponent {

  @Input() bindId = true;
  @Input() formModel: DynamicFormControlModel[];
  @Input() formLayout: DynamicFormLayout;
  @Input() group: UntypedFormGroup;
  @Input() layout: DynamicFormControlLayout;
  @Input() model: DynamicRowArrayModel;// DynamicRow?
  @Input() templates: QueryList<DynamicTemplateDirective> | undefined;

  /* eslint-disable @angular-eslint/no-output-rename */
  @Output('dfBlur') blur: EventEmitter<DynamicFormControlEvent> = new EventEmitter<DynamicFormControlEvent>();
  @Output('dfChange') change: EventEmitter<DynamicFormControlEvent> = new EventEmitter<DynamicFormControlEvent>();
  @Output('dfFocus') focus: EventEmitter<DynamicFormControlEvent> = new EventEmitter<DynamicFormControlEvent>();
  @Output('ngbEvent') customEvent: EventEmitter<DynamicFormControlCustomEvent> = new EventEmitter();

  /* eslint-enable @angular-eslint/no-output-rename */

  constructor(protected layoutService: DynamicFormLayoutService,
              protected validationService: DynamicFormValidationService,
  ) {
    super(layoutService, validationService);
  }

  moveSelection(event: CdkDragDrop<Relationship>) {

    // prevent propagating events generated releasing on the same position
    if (event.previousIndex === event.currentIndex) {
      return;
    }

    this.model.moveGroup(event.previousIndex, event.currentIndex - event.previousIndex);
    const prevIndex = event.previousIndex;
    const index = event.currentIndex;

    if (hasValue(this.model.groups[index]) && hasValue((this.control as any).controls[index])) {
      this.onCustomEvent({
        previousIndex: prevIndex,
        index,
        arrayModel: this.model,
        model: this.model.groups[index].group[0],
        control: (this.control as any).controls[index]
      }, 'move');
    }
  }

  update(event: any, index: number) {
    const $event = Object.assign({}, event, {
      context: { index: index - 1}
    });

    this.onChange($event);
  }

  /**
   * If the drag feature is disabled for this DynamicRowArrayModel.
   */
  get dragDisabled(): boolean {
    return this.model.groups.length === 1 || !this.model.isDraggable;
  }

  /**
   * Determines whether a group should be hidden (CSS display:none) in visual-empty state.
   * Hides the group when hideGroupsWhenEmpty flag is set, it's the first group, it's the only group, and it's empty.
   *
   * @param index The group index to check
   * @returns true if the group should be hidden
   */
  shouldHideGroup(index: number): boolean {
    const hideFlag = this.model.hideGroupsWhenEmpty;
    const isFirstGroup = index === 0;
    const isSingleGroup = this.model.groups.length === 1;
    const isEmpty = this.isGroupEmpty(index);

    const shouldHide = hideFlag && isFirstGroup && isSingleGroup && isEmpty;

    return shouldHide;
  }

  /**
   * Check if a specific group in the array is visually empty (all controls have no meaningful values).
   * Used to determine visual-empty state for conditional hiding.
   *
   * @param index The group index to check
   * @returns true if the group at the given index has all empty controls
   */
  isGroupEmpty(index: number): boolean {
    const formArray = this.control as any;
    if (!formArray || !formArray.length || index >= formArray.length) {
      return false;
    }

    const groupControl = formArray.at(index);
    if (!groupControl || typeof groupControl.value !== 'object') {
      return false;
    }

    const values = groupControl.value;
    if (!values) {
      return true;
    }

    const keys = Object.keys(values);
    for (const key of keys) {
      const value = values[key];
      if (hasValue(value)) {
        if (typeof value === 'string' && value.trim() !== '') {
          return false;
        } else if (typeof value === 'object' && value !== null) {
          if (Array.isArray(value) && value.length > 0) {
            return false;
          } else if (value.hasOwnProperty('value') && value.value && value.value !== '') {
            return false;
          } else {
            const objKeys = Object.keys(value);
            const hasNonEmptyProp = objKeys.some(objKey => {
              const propValue = value[objKey];
              const isNonEmpty = propValue !== null &&
                                 propValue !== undefined &&
                                 propValue !== '' &&
                                 !(Array.isArray(propValue) && propValue.length === 0);
              return isNonEmpty;
            });
            if (hasNonEmptyProp) {
              return false;
            }
          }
        } else if (typeof value === 'number' || typeof value === 'boolean') {
          return false;
        }
      }
    }
    return true;
  }
}
