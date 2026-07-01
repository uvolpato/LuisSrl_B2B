const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.articolo.findUnique({ 
  where: { codiceLinea: '21721' }, 
  include: { varianti: true, immagini: { orderBy: { ordinamento: 'asc' } } } 
}).then(a => {
  console.log(JSON.stringify(a, null, 2));
  prisma.$disconnect();
});
