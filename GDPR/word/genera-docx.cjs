/**
 * Generatore documenti Word con carta intestata Luis S.r.l.
 *
 * Richiede il pacchetto `docx` (npm). Esempio:
 *   cd GDPR/word && npm i docx && node genera-docx.cjs
 *
 * Legge tutti i .md presenti in GDPR/ e scrive i .docx in GDPR/word/.
 * Carta intestata: logo aziendale nell'intestazione, dati societari nel piè di pagina.
 */
const fs = require('fs');
const path = require('path');
const {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  ImageRun,
  LevelFormat,
  PageNumber,
  PageOrientation,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} = require('docx');

const ROOT = path.resolve(__dirname, '..', '..');
const GDPR_DIR = path.resolve(__dirname, '..');
const OUT_DIR = __dirname;
const LOGO = path.join(ROOT, 'frontend', 'public', 'images', 'b2b', 'logo-email.png');

const COLOR = {
  ink: '221811',
  accent: 'B2511E',
  muted: '706760',
  line: 'DCD6D1',
  soft: 'F7F5F1',
};

const CONTENT_WIDTH_PORTRAIT = 9412; // A4 11906 - margini 1247*2
const CONTENT_WIDTH_LANDSCAPE = 14838; // 16838 - 1000*2

function pngSize(file) {
  const b = fs.readFileSync(file);
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}

function inline(text, opts = {}) {
  const runs = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) runs.push(new TextRun({ text: text.slice(last, m.index), ...opts }));
    const token = m[0];
    if (token.startsWith('**')) {
      runs.push(new TextRun({ text: token.slice(2, -2), bold: true, ...opts }));
    } else if (token.startsWith('`')) {
      runs.push(new TextRun({ text: token.slice(1, -1), font: 'Consolas', size: opts.size ?? 19, ...opts }));
    } else {
      const mm = /\[([^\]]+)\]\(([^)]+)\)/.exec(token);
      runs.push(new TextRun({ text: `${mm[1]} (${mm[2]})`, ...opts, underline: {} }));
    }
    last = m.index + token.length;
  }
  if (last < text.length) runs.push(new TextRun({ text: text.slice(last), ...opts }));
  return runs.length ? runs : [new TextRun({ text: '', ...opts })];
}

