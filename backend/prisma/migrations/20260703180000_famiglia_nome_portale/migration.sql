-- Titolo alternativo della famiglia scelto sul portale: se presente vince sul
-- nome che arriva da Integra.
ALTER TABLE "famiglie" ADD COLUMN IF NOT EXISTS "nome_portale" TEXT;
