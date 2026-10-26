import { ForbiddenException, GoneException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'crypto';
import { resolve, sep } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { CATALOGHI_DIR } from '../common/env';

@Injectable()
export class CataloghiService {
  private readonly logger = new Logger(CataloghiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /** Landing: valida il token e restituisce i cataloghi del mailing (registra VIEW). */
  async landing(token: string, ip: string | null, userAgent: string | null) {
    const link = await this.prisma.downloadLink.findUnique({
      where: { token },
      include: {
        mailing: {
          include: {
            mailingCatalogo: {
              orderBy: { ordinamento: 'asc' },
              include: { catalogo: true },
            },
          },
        },
      },
    });
    const l = this.valida(link);
    this.registraEvento(l.id, null, 'VIEW', ip, userAgent);
    return {
      mailing: l.mailing.nome,
      cataloghi: l.mailing.mailingCatalogo.map((mc) => ({
        id: mc.catalogo.id,
        nome: mc.catalogo.nome,
        copertina: mc.catalogo.copertina,
      })),
    };
  }

  /** Download: valida token e catalogo del mailing, restituisce il path del PDF (registra DOWNLOAD). */
  async pdf(token: string, catalogoId: number, ip: string | null, userAgent: string | null) {
    const link = await this.prisma.downloadLink.findUnique({
      where: { token },
      include: {
        mailing: {
          include: {
            mailingCatalogo: {
              where: { catalogoId },
              include: { catalogo: true },
            },
          },
        },
      },
    });
    const l = this.valida(link);
    const mc = l.mailing.mailingCatalogo[0];
    if (!mc) throw new NotFoundException('cataloghi.catalogo_non_trovato');
    this.registraEvento(l.id, catalogoId, 'DOWNLOAD', ip, userAgent);
    return { pdfPath: this.risolviPdf(mc.catalogo.pdfFile), nome: mc.catalogo.nome };
  }

  private valida<T extends { revokedAt: Date | null; expiresAt: Date | null }>(link: T | null): T {
    if (!link) throw new NotFoundException('cataloghi.link_non_trovato');
    if (link.revokedAt) throw new GoneException('cataloghi.link_revocato');
    if (link.expiresAt && link.expiresAt < new Date()) throw new GoneException('cataloghi.link_scaduto');
    return link;
  }

  /** Anti path-traversal: il path del PDF deve restare dentro CATALOGHI_DIR. */
  private risolviPdf(rel: string): string {
    const abs = resolve(CATALOGHI_DIR, rel);
    if (abs !== CATALOGHI_DIR && !abs.startsWith(CATALOGHI_DIR + sep)) {
      throw new NotFoundException('cataloghi.pdf_non_trovato');
    }
    return abs;
  }

  /** Webhook Brevo: verifica il segreto e registra delivered/opened/click per email. */
  async webhook(secret: string, payload: unknown): Promise<{ ricevuti: number }> {
    const expected = this.config.get<string>('CATALOGHI_WEBHOOK_SECRET');
    if (!expected || !confrontaSegreto(secret, expected)) {
      throw new ForbiddenException('cataloghi.webhook_non_autorizzato');
    }
    const eventi = Array.isArray(payload) ? payload : [payload];
    let ricevuti = 0;
    for (const e of eventi) {
      const raw = e as { event?: unknown; email?: unknown };
      const tipo = this.mappaTipoBrevo(typeof raw.event === 'string' ? raw.event : '');
      const email = typeof raw.email === 'string' ? raw.email.trim().toLowerCase() : '';
      if (!tipo || !email) continue;
      await this.registraEventoBrevo(email, tipo);
      ricevuti++;
    }
    return { ricevuti };
  }

  private mappaTipoBrevo(ev: string): string | null {
    if (ev === 'delivered') return 'DELIVERED';
    if (ev === 'opened') return 'OPENED';
    if (ev === 'click') return 'CLICKED';
    return null;
  }

  /** ponytail: l'evento Brevo arriva con la sola email (senza il nostro mailingId):
   *  si registra per tutti i link con quell'email. Raffinare se serve precisione per campagna. */
  private async registraEventoBrevo(email: string, tipo: string) {
    const links = await this.prisma.downloadLink.findMany({ where: { email }, select: { id: true } });
    for (const l of links) this.registraEvento(l.id, null, tipo, null, null);
  }

  /** Evento best-effort: un errore di tracking non deve far fallire la risposta. */
  private registraEvento(linkId: number, catalogoId: number | null, tipo: string, ip: string | null, userAgent: string | null) {
    this.prisma.downloadEvent
      .create({
        data: {
          linkId,
          catalogoId,
          tipo,
          ipHash: ip ? createHash('sha256').update(ip).digest('hex') : null,
          userAgent: userAgent ? userAgent.slice(0, 255) : null,
        },
      })
      .catch((e: unknown) => this.logger.warn(`Evento ${tipo} non registrato: ${String(e)}`));
  }
}

/** Confronto costante nel tempo anche a lunghezze diverse (timingSafeEqual esige buffer uguali). */
function confrontaSegreto(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}
