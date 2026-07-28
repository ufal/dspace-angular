import { UntypedFormGroup } from '@angular/forms';
import { hasValue } from '../../empty.util';

/**
 * Utility function to check if a form group control is visually empty.
 * A form group is considered empty if all its form controls have no meaningful values.
 *
 * Handles multiple value types:
 * - Strings: checked for non-empty trimmed value
 * - Arrays: checked for length > 0
 * - Objects (FormFieldMetadataValueObject): checked for value property
 * - Numbers/Booleans: always non-empty if present
 * - Objects: checked for any non-null, non-empty properties
 *
 * @param formGroup The form group to check for emptiness
 * @returns true if all controls in the form group are empty, false if any control has a value
 */
export function isFormGroupEmpty(formGroup: UntypedFormGroup): boolean {
  if (!formGroup || !formGroup.controls) {
    return true;
  }

  const controlNames = Object.keys(formGroup.controls);

  for (const controlName of controlNames) {
    const control = formGroup.get(controlName);
    if (control) {
      const value = control.value;

      // Check for non-empty values (handle strings, objects, arrays)
      if (hasValue(value)) {
        if (typeof value === 'string' && value.trim() !== '') {
          return false; // Has string value
        } else if (typeof value === 'object' && value !== null) {
          // Check if object has meaningful properties
          if (Array.isArray(value)) {
            if (value.length > 0) {
              return false; // Has array values
            }
          } else if (value.hasOwnProperty('value') && value.value && value.value !== '') {
            return false; // Has FormFieldMetadataValueObject with value
          } else {
            // Check if object has any non-null properties
            const objKeys = Object.keys(value);
            const hasNonNullProperty = objKeys.some(key => {
              const propValue = value[key];
              // Check if value is non-empty (excluding empty arrays)
              const isNonNull = propValue !== null &&
                                propValue !== undefined &&
                                propValue !== '' &&
                                !(Array.isArray(propValue) && propValue.length === 0);
              return isNonNull;
            });
            if (hasNonNullProperty) {
              return false;
            }
          }
        } else if (typeof value === 'number' || typeof value === 'boolean') {
          return false; // Has numeric or boolean value
        }
      }
    }
  }

  return true; // All controls are empty
}
