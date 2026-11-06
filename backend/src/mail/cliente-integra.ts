/** Riquadro della mail a shop@: dice se la richiesta è di un cliente già censito in Integra. */

const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]!,
  );

const box = (bg: string, fg: string, titolo: string, testo: string) =>
  `<div style="margin:16px 28px 0;background:${bg};border:1px solid #e7e2db;border-radius:12px;padding:12px 16px;font-size:13.5px;color:${fg};"><strong>${titolo}</strong> ${testo}</div>`;

export function boxClienteIntegra(
  cliente: { codiceCliente: string; email: string | null } | null,
  verifica: 'trovato' | 'assente' | 'non_disponibile',
): string {
  if (cliente) {
    const email = cliente.email
      ? ` · email in Integra: ${esc(cliente.email)}`
      : ' · nessuna email in Integra: si usa quella della richiesta';
    return box(
      '#e5f2ea',
      '#1b7a45',
      'Cliente già censito in Integra:',
      `codice ${esc(cliente.codiceCliente)}${email}. All&apos;approvazione viene importato così com&apos;è: <strong>nessun file anagrafica</strong>.`,
    );
  }
  if (verifica === 'non_disponibile')
    return box(
      '#fdf3e2',
      '#8a5a00',
      'Verifica Integra non disponibile:',
      'Integra non risponde e la copia locale non contiene questa P.IVA. <strong>Controlla in Integra prima di approvare</strong>: approvando viene comunque generato il file anagrafica.',
    );
  return box(
    '#f8f5f1',
    '#706760',
    'Nuovo cliente:',
    'la P.IVA non risulta in Integra. All&apos;approvazione viene generato il file anagrafica.',
  );
}
