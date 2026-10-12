/** Estrae il primo oggetto JSON da una risposta LLM (tollera testo o ```json attorno). null se non valido. */
export function estraiJson<T>(raw: string): T | null {
  try {
    const trimmed = raw.trim();
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) return null;
    return JSON.parse(trimmed.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}
