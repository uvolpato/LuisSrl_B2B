import { codiceLineaSicuro } from './codice-articolo';

describe('codiceLineaSicuro', () => {
  it('sostituisce la barra che rompe i link', () => {
    expect(codiceLineaSicuro('linea_S/3VASO_EGGTC')).toBe('linea_S-3VASO_EGGTC');
    expect(codiceLineaSicuro('12470/A')).toBe('12470-A');
  });

  it('lascia intatti i codici già validi', () => {
    expect(codiceLineaSicuro('linea_LAKOTA_CREMA')).toBe('linea_LAKOTA_CREMA');
    expect(codiceLineaSicuro('MC108886')).toBe('MC108886');
    expect(codiceLineaSicuro('CILFR30-1515')).toBe('CILFR30-1515');
  });

  it('normalizza spazi, caratteri riservati e barre ripetute', () => {
    expect(codiceLineaSicuro('  linea_A//B?x  ')).toBe('linea_A-B-x');
    expect(codiceLineaSicuro('/solo/barre/')).toBe('solo-barre');
    expect(codiceLineaSicuro('')).toBe('ARTICOLO');
  });
});
