import { giorniDa, giorniPromemoria, servePromemoria } from './promemoria';

describe('Promemoria richieste in attesa', () => {
  const invio = new Date('2026-10-01T08:00:00Z');

  it('scatta dopo N giorni dall ultimo invio, non prima', () => {
    expect(servePromemoria(invio, new Date('2026-10-07T07:59:00Z'), 6)).toBe(
      false,
    );
    expect(servePromemoria(invio, new Date('2026-10-07T08:00:00Z'), 6)).toBe(
      true,
    );
  });

  it('i link della mail (7 giorni) sono ancora validi quando arriva il promemoria', () => {
    expect(giorniPromemoria()).toBeLessThan(7);
  });

  it('conta i giorni di attesa interi', () => {
    expect(giorniDa(invio, new Date('2026-10-12T20:00:00Z'))).toBe(11);
  });
});
