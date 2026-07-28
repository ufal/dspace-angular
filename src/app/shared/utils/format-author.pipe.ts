import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'dsFormatAuthor' })
export class FormatAuthorPipe implements PipeTransform {
  transform(value: string): string {
    // Normalise comma followed by zero or more whitespace to a single comma + space
    return value?.replace(/,\s*(?=\S)/g, ', ') || value;
  }
}
