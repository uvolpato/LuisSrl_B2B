-- Pulizia del vecchio secondo fattore TOTP: si conservano le colonne (nessuna perdita
-- strutturale) ma si cancellano i segreti e si riportano gli account attivi al codice via email.
UPDATE "users"
   SET "mfa_metodo" = 'email'
 WHERE "mfa_attivo" = true
   AND ("mfa_metodo" IS NULL OR "mfa_metodo" <> 'email');

UPDATE "users"
   SET "mfa_secret" = NULL,
       "mfa_backup_codes" = NULL
 WHERE "mfa_secret" IS NOT NULL OR "mfa_backup_codes" IS NOT NULL;
