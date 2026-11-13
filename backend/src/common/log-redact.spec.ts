import { urlSenzaSegreti } from './log-redact';

describe('urlSenzaSegreti', () => {
  it('toglie la querystring', () => {
    expect(urlSenzaSegreti('/api/customers?search=mario+rossi&page=1')).toBe('/api/customers');
  });

  it('maschera i token nel path', () => {
    expect(urlSenzaSegreti('/api/cataloghi/AbC123/7/pdf')).toBe('/api/cataloghi/[token]/7/pdf');
    expect(urlSenzaSegreti('/api/cataloghi/webhook/segreto123')).toBe('/api/cataloghi/webhook/[secret]');
    expect(urlSenzaSegreti('/api/progetti/pubblico/tok_9')).toBe('/api/progetti/pubblico/[token]');
  });

  it('lascia intatti i path normali', () => {
    expect(urlSenzaSegreti('/api/auth/privacy')).toBe('/api/auth/privacy');
    expect(urlSenzaSegreti('/api/customers/12')).toBe('/api/customers/12');
  });
});
