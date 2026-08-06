const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");
require("dotenv").config();
(async () => {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const p = new PrismaClient({ adapter });
  const r = await p.$queryRawUnsafe(
    "SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'customer%' ORDER BY table_name"
  );
  console.log(r.map((x) => x.table_name).join("\n"));
  const cols = await p.$queryRawUnsafe(
    "SELECT column_name FROM information_schema.columns WHERE table_name='customer_profiles' ORDER BY ordinal_position"
  );
  console.log("--- customer_profiles ---");
  console.log(cols.map((x) => x.column_name).join("\n"));
  const cnt = await p.$queryRawUnsafe("SELECT count(*)::int AS n FROM customer_profiles");
  console.log("rows:", cnt[0].n);
  await p.$disconnect();
})().catch((e) => { console.error("ERR", e.message); process.exit(1); });
