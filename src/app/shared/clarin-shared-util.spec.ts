import { buildAuthoritySearchFilter, convertMetadataFieldIntoSearchType, makeLinks } from './clarin-shared-util';

describe('clarin-shared-util', () => {
  describe('makeLinks', () => {
    it('does not include sentence-ending punctuation in the link', () => {
      expect(makeLinks('Consolidated 2.0 http://hdl.handle.net/11234/1-5813.')).toBe(
        'Consolidated 2.0 <a href="http://hdl.handle.net/11234/1-5813" target="_blank">http://hdl.handle.net/11234/1-5813</a>.');
      expect(makeLinks('see https://github.com/ufal/perin, then')).toBe(
        'see <a href="https://github.com/ufal/perin" target="_blank">https://github.com/ufal/perin</a>, then');
    });

    it('keeps punctuation inside the URL', () => {
      expect(makeLinks('https://example.org/a.b?x=1;y=2#c')).toBe(
        '<a href="https://example.org/a.b?x=1;y=2#c" target="_blank">https://example.org/a.b?x=1;y=2#c</a>');
    });

    it('links www. addresses as absolute URLs', () => {
      expect(makeLinks('Visit www.example.org.')).toBe(
        'Visit <a href="http://www.example.org" target="_blank">www.example.org</a>.');
    });
  });

  describe('buildAuthoritySearchFilter', () => {
    it('uses the authority operator and key when an authority is present', () => {
      expect(buildAuthoritySearchFilter('publisher', { value: 'ACME Press', authority: '02mhbdp94' }))
        .toBe('f.publisher=02mhbdp94,authority');
    });

    it('uses the equals operator and value when no authority is present', () => {
      expect(buildAuthoritySearchFilter('publisher', { value: 'ACME Press', authority: null }))
        .toBe('f.publisher=ACME%20Press,equals');
    });

    it('treats an empty-string authority as absent', () => {
      expect(buildAuthoritySearchFilter('author', { value: 'Doe, J', authority: '' }))
        .toBe('f.author=Doe%2C%20J,equals');
    });

    it('url-encodes both the filter name and the value', () => {
      expect(buildAuthoritySearchFilter('publisher', { value: 'A&B', authority: null }))
        .toBe('f.publisher=A%26B,equals');
    });
  });

  describe('convertMetadataFieldIntoSearchType', () => {
    it('maps dc.publisher to the publisher filter', () => {
      expect(convertMetadataFieldIntoSearchType(['dc.publisher'])).toBe('publisher');
    });

    it('maps creativework.publisher to the publisher filter', () => {
      expect(convertMetadataFieldIntoSearchType(['creativework.publisher'])).toBe('publisher');
    });

    it('maps dc.type to the type filter', () => {
      expect(convertMetadataFieldIntoSearchType(['dc.type'])).toBe('type');
    });
  });
});
