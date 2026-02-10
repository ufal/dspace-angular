import { distinctUntilChanged, filter, map } from 'rxjs/operators';
import { ChangeDetectorRef, Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { AbstractControl, UntypedFormArray, UntypedFormControl, UntypedFormGroup } from '@angular/forms';

import { Observable, Subscription } from 'rxjs';
import {
  DynamicFormArrayModel,
  DynamicFormControlEvent,
  DynamicFormControlModel,
  DynamicFormGroupModel,
  DynamicFormLayout,
} from '@ng-dynamic-forms/core';
import { NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import findIndex from 'lodash/findIndex';

import { FormBuilderService } from './builder/form-builder.service';
import { hasValue, isNotEmpty, isNotNull, isNull } from '../empty.util';
import { FormService } from './form.service';
import { isFormGroupEmpty } from './utils/form-group-empty.util';
import { FormEntry, FormError } from './form.reducer';
import { FormFieldMetadataValueObject } from './builder/models/form-field-metadata-value.model';

/**
 * The default form component.
 */
@Component({
  exportAs: 'formComponent',
  selector: 'ds-form',
  styleUrls: ['form.component.scss'],
  templateUrl: 'form.component.html'
})
export class FormComponent implements OnDestroy, OnInit {

  private formErrors: FormError[] = [];
  private formValid: boolean;

  /**
   * Cache for isFirstGroupEmpty results to optimize change detection.
   * Cleared automatically on form value changes to prevent stale data.
   * Key: arrayContext.id, Value: boolean (isEmpty result)
   */
  private emptyStateCache: Map<string, boolean> = new Map();

  /**
   * A boolean that indicate if to display form's submit button
   */
  @Input() displaySubmit = true;

  /**
   * A boolean that indicate if to display form's cancel button
   */
  @Input() displayCancel = true;

  /**
   * A boolean that indicate if to emit a form change event
   */
  @Input() emitChange = true;

  /**
   * The form unique ID
   */
  @Input() formId: string;

  /**
   * i18n key for the submit button
   */
  @Input() submitLabel = 'form.submit';

  /**
   * i18n key for the cancel button
   */
  @Input() cancelLabel = 'form.cancel';

  /**
   * An array of DynamicFormControlModel type
   */
  @Input() formModel: DynamicFormControlModel[];
  @Input() parentFormModel: DynamicFormGroupModel | DynamicFormGroupModel[];
  @Input() formGroup: UntypedFormGroup;
  @Input() formLayout = null as DynamicFormLayout;

  /* eslint-disable @angular-eslint/no-output-rename */
  @Output('dfBlur') blur: EventEmitter<DynamicFormControlEvent> = new EventEmitter<DynamicFormControlEvent>();
  @Output('dfChange') change: EventEmitter<DynamicFormControlEvent> = new EventEmitter<DynamicFormControlEvent>();
  @Output('dfFocus') focus: EventEmitter<DynamicFormControlEvent> = new EventEmitter<DynamicFormControlEvent>();
  @Output('ngbEvent') customEvent: EventEmitter<DynamicFormControlEvent> = new EventEmitter<DynamicFormControlEvent>();
  /* eslint-enable @angular-eslint/no-output-rename */
  @Output() addArrayItem: EventEmitter<DynamicFormControlEvent> = new EventEmitter<DynamicFormControlEvent>();
  @Output() removeArrayItem: EventEmitter<DynamicFormControlEvent> = new EventEmitter<DynamicFormControlEvent>();

  /**
   * An event fired when form is valid and submitted .
   * Event's payload equals to the form content.
   */
  @Output() cancel: EventEmitter<Observable<any>> = new EventEmitter<Observable<any>>();

  /**
   * An event fired when form is valid and submitted .
   * Event's payload equals to the form content.
   */
  @Output() submitForm: EventEmitter<Observable<any>> = new EventEmitter<Observable<any>>();

  /**
   * Reference to NgbModal
   */
  modalRef: NgbModalRef;

  /**
   * Array to track all subscriptions and unsubscribe them onDestroy
   * @type {Array}
   */
  private subs: Subscription[] = [];

  constructor(private formService: FormService,
              protected changeDetectorRef: ChangeDetectorRef,
              private formBuilderService: FormBuilderService) {
  }

  /**
   * Method provided by Angular. Invoked after the view has been initialized.
   */

  /*ngAfterViewChecked(): void {
    this.subs.push(this.formGroup.valueChanges
      .filter((formGroup) => this.formGroup.dirty)
      .subscribe(() => {
        // Dispatch a FormChangeAction if the user has changed the value in the UI
        this.store.dispatch(new FormChangeAction(this.formId, this.formGroup.value));
        this.formGroup.markAsPristine();
      }));
  }*/

  private getFormGroup(): UntypedFormGroup {
    if (!!this.parentFormModel) {
      return this.formGroup.parent as UntypedFormGroup;
    }

    return this.formGroup;
  }

  private getFormGroupValue() {
    return this.getFormGroup().value;
  }

  private getFormGroupValidStatus() {
    return this.getFormGroup().valid;
  }

  /**
   * Method provided by Angular. Invoked after the constructor
   */
  ngOnInit() {
    if (!this.formGroup) {
      this.formGroup = this.formBuilderService.createFormGroup(this.formModel);

    } else {
      this.formModel.forEach((model) => {
        if (this.parentFormModel) {
          this.formBuilderService.addFormGroupControl(this.formGroup, this.parentFormModel, model);
        }
      });
    }

    this.formService.initForm(this.formId, this.formModel, this.getFormGroupValidStatus());

    // TODO: take a look to the following method:
    // this.keepSync();

    this.formValid = this.getFormGroupValidStatus();

    this.subs.push(this.formGroup.statusChanges.pipe(
      filter(() => this.formValid !== this.getFormGroupValidStatus()))
      .subscribe(() => {
        this.formService.setStatusChanged(this.formId, this.getFormGroupValidStatus());
        this.formValid = this.getFormGroupValidStatus();
      }));

    // Clear empty state cache on form value changes to ensure fresh calculations
    // This prevents stale cache while avoiding repeated expensive computations during change detection
    this.subs.push(this.formGroup.valueChanges.subscribe(() => {
      this.emptyStateCache.clear();
    }));

    this.subs.push(
      this.formService.getForm(this.formId).pipe(
        filter((formState: FormEntry) => !!formState && (isNotEmpty(formState.errors) || isNotEmpty(this.formErrors))),
        map((formState) => formState.errors),
        distinctUntilChanged())
        .subscribe((errors: FormError[]) => {
          const { formGroup, formModel } = this;
          errors
            .filter((error: FormError) => findIndex(this.formErrors, {
              fieldId: error.fieldId,
              fieldIndex: error.fieldIndex
            }) === -1)
            .forEach((error: FormError) => {
              const { fieldId } = error;
              const { fieldIndex } = error;
              let field: AbstractControl;
              if (!!this.parentFormModel) {
                field = this.formBuilderService.getFormControlById(fieldId, formGroup.parent as UntypedFormGroup, formModel, fieldIndex);
              } else {
                field = this.formBuilderService.getFormControlById(fieldId, formGroup, formModel, fieldIndex);
              }

              if (field) {
                const model: DynamicFormControlModel = this.formBuilderService.findById(fieldId, formModel, fieldIndex);
                this.formService.addErrorToField(field, model, error.message);
                this.changeDetectorRef.detectChanges();
              }
            });

          this.formErrors
            .filter((error: FormError) => findIndex(errors, {
              fieldId: error.fieldId,
              fieldIndex: error.fieldIndex
            }) === -1)
            .forEach((error: FormError) => {
              const { fieldId } = error;
              const { fieldIndex } = error;
              let field: AbstractControl;
              if (!!this.parentFormModel) {
                field = this.formBuilderService.getFormControlById(fieldId, formGroup.parent as UntypedFormGroup, formModel, fieldIndex);
              } else {
                field = this.formBuilderService.getFormControlById(fieldId, formGroup, formModel, fieldIndex);
              }

              if (field) {
                const model: DynamicFormControlModel = this.formBuilderService.findById(fieldId, formModel, fieldIndex);
                this.formService.removeErrorFromField(field, model, error.message);
              }
            });
          this.formErrors = errors;
          this.changeDetectorRef.detectChanges();
        })
    );
  }

  /**
   * Method provided by Angular. Invoked when the instance is destroyed
   */
  ngOnDestroy() {
    this.subs
      .filter((sub) => hasValue(sub))
      .forEach((sub) => sub.unsubscribe());
    this.formService.removeForm(this.formId);
  }

  /**
   * Method to check if the form status is valid or not
   */
  public isValid(): Observable<boolean> {
    return this.formService.isValid(this.formId);
  }

  /**
   * Method to keep synchronized form controls values with form state
   */
  private keepSync(): void {
    this.subs.push(this.formService.getFormData(this.formId)
      .subscribe((stateFormData) => {
        if (!Object.is(stateFormData, this.formGroup.value) && this.formGroup) {
          this.formGroup.setValue(stateFormData);
        }
      }));
  }

  onBlur(event: DynamicFormControlEvent): void {
    this.blur.emit(event);
    const control: UntypedFormControl = event.control;
    const fieldIndex: number = (event.context && event.context.index) ? event.context.index : 0;
    if (control.valid) {
      this.formService.removeError(this.formId, event.model.name, fieldIndex);
    } else {
      this.formService.addControlErrors(control, this.formId, event.model.name, fieldIndex);
    }
  }

  onCustomEvent(event: any) {
    this.customEvent.emit(event);
  }

  onFocus(event: DynamicFormControlEvent): void {
    this.formService.setTouched(this.formId, this.formModel, event);
    this.focus.emit(event);
  }

  onChange(event: DynamicFormControlEvent): void {
    this.formService.changeForm(this.formId, this.formModel);
    this.formGroup.markAsPristine();

    if (this.emitChange) {
      this.change.emit(event);
    }

    const control: UntypedFormControl = event.control;
    const fieldIndex: number = (event.context && event.context.index) ? event.context.index : 0;
    if (control.valid) {
      this.formService.removeError(this.formId, event.model.id, fieldIndex);
    }
  }

  /**
   * Method called on submit.
   * Emit a new submit Event whether the form is valid, mark fields with error otherwise
   */
  onSubmit(): void {
    if (this.getFormGroupValidStatus()) {
      this.submitForm.emit(this.formService.getFormData(this.formId));
    } else {
      this.formService.validateAllFormFields(this.formGroup);
    }
  }

  /**
   * Method to reset form fields
   */
  reset(): void {
    this.formGroup.reset();
    this.cancel.emit();
  }

  isItemReadOnly(arrayContext: DynamicFormArrayModel, index: number): boolean {
    const context = arrayContext.groups[index];
    const model = context.group[0] as any;
    return model.readOnly;
  }

  removeItem($event, arrayContext: DynamicFormArrayModel, index: number): void {
    const formArrayControl = this.formGroup.get(this.formBuilderService.getPath(arrayContext)) as UntypedFormArray;
    const event = this.getEvent($event, arrayContext, index, 'remove');
    if (this.formBuilderService.isQualdropGroup(event.model as DynamicFormControlModel) && hasValue((event.model as any)?.value)) {
      // In case of qualdrop value remove event must be dispatched before removing the control from array
      this.removeArrayItem.emit(event);
    }
    this.formBuilderService.removeFormArrayGroup(index, formArrayControl, arrayContext);
    this.formService.changeForm(this.formId, this.formModel);
    if (!this.formBuilderService.isQualdropGroup(event.model as DynamicFormControlModel)) {
      // dispatch remove event for any field type except for qualdrop value
      this.removeArrayItem.emit(event);
    }
  }

  insertItem($event, arrayContext: DynamicFormArrayModel, index: number): void {
    const formArrayControl = this.formGroup.get(this.formBuilderService.getPath(arrayContext)) as UntypedFormArray;
    this.formBuilderService.insertFormArrayGroup(index, formArrayControl, arrayContext);
    this.addArrayItem.emit(this.getEvent($event, arrayContext, index, 'add'));
    this.formService.changeForm(this.formId, this.formModel);
  }

  /**
   * Reveal the hidden first group without adding a new group.
   * Used when hideGroupsWhenEmpty flag is set and user clicks "Add" in empty-state.
   * Instead of creating a new group, this just sets hideGroupsWhenEmpty to false
   * to unhide the structurally-required but visually-hidden Group 0.
   *
   * @param $event The click event
   * @param arrayContext The array model context
   */
  revealFirstGroup($event: any, arrayContext: DynamicFormArrayModel): void {
    // Toggle off the hideGroupsWhenEmpty flag to reveal Group 0
    (arrayContext as any).hideGroupsWhenEmpty = false;

    this.formService.changeForm(this.formId, this.formModel);
  }

  /**
   * Clear all values in a single-item array and return to visual-empty state.
   * Used for hideGroupsWhenEmpty arrays where delete should hide the group instead of removing it.
   * This provides symmetric behavior: "Add" reveals → "Delete" hides and clears.
   *
   * @param $event The click event
   * @param arrayContext The array model context
   * @param index The index of the group to clear
   */
  clearItemValues($event: any, arrayContext: DynamicFormArrayModel, index: number): void {
    // Get the form control BEFORE emitting/resetting to log values
    const formArrayControl = this.formGroup.get(this.formBuilderService.getPath(arrayContext)) as UntypedFormArray;
    const groupControl = formArrayControl.at(index);

    // Emit remove event before reset so submission patch ops are created for cleared values
    const removeEvent = this.getEvent($event, arrayContext, index, 'remove');

    // Mark this as a "clear last item" operation (not a regular multi-item delete)
    // This flag distinguishes: delete last item (→ REMOVE field) vs delete one of many (→ ADD updated array)
    (removeEvent as any).isClearLastItem = true;

    this.removeArrayItem.emit(removeEvent);

    if (groupControl) {
      groupControl.reset();  // Clears all form controls in the group

      // CRITICAL: reset() doesn't mark form as dirty, but we need to save the "cleared" state
      // Mark controls as dirty so formService.changeForm() creates patch operations
      groupControl.markAsDirty();
      groupControl.markAsTouched();
      formArrayControl.markAsDirty();
      this.formGroup.markAsDirty();
    }

    // Re-enable visual-empty state to hide fields and show "Add" button
    (arrayContext as any).hideGroupsWhenEmpty = true;

    // Notify form service of change so save button enables
    this.formService.changeForm(this.formId, this.formModel);
  }

  /**
   * Route delete action: for single-item hideGroupsWhenEmpty arrays, clear instead of remove.
   * For multi-item arrays, perform standard removal.
   *
   * @param $event The click event
   * @param arrayContext The array model context
   * @param index The index of the group to delete
   */
  handleItemDelete($event: any, arrayContext: DynamicFormArrayModel, index: number): void {
    const hideWhenEmpty = (arrayContext as any).hideGroupsWhenEmpty;
    const isSingleGroup = arrayContext.groups.length === 1;
    const shouldClear = hideWhenEmpty && isSingleGroup;

    // For single-item arrays with hideGroupsWhenEmpty: clear instead of remove
    if (shouldClear) {
      this.clearItemValues($event, arrayContext, index);
    } else {
      // For multi-item arrays: standard removal
      this.removeItem($event, arrayContext, index);
    }
  }

  isVirtual(arrayContext: DynamicFormArrayModel, index: number) {
    const context = arrayContext.groups[index];
    const value: FormFieldMetadataValueObject = (context.group[0] as any).metadataValue;
    return isNotEmpty(value) && value.isVirtual;
  }

  /**
   * Determines whether the delete button should be displayed for an array item.
   * Shows delete button when multiple groups exist, or for single-item arrays with allowDeleteOnSingleItem enabled (unless in visual-empty state).
   *
   * @param arrayContext The array model context
   * @param index The index of the item
   * @returns true if delete button should be visible
   */
  shouldShowDeleteButton(arrayContext: DynamicFormArrayModel, index: number): boolean {
    const notRepeatable = (arrayContext as any).notRepeatable;
    const isVirtualItem = this.isVirtual(arrayContext, index);
    const isReadOnly = this.isItemReadOnly(arrayContext, index);
    const multipleGroups = arrayContext.groups.length > 1;
    const allowDeleteSingle = (arrayContext as any).allowDeleteOnSingleItem;
    const hideWhenEmpty = (arrayContext as any).hideGroupsWhenEmpty;
    const singleGroup = arrayContext.groups.length === 1;
    const isEmpty = this.isFirstGroupEmpty(arrayContext);
    const inVisualEmptyState = hideWhenEmpty && singleGroup && isEmpty;

    const shouldShow = !notRepeatable && !isVirtualItem && !isReadOnly &&
                        (multipleGroups || (allowDeleteSingle && !inVisualEmptyState));

    return shouldShow;
  }

  /**
   * Determines whether the "Add" button should be displayed in empty-state.
   * Shows button only when hideGroupsWhenEmpty is enabled, field is single-item and empty, at first index, and not read-only.
   *
   * @param arrayContext The array model context
   * @param index The index of the item
   * @returns true if empty-state Add button should be visible
   */
  shouldShowEmptyStateAddButton(arrayContext: DynamicFormArrayModel, index: number): boolean {
    const notRepeatable = (arrayContext as any).notRepeatable;
    const hideWhenEmpty = (arrayContext as any).hideGroupsWhenEmpty;
    const singleGroup = arrayContext.groups.length === 1;
    const isFirstIndex = index === 0;
    const isEmpty = this.isFirstGroupEmpty(arrayContext);
    const isReadOnly = this.isItemReadOnly(arrayContext, index);

    const shouldShow = !notRepeatable && hideWhenEmpty && singleGroup && isFirstIndex && isEmpty && !isReadOnly;

    return shouldShow;
  }

  /**
   * Check if the first group in an array is visually empty (all controls have no meaningful values).
   * This is used to determine visual-empty state independent of structural state (FormArray always has 1 group minimum).
   * Delegates to shared utility function for consistent empty detection.
   *
   * Uses memoization to optimize performance during change detection. Cache is cleared on form value changes.
   *
   * @param arrayContext The array model context
   * @returns true if first group exists and all its controls are empty/null
   */
  isFirstGroupEmpty(arrayContext: DynamicFormArrayModel): boolean {
    // Check cache first to avoid repeated expensive computations during change detection
    const cacheKey = arrayContext.id;
    if (this.emptyStateCache.has(cacheKey)) {
      return this.emptyStateCache.get(cacheKey);
    }

    // Must have at least one group
    if (!arrayContext.groups || arrayContext.groups.length === 0) {
      this.emptyStateCache.set(cacheKey, false);
      return false;
    }

    // Get the FormArray control
    const formArrayControl = this.formGroup.get(this.formBuilderService.getPath(arrayContext)) as UntypedFormArray;
    if (!formArrayControl || formArrayControl.length === 0) {
      this.emptyStateCache.set(cacheKey, false);
      return false;
    }

    // Get first group's FormGroup
    const firstGroupControl = formArrayControl.at(0) as UntypedFormGroup;
    if (!firstGroupControl) {
      this.emptyStateCache.set(cacheKey, false);
      return false;
    }

    // Use shared utility to check if the form group is empty (expensive operation)
    const isEmpty = isFormGroupEmpty(firstGroupControl);

    // Cache the result for subsequent calls during this change detection cycle
    this.emptyStateCache.set(cacheKey, isEmpty);

    return isEmpty;
  }

  protected getEvent($event: any, arrayContext: DynamicFormArrayModel, index: number, type: string): DynamicFormControlEvent {
    const context = arrayContext.groups[index];
    const itemGroupModel = context.context;
    let group = this.formGroup.get(itemGroupModel.id) as UntypedFormGroup;
    if (isNull(group)) {
      for (const key of Object.keys(this.formGroup.controls)) {
        group = this.formGroup.controls[key].get(itemGroupModel.id) as UntypedFormGroup;
        if (isNotNull(group)) {
          break;
        }
      }
    }
    const model = context.group[0] as DynamicFormControlModel;
    const control = group.controls[index] as UntypedFormControl;
    return { $event, context, control, group, model, type };
  }
}
