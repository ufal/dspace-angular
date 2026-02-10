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
import { LiveRegionService } from '../../../../../live-region/live-region.service';
import { TranslateService } from '@ngx-translate/core';

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

  elementBeingSorted: HTMLElement;
  elementBeingSortedStartingIndex: number;

  /* eslint-disable @angular-eslint/no-output-rename */
  @Output('dfBlur') blur: EventEmitter<DynamicFormControlEvent> = new EventEmitter<DynamicFormControlEvent>();
  @Output('dfChange') change: EventEmitter<DynamicFormControlEvent> = new EventEmitter<DynamicFormControlEvent>();
  @Output('dfFocus') focus: EventEmitter<DynamicFormControlEvent> = new EventEmitter<DynamicFormControlEvent>();
  @Output('ngbEvent') customEvent: EventEmitter<DynamicFormControlCustomEvent> = new EventEmitter();

  /* eslint-enable @angular-eslint/no-output-rename */

  constructor(protected layoutService: DynamicFormLayoutService,
              protected validationService: DynamicFormValidationService,
              protected liveRegionService: LiveRegionService,
              protected translateService: TranslateService,
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
   * Gets the control of the specified group model. It adds the startingIndex property to the group model if it does not
   * already have it. This ensures that the controls are always linked to the correct group model.
   * @param groupModel The group model to get the control for.
   * @returns The form control of the specified group model.
   */
  getControlOfGroup(groupModel: any) {
    if (!groupModel.hasOwnProperty('startingIndex')) {
      groupModel.startingIndex = groupModel.index;
    }
    return this.control.get([groupModel.startingIndex]);
  }

  /**
   * Toggles the keyboard drag and drop feature for the given sortable element.
   * @param event
   * @param sortableElement
   * @param index
   * @param length
   */
  toggleKeyboardDragAndDrop(event: KeyboardEvent, sortableElement: HTMLDivElement, index: number, length: number) {
    event.preventDefault();
    if (this.elementBeingSorted) {
      this.stopKeyboardDragAndDrop(sortableElement, index, length);
    } else {
      sortableElement.classList.add('sorting-with-keyboard');
      this.elementBeingSorted = sortableElement;
      this.elementBeingSortedStartingIndex = index;
      this.liveRegionService.clear();
      this.liveRegionService.addMessage(this.translateService.instant('live-region.ordering.status', {
        itemName: sortableElement.querySelector('input')?.value,
        index: index + 1,
        length,
      }));
    }
  }

  /**
   * Stops the keyboard drag and drop feature.
   * @param sortableElement
   * @param index
   * @param length
   */
  stopKeyboardDragAndDrop(sortableElement: HTMLDivElement, index: number, length: number) {
    this.elementBeingSorted?.classList.remove('sorting-with-keyboard');
    this.liveRegionService.clear();
    if (this.elementBeingSorted) {
      this.elementBeingSorted = null;
      this.elementBeingSortedStartingIndex = null;
      this.liveRegionService.addMessage(this.translateService.instant('live-region.ordering.dropped', {
        itemName: sortableElement.querySelector('input')?.value,
        index: index + 1,
        length,
      }));
    }
  }

  /**
   * Handles the keyboard arrow press event to move the element up or down.
   * @param event
   * @param dropList
   * @param length
   * @param idx
   * @param direction
   */
  handleArrowPress(event: KeyboardEvent, dropList: HTMLDivElement, length: number, idx: number, direction: 'up' | 'down') {
    let newIndex = direction === 'up' ? idx - 1 : idx + 1;
    if (newIndex < 0) {
      newIndex = length - 1;
    } else if (newIndex >= length) {
      newIndex = 0;
    }

    if (this.elementBeingSorted) {
      this.model.moveGroup(idx, newIndex - idx);
      if (hasValue(this.model.groups[newIndex]) && hasValue((this.control as any).controls[newIndex])) {
        this.onCustomEvent({
          previousIndex: idx,
          newIndex,
          arrayModel: this.model,
          model: this.model.groups[newIndex].group[0],
          control: (this.control as any).controls[newIndex],
        }, 'move');
        this.liveRegionService.clear();
        this.liveRegionService.addMessage(this.translateService.instant('live-region.ordering.moved', {
          itemName: this.elementBeingSorted.querySelector('input')?.value,
          index: newIndex + 1,
          length,
        }));
      }
      event.preventDefault();
      // Set focus back to the moved element
      setTimeout(() => {
        this.setFocusToDropListElementOfIndex(dropList, newIndex, direction);
      });
    } else {
      event.preventDefault();
      this.setFocusToDropListElementOfIndex(dropList, newIndex, direction);
    }
  }

  cancelKeyboardDragAndDrop(sortableElement: HTMLDivElement, index: number, length: number) {
    this.model.moveGroup(index, this.elementBeingSortedStartingIndex - index);
    if (hasValue(this.model.groups[this.elementBeingSortedStartingIndex]) && hasValue((this.control as any).controls[this.elementBeingSortedStartingIndex])) {
      this.onCustomEvent({
        previousIndex: index,
        newIndex: this.elementBeingSortedStartingIndex,
        arrayModel: this.model,
        model: this.model.groups[this.elementBeingSortedStartingIndex].group[0],
        control: (this.control as any).controls[this.elementBeingSortedStartingIndex],
      }, 'move');
      this.stopKeyboardDragAndDrop(sortableElement, this.elementBeingSortedStartingIndex, length);
    }
  }

  /**
   * Sets focus to the drag handle of the drop list element of the given index.
   * @param dropList
   * @param index
   * @param direction
   */
  setFocusToDropListElementOfIndex(dropList: HTMLDivElement, index: number, direction: 'up' | 'down') {
    const newDragHandle = dropList.querySelectorAll(`[cdkDragHandle]`)[index] as HTMLElement;
    if (newDragHandle) {
      newDragHandle.focus();
      if (!this.isElementInViewport(newDragHandle)) {
        newDragHandle.scrollIntoView(direction === 'up');
      }
    }
  }

  /**
   * checks if an element is in the viewport
   * @param el
   */
  isElementInViewport(el: HTMLElement) {
    const rect = el.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }

  /**
   * Adds an instruction message to the live region when the user might want to sort an element.
   * @param sortableElement
   */
  addInstructionMessageToLiveRegion(sortableElement: HTMLDivElement) {
    if (!this.elementBeingSorted) {
      this.liveRegionService.clear();
      this.liveRegionService.addMessage(this.translateService.instant('live-region.ordering.instructions', {
        itemName: sortableElement.querySelector('input')?.value,
      }));
    }
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
