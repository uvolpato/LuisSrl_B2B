const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const campaigns = await p.campaign.findMany({ where: { scope: { not: 'all' } } });
  for (const c of campaigns) {
    if (c.scope === 'family') {
      const f = await p.famiglia.findFirst({ where: { nome: { equals: c.scopeDetail, mode: 'insensitive' } } });
      if (f && f.codice !== c.scopeDetail) {
        await p.campaign.update({ where: { id: c.id }, data: { scopeDetail: f.codice } });
        console.log('Fixed family:', c.code, c.scopeDetail, '->', f.codice);
      }
    }
    if (c.scope === 'collection') {
      const r = await p.raccolta.findFirst({ where: { OR: [{ nome: { equals: c.scopeDetail, mode: 'insensitive' } }, { slug: { equals: c.scopeDetail, mode: 'insensitive' } }] } });
      if (r && (r.slug || r.codice) !== c.scopeDetail) {
        await p.campaign.update({ where: { id: c.id }, data: { scopeDetail: r.slug || r.codice } });
        console.log('Fixed collection:', c.code, c.scopeDetail, '->', r.slug || r.codice);
      }
    }
  }
  console.log('Done');
  await p.$disconnect();
}

main().catch(e => { console.error(e); p.$disconnect(); });
