import { FormatAuthorPipe } from "./format-author.pipe";

describe('FormatAuthorPipe', () => {
  let pipe: FormatAuthorPipe;

  beforeEach(() => {
    pipe = new FormatAuthorPipe();
  });

  it('should create', () => {
    expect(pipe).toBeTruthy();
  });

  it('should add single space after comma when missing', () => {
    expect(pipe.transform('Doe,John')).toEqual('Doe, John');
  });

  it('should keep single space after comma unchanged', () => {
    expect(pipe.transform('Doe, John')).toEqual('Doe, John');
  });

  it('should return value as-is when there is no comma', () => {
    expect(pipe.transform('')).toEqual('');
    expect(pipe.transform(null as any)).toBeNull();
    expect(pipe.transform('John Doe')).toEqual('John Doe');
    expect(pipe.transform(undefined as any)).toBeUndefined();
  });
});