function parse(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^```/.test(line)) {
      i++;
      const code = [];
      while (i < lines.length && !/^```/.test(lines[i])) code.push(lines[i++]);
      i++;
      blocks.push({ type: 'code', text: code.join('\n') });
      continue;
    }
    if (!line.trim()) { i++; continue; }
    if (/^\|\s*/.test(line)) {
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) {
        const raw = lines[i].trim();
        if (!/^\|[\s:|-]+\|?$/.test(raw)) {
          rows.push(raw.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim()));
        }
        i++;
      }
      if (rows.length) blocks.push({ type: 'table', rows });
      continue;
    }
    const h = /^(#{1,6})\s+(.*)/.exec(line);
    if (h) { blocks.push({ type: `h${h[1].length}`, text: h[2] }); i++; continue; }
    if (/^---+$/.test(line.trim())) { blocks.push({ type: 'hr' }); i++; continue; }
    const b = /^(\s*)-\s+(.*)/.exec(line);
    if (b) {
      const level = Math.min(2, Math.floor(b[1].length / 2));
      const check = /^\[.\]\s+(.*)/.exec(b[2]);
      blocks.push({ type: 'li', level, text: check ? `☐ ${check[1]}` : b[2] });
      i++;
      continue;
    }
    const n = /^(\s*)\d+\.\s+(.*)/.exec(line);
    if (n) { blocks.push({ type: 'ol', level: Math.min(2, Math.floor(n[1].length / 2)), text: n[2] }); i++; continue; }
    if (/^>\s?/.test(line)) {
      const q = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) q.push(lines[i++].replace(/^>\s?/, ''));
      blocks.push({ type: 'quote', text: q.join(' ') });
      continue;
    }
    const p = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|>|```|\||- |\d+\.\s|---+$)/.test(lines[i])) {
      p.push(lines[i++].trim());
    }
    blocks.push({ type: 'p', text: p.join(' ') });
  }
  return blocks;
}

function table(rows, landscape) {
  const cols = Math.max(...rows.map((r) => r.length));
  const total = landscape ? CONTENT_WIDTH_LANDSCAPE : CONTENT_WIDTH_PORTRAIT;
  const widths = Array.from({ length: cols }, () => Math.floor(total / cols));
  const border = { style: BorderStyle.SINGLE, size: 2, color: COLOR.line };
  const borders = { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border };

  const tableRows = rows.map((cells, idx) => new TableRow({
    tableHeader: idx === 0,
    children: Array.from({ length: cols }, (_, c) => new TableCell({
      width: { size: widths[c], type: WidthType.DXA },
      shading: idx === 0 ? { type: ShadingType.CLEAR, color: 'auto', fill: COLOR.soft } : undefined,
      margins: { top: 60, bottom: 60, left: 90, right: 90 },
      children: [
        new Paragraph({
          spacing: { before: 0, after: 0 },
          children: inline(cells[c] ?? '', { size: 16, bold: idx === 0 }),
        }),
      ],
    })),
  }));

  return new Table({
    columnWidths: widths,
    width: { size: total, type: WidthType.DXA },
    borders,
    rows: tableRows,
  });
}

function header(landscape) {
  const logo = pngSize(LOGO);
  const h = 44;
  const w = Math.round((logo.width / logo.height) * h);
  return new Header({
    children: [
      new Table({
        columnWidths: [3000, (landscape ? CONTENT_WIDTH_LANDSCAPE : CONTENT_WIDTH_PORTRAIT) - 3000],
        width: { size: landscape ? CONTENT_WIDTH_LANDSCAPE : CONTENT_WIDTH_PORTRAIT, type: WidthType.DXA },
        borders: {
          top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
          left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
          insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE },
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 3000, type: WidthType.DXA },
                verticalAlign: 'center',
                children: [new Paragraph({ children: [new ImageRun({ type: 'png', data: fs.readFileSync(LOGO), transformation: { width: w, height: h } })] })],
              }),
              new TableCell({
                width: { size: (landscape ? CONTENT_WIDTH_LANDSCAPE : CONTENT_WIDTH_PORTRAIT) - 3000, type: WidthType.DXA },
                verticalAlign: 'center',
                children: [
                  new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { after: 0 }, children: [new TextRun({ text: 'LUIS S.r.l.', bold: true, font: 'Georgia', size: 24, color: COLOR.ink })] }),
                  new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { after: 0 }, children: [new TextRun({ text: 'Via F. Bellafino 28/30 — 24126 Bergamo (BG)', size: 15, color: COLOR.muted })] }),
                  new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { after: 0 }, children: [new TextRun({ text: 'C.F. e P.IVA 04253020160 · info@luisbg.it · +39 035 0521957', size: 15, color: COLOR.muted })] }),
                ],
              }),
            ],
          }),
        ],
      }),
      new Paragraph({
        spacing: { before: 120, after: 0 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: COLOR.accent, space: 1 } },
        children: [],
      }),
    ],
  });
}

function footer(landscape) {
  const total = landscape ? CONTENT_WIDTH_LANDSCAPE : CONTENT_WIDTH_PORTRAIT;
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        border: { top: { style: BorderStyle.SINGLE, size: 2, color: COLOR.line, space: 4 } },
        children: [
          new TextRun({ text: 'Luis S.r.l. · documento riservato · ', size: 15, color: COLOR.muted }),
          new TextRun({ children: ['pagina ', PageNumber.CURRENT, ' di ', PageNumber.TOTAL_PAGES], size: 15, color: COLOR.muted }),
        ],
      }),
    ],
  });
}

function buildDocument(title, subtitle, blocks) {
  const hasWideTable = blocks.some((b) => b.type === 'table' && Math.max(...b.rows.map((r) => r.length)) >= 7);
  const landscape = hasWideTable;

  const children = [
    new Paragraph({
      spacing: { after: 40 },
      children: [new TextRun({ text: 'LUIS S.r.l. · DOCUMENTO GDPR', bold: true, size: 16, color: COLOR.accent, characterSpacing: 40 })],
    }),
    new Paragraph({
      heading: HeadingLevel.TITLE,
      spacing: { after: 60 },
      children: [new TextRun({ text: title, font: 'Georgia', size: 40, bold: true, color: COLOR.ink })],
    }),
    new Paragraph({
      spacing: { after: 240 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: COLOR.line, space: 6 } },
      children: [new TextRun({ text: subtitle, size: 17, color: COLOR.muted })],
    }),
  ];

  for (const b of blocks) {
    switch (b.type) {
      case 'h1':
        children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: b.text, font: 'Georgia', size: 30, bold: true, color: COLOR.ink })] }));
        break;
      case 'h2':
        children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: b.text, font: 'Georgia', size: 25, bold: true, color: COLOR.ink })] }));
        break;
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6':
        children.push(new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun({ text: b.text, size: 22, bold: true, color: COLOR.accent })] }));
        break;
      case 'p':
        children.push(new Paragraph({ children: inline(b.text) }));
        break;
      case 'li':
        children.push(new Paragraph({
          numbering: { reference: 'punti', level: b.level },
          children: inline(b.text),
        }));
        break;
      case 'ol':
        children.push(new Paragraph({
          numbering: { reference: 'numeri', level: b.level },
          children: inline(b.text),
        }));
        break;
      case 'quote':
        children.push(new Paragraph({
          spacing: { before: 120, after: 160 },
          indent: { left: 240 },
          shading: { type: ShadingType.CLEAR, color: 'auto', fill: COLOR.soft },
          children: inline(b.text, { italics: true, color: COLOR.muted }),
        }));
        break;
      case 'code':
        for (const row of b.text.split('\n')) {
          children.push(new Paragraph({
            spacing: { before: 0, after: 0 },
            indent: { left: 240 },
            children: [new TextRun({ text: row || ' ', font: 'Consolas', size: 17, color: COLOR.ink })],
          }));
        }
        children.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
        break;
      case 'hr':
        children.push(new Paragraph({
          spacing: { before: 120, after: 120 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: COLOR.line, space: 1 } },
          children: [],
        }));
        break;
      case 'table':
        children.push(table(b.rows, landscape));
        children.push(new Paragraph({ spacing: { after: 160 }, children: [] }));
        break;
    }
  }

  return new Document({
    creator: 'Luis S.r.l.',
    title,
    description: 'Documento GDPR — Luis S.r.l.',
    styles: {
      default: {
        document: {
          run: { font: 'Arial', size: 21, color: COLOR.ink },
          paragraph: { spacing: { line: 276, after: 120 } },
        },
        heading1: {
          run: { font: 'Georgia', size: 30, bold: true, color: COLOR.ink },
          paragraph: { spacing: { before: 320, after: 120 }, keepNext: true },
        },
        heading2: {
          run: { font: 'Georgia', size: 25, bold: true, color: COLOR.ink },
          paragraph: { spacing: { before: 260, after: 100 }, keepNext: true },
        },
        heading3: {
          run: { font: 'Arial', size: 22, bold: true, color: COLOR.accent },
          paragraph: { spacing: { before: 200, after: 80 }, keepNext: true },
        },
      },
    },
    numbering: {
      config: [
        {
          reference: 'punti',
          levels: [
            { level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 220 } } } },
            { level: 1, format: LevelFormat.BULLET, text: '◦', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 220 } } } },
            { level: 2, format: LevelFormat.BULLET, text: '▪', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1080, hanging: 220 } } } },
          ],
        },
        {
          reference: 'numeri',
          levels: [
            { level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 420, hanging: 280 } } } },
            { level: 1, format: LevelFormat.LOWER_LETTER, text: '%2.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 840, hanging: 280 } } } },
          ],
        },
      ],
    },
    sections: [{
      properties: {
        page: {
          size: landscape
            ? { width: 11906, height: 16838, orientation: PageOrientation.LANDSCAPE }
            : { width: 11906, height: 16838 },
          margin: landscape
            ? { top: 1600, right: 1000, bottom: 1200, left: 1000, header: 600, footer: 500 }
            : { top: 1700, right: 1247, bottom: 1247, left: 1247, header: 700, footer: 500 },
        },
      },
      headers: { default: header(landscape) },
      footers: { default: footer(landscape) },
      children,
    }],
  });
}

function humanTitle(base) {
  return base
    .replace(/\.md$/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/(^|\s)\S/g, (c) => c.toUpperCase());
}

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  const files = fs.readdirSync(GDPR_DIR).filter((f) => f.toLowerCase().endsWith('.md'));
  const oggi = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });

  for (const file of files) {
    const md = fs.readFileSync(path.join(GDPR_DIR, file), 'utf8');
    const blocks = parse(md);
    const primo = blocks[0] && blocks[0].type === 'h1' ? blocks.shift() : null;
    const title = primo ? primo.text : humanTitle(file);
    const doc = buildDocument(title, `Documento GDPR · versione ${oggi} · fonte: ${file}`, blocks);
    const out = path.join(OUT_DIR, file.replace(/\.md$/i, '.docx'));
    fs.writeFileSync(out, await Packer.toBuffer(doc));
    console.log('scritto', path.basename(out));
  }

  // Carta intestata vuota, da usare come modello.
  const modello = buildDocument(
    'Carta intestata',
    `Modello documento · aggiornato al ${oggi} · Luis S.r.l.`,
    [
      { type: 'p', text: 'Sostituire questo testo con il contenuto del documento. L\'intestazione e il piè di pagina sono già impostati: logo, dati societari e numerazione pagine.' },
      { type: 'h2', text: 'Titolo della sezione' },
      { type: 'p', text: 'Testo di esempio. Titoli, elenchi e tabelle seguono la formattazione standard di Luis S.r.l.' },
      { type: 'li', text: 'Primo punto elenco' },
      { type: 'li', text: 'Secondo punto elenco' },
    ],
  );
  fs.writeFileSync(path.join(OUT_DIR, 'CARTA-INTESTATA-LUIS.docx'), await Packer.toBuffer(modello));
  console.log('scritto CARTA-INTESTATA-LUIS.docx');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
