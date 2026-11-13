import { filtraReferentiPubblici } from './referenti-pubblici';

describe('filtraReferentiPubblici', () => {
  it('tiene nome, ruolo e fonte https', () => {
    const out = filtraReferentiPubblici([
      {
        nome: 'Mario Rossi',
        ruolo: 'Titolare',
        fonte: 'https://vivaio.it/chi-siamo',
      },
    ]);
    expect(out).toEqual([
      {
        nome: 'Mario Rossi',
        ruolo: 'Titolare',
        fonte: 'https://vivaio.it/chi-siamo',
        stato: 'da-verificare',
      },
    ]);
  });

  it('scarta il referente senza fonte (nome inventato)', () => {
    expect(
      filtraReferentiPubblici([{ nome: 'Mario Rossi', ruolo: 'Titolare' }]),
    ).toEqual([]);
    expect(
      filtraReferentiPubblici([
        { nome: 'Mario Rossi', ruolo: 'Titolare', fonte: 'non un url' },
      ]),
    ).toEqual([]);
    expect(
      filtraReferentiPubblici([
        { nome: 'Mario Rossi', ruolo: 'Titolare', fonte: 'http://vivaio.it' },
      ]),
    ).toEqual([]);
  });

  it('scarta recapiti nel nome e doppioni', () => {
    const out = filtraReferentiPubblici([
      {
        nome: 'mario@vivaio.it',
        ruolo: 'Titolare',
        fonte: 'https://vivaio.it',
      },
      {
        nome: 'Anna Bianchi',
        ruolo: 'Acquisti',
        fonte: 'https://vivaio.it/team',
      },
      {
        nome: 'anna bianchi',
        ruolo: 'Acquisti',
        fonte: 'https://vivaio.it/team',
      },
    ]);
    expect(out.map((r) => r.nome)).toEqual(['Anna Bianchi']);
  });

  it('input non array o voci rotte non rompono nulla', () => {
    expect(filtraReferentiPubblici(null)).toEqual([]);
    expect(filtraReferentiPubblici('x')).toEqual([]);
    expect(filtraReferentiPubblici([null, 3, { ruolo: 'x' }])).toEqual([]);
  });
});
