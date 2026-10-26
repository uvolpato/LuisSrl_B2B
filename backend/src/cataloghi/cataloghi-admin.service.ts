import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { promises as fsp, statSync } from 'fs';
import { join } from 'path';
import ExcelJS from 'exceljs';
import { PrismaService } from '../prisma/prisma.service';
import { CATALOGHI_DIR } from '../common/env';
import { BrevoService } from './brevo.service';

@Injectable()
export class CataloghiAdminService {
  private readonly domain: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
    private readonly brevo: BrevoService,
  ) {
    this.domain = config.get<string>('APP_DOMAIN') ?? 'http://localhost:3000';
  }

  // ── Cataloghi (PDF) ──────────────────────────────────────────────

  async creaCatalogo(nome: string, file: Express.Multer.File) {
    if (file.mimetype !== 'application/pdf') throw new BadRequestException('Solo file PDF sono permessi');
    if (file.size > 50 * 1024 * 1024) throw new BadRequestException('File troppo grande (max 50MB)');

    const nomeFile = `${Date.now()}_${randomBytes(4).toString('hex')}.pdf`;
    await fsp.mkdir(CATALOGHI_DIR, { recursive: true });
    await fsp.writeFile(join(CATALOGHI_DIR, nomeFile), file.buffer);

    const catalogo = await this.prisma.catalogo.create({
      data: { nome: nome.trim().slice(0, 200), pdfFile: nomeFile },
    });
    return { id: catalogo.id, nome: catalogo.nome };
  }

  async elencoCataloghi() {
    const list = await this.prisma.catalogo.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, nome: true, copertina: true, archiviato: true, pdfFile: true, createdAt: true },
    });
    return list.map((c) => ({
      id: c.id,
      nome: c.nome,
      copertina: c.copertina,
      archiviato: c.archiviato,
      createdAt: c.createdAt,
      dimensione: this.dimensionePdf(c.pdfFile),
    }));
  }

  async archiviaCatalogo(id: number) {
    const c = await this.prisma.catalogo.findUnique({ where: { id }, select: { id: true } });
    if (!c) throw new NotFoundException('cataloghi.catalogo_non_trovato');
    await this.prisma.catalogo.update({ where: { id }, data: { archiviato: true } });
    return { archiviato: true };
  }

  async ripristinaCatalogo(id: number) {
    const c = await this.prisma.catalogo.findUnique({ where: { id }, select: { id: true } });
    if (!c) throw new NotFoundException('cataloghi.catalogo_non_trovato');
    await this.prisma.catalogo.update({ where: { id }, data: { archiviato: false } });
    return { archiviato: false };
  }

  private dimensionePdf(pdfFile: string): number | null {
    try { return statSync(join(CATALOGHI_DIR, pdfFile)).size; } catch { return null; }
  }

  // ── Mailing ──────────────────────────────────────────────────────

  async creaMailing(nome: string, cataloghi: number[], canale: string = 'email') {
    const ids = [...new Set(cataloghi.map(Number).filter((n) => Number.isInteger(n) && n > 0))];
    if (!nome.trim()) throw new BadRequestException('Nome mancante');
    if (ids.length === 0) throw new BadRequestException('Seleziona almeno un catalogo');
    if (!['email', 'link'].includes(canale)) throw new BadRequestException('Canale non valido');

    const esistenti = await this.prisma.catalogo.findMany({ where: { id: { in: ids } }, select: { id: true } });
    if (esistenti.length !== ids.length) throw new NotFoundException('cataloghi.catalogo_non_trovato');

    const mailing = await this.prisma.mailing.create({
      data: {
        nome: nome.trim().slice(0, 200),
        canale,
        mailingCatalogo: { create: ids.map((catalogoId, i) => ({ catalogoId, ordinamento: i })) },
      },
    });
    return { id: mailing.id, nome: mailing.nome };
  }

  async elencoMailing() {
    const mailings = await this.prisma.mailing.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { links: true } },
        mailingCatalogo: { select: { catalogoId: true } },
      },
    });
    const ids = mailings.map((m) => m.id);
    const eventi = await this.prisma.downloadEvent.findMany({
      where: { link: { mailingId: { in: ids } } },
      select: { tipo: true, linkId: true, link: { select: { mailingId: true } } },
    });
    // ponytail: aggregazione in memoria, va bene per il volume attuale
    const perMailing = new Map<number, { aperti: Set<number>; scaricati: Set<number> }>();
    for (const e of eventi) {
      const mid = e.link.mailingId;
      let s = perMailing.get(mid);
      if (!s) { s = { aperti: new Set(), scaricati: new Set() }; perMailing.set(mid, s); }
      if (e.tipo === 'VIEW') s.aperti.add(e.linkId);
      else if (e.tipo === 'DOWNLOAD') s.scaricati.add(e.linkId);
    }
    return mailings.map((m) => {
      const s = perMailing.get(m.id);
      return {
        id: m.id,
        nome: m.nome,
        stato: m.stato,
        canale: m.canale,
        createdAt: m.createdAt,
        nCataloghi: m.mailingCatalogo.length,
        generati: m._count.links,
        aperti: s?.aperti.size ?? 0,
        scaricati: s?.scaricati.size ?? 0,
      };
    });
  }

  async dettaglioMailing(id: number) {
    const m = await this.prisma.mailing.findUnique({
      where: { id },
      include: {
        mailingCatalogo: { orderBy: { ordinamento: 'asc' }, include: { catalogo: true } },
      },
    });
    if (!m) throw new NotFoundException('cataloghi.mailing_non_trovata');
    const links = await this.prisma.downloadLink.findMany({
      where: { mailingId: id },
      orderBy: { id: 'asc' },
      include: { eventi: { select: { tipo: true, catalogoId: true, at: true } } },
    });
    const aperto = links.filter((l) => l.eventi.some((e) => e.tipo === 'VIEW'));
    const cliccato = links.filter((l) => l.eventi.some((e) => e.tipo === 'DOWNLOAD'));
    return {
      id: m.id,
      nome: m.nome,
      stato: m.stato,
      canale: m.canale,
      createdAt: m.createdAt,
      cataloghi: m.mailingCatalogo.map((mc) => ({ id: mc.catalogo.id, nome: mc.catalogo.nome })),
      stats: {
        destinatari: links.length,
        aperture: aperto.length,
        click: cliccato.length,
      },
      destinatari: links.map((l) => ({
        id: l.id,
        email: l.email,
        nome: l.nome,
        token: l.token,
        link: `${this.domain}/c/${l.token}`,
        revocato: l.revokedAt != null,
        apertoIl: l.eventi.find((e) => e.tipo === 'VIEW')?.at ?? null,
        scaricati: l.eventi.filter((e) => e.tipo === 'DOWNLOAD').map((e) => e.catalogoId),
      })),
    };
  }

  // ── Import contatti ─────────────────────────────────────────────

  async importContatti(mailingId: number, file: Express.Multer.File) {
    const m = await this.prisma.mailing.findUnique({ where: { id: mailingId }, select: { id: true } });
    if (!m) throw new NotFoundException('cataloghi.mailing_non_trovata');

    const contatti = await this.leggiContatti(file);
    if (contatti.length === 0) throw new BadRequestException('Nessun contatto valido nel file');

    const creati = await this.prisma.$transaction(
      contatti.map((c) =>
        this.prisma.downloadLink.create({
          data: {
            mailingId,
            email: c.email,
            nome: c.nome,
            token: randomBytes(32).toString('base64url'),
          },
        }),
      ),
    );

    const csv = this.csvBrevo(creati.map((l) => ({ email: l.email, nome: l.nome, token: l.token })));
    return { creati: creati.length, csv };
  }

  /** Importa i destinatari da un sottoinsieme di clienti già in anagrafica. */
  async importClienti(mailingId: number, customerIds: number[]) {
    const m = await this.prisma.mailing.findUnique({ where: { id: mailingId }, select: { id: true } });
    if (!m) throw new NotFoundException('cataloghi.mailing_non_trovata');

    const ids = [...new Set(customerIds.map(Number).filter((n) => Number.isInteger(n) && n > 0))];
    if (ids.length === 0) throw new BadRequestException('Nessun cliente selezionato');

    const clienti = await this.prisma.customer.findMany({
      where: { id: { in: ids }, stato: 'ATTIVO' },
      select: { email: true, ragioneSociale: true, nome: true },
    });
    if (clienti.length === 0) throw new BadRequestException('Nessun cliente valido tra quelli selezionati');

    const creati = await this.prisma.$transaction(
      clienti.map((c) =>
        this.prisma.downloadLink.create({
          data: {
            mailingId,
            email: c.email,
            nome: c.ragioneSociale ?? c.nome,
            token: randomBytes(32).toString('base64url'),
          },
        }),
      ),
    );

    const csv = this.csvBrevo(creati.map((l) => ({ email: l.email, nome: l.nome, token: l.token })));
    return { creati: creati.length, csv };
  }

  /** CSV per l'import su Brevo (attributi EMAIL, NOME, CATALOGO_LINK). */
  csvBrevo(links: { email: string; nome: string | null; token: string }[]): string {
    const riga = (v: string) => (v.includes(';') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v);
    const header = 'EMAIL;NOME;CATALOGO_LINK';
    const rows = links.map((l) => `${riga(l.email)};${riga(l.nome ?? '')};${this.domain}/c/${l.token}`);
    return [header, ...rows].join('\n');
  }

  // ── Export / revoca ─────────────────────────────────────────────

  async exportCsv(mailingId: number) {
    const m = await this.prisma.mailing.findUnique({ where: { id: mailingId }, select: { id: true } });
    if (!m) throw new NotFoundException('cataloghi.mailing_non_trovata');
    const links = await this.prisma.downloadLink.findMany({
      where: { mailingId },
      orderBy: { id: 'asc' },
      include: { eventi: { select: { tipo: true, at: true, catalogoId: true } } },
    });
    const riga = (v: string) => (v.includes(';') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v);
    const header = 'NOME;EMAIL;APERTO;SCARICATO';
    const rows = links.map((l) => {
      const aperto = l.eventi.find((e) => e.tipo === 'VIEW')?.at;
      const scaricato = l.eventi.find((e) => e.tipo === 'DOWNLOAD')?.at;
      return `${riga(l.nome ?? '')};${riga(l.email)};${aperto ? aperto.toISOString() : ''};${scaricato ? scaricato.toISOString() : ''}`;
    });
    return [header, ...rows].join('\n');
  }

  async revocaLink(linkId: number) {
    const link = await this.prisma.downloadLink.findUnique({ where: { id: linkId }, select: { id: true, revokedAt: true } });
    if (!link) throw new NotFoundException('cataloghi.link_non_trovato');
    await this.prisma.downloadLink.update({ where: { id: linkId }, data: { revokedAt: new Date() } });
    return { revocato: true };
  }

  /** Invia i contatti del mailing a Brevo (attributo CATALOGO_LINK per il segnaposto della mail). */
  async inviaABrevo(mailingId: number) {
    const m = await this.prisma.mailing.findUnique({ where: { id: mailingId }, select: { id: true, canale: true, nome: true } });
    if (!m) throw new NotFoundException('cataloghi.mailing_non_trovata');
    if (m.canale === 'link') return { inviati: 0, soloLink: true };
    if (!this.brevo.attivo) throw new BadRequestException('Brevo non configurato (BREVO_API_KEY mancante)');
    const links = await this.prisma.downloadLink.findMany({
      where: { mailingId, revokedAt: null },
      select: { email: true, nome: true, token: true },
    });
    if (links.length === 0) throw new BadRequestException('Nessun destinatario da inviare');
    const inviati = await this.brevo.importaContatti(links, m.nome);
    await this.prisma.mailing.update({ where: { id: mailingId }, data: { stato: 'inviata' } });
    return { inviati };
  }

  // ── helper ──────────────────────────────────────────────────────

  /** Estrae (email, nome) dall'xlsx: trova l'email (cella con @) e il nome (l'altra cella non vuota). */
  private async leggiContatti(file: Express.Multer.File): Promise<{ email: string; nome: string | null }[]> {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(file.buffer as unknown as ArrayBuffer);
    const ws = wb.worksheets[0];
    const contatti: { email: string; nome: string | null }[] = [];
    ws.eachRow({ includeEmpty: false }, (row) => {
      const celle = (Array.isArray(row.values) ? row.values.slice(1) : [])
        .map((v) => String(v ?? '').trim())
        .filter(Boolean);
      if (celle.length === 0) return;
      const email = celle.find((c) => /\S+@\S+\.\S+/.test(c))?.toLowerCase();
      if (!email) return; // salta l'eventuale riga d'intestazione
      const nome = celle.find((c) => c.toLowerCase() !== email) ?? null;
      contatti.push({ email, nome });
    });
    return contatti;
  }
}
