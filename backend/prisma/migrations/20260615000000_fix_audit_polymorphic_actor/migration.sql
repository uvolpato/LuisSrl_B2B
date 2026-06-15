-- ============================================================================
-- Attore audit polimorfico (users=admin OPPURE customers=cliente).
--
-- Problema: audit_log.actor_id aveva una FK rigida verso users(id). Ma le due
-- tabelle (users, customers) hanno sequenze di id indipendenti: il login o le
-- azioni di un cliente scrivevano actor_id = customer.id, causando
--   - violazione FK (cliente con id non presente tra gli admin) -> errore 500
--   - attribuzione errata (cliente con id che collide con un admin).
--
-- Soluzione: niente FK; aggiungiamo actor_type per disambiguare la tabella.
-- ============================================================================

ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_actor_id_fkey;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS actor_type text;

-- Le righe storiche (vincolate dalla vecchia FK) erano tutte attori admin.
UPDATE audit_log SET actor_type = 'admin'
WHERE actor_id IS NOT NULL AND actor_type IS NULL;

-- ── core.fn_audit_log: unico punto d'inserimento, ora stampa actor_type ──
-- DROP+CREATE perche' aggiungere un parametro genererebbe un overload separato.
-- Le SP esistenti che la chiamano con 7 argomenti risolvono sulla nuova
-- funzione (p_actor_type usa il default 'admin', corretto: il loro attore e'
-- sempre un admin). Attore NULL (sistema/seed) -> actor_type NULL.
DROP FUNCTION IF EXISTS core.fn_audit_log(integer, text, text, text, jsonb, text, text);
CREATE FUNCTION core.fn_audit_log(
  p_actor_id   integer,
  p_azione     text,
  p_entita     text DEFAULT NULL,
  p_entita_id  text DEFAULT NULL,
  p_dettagli   jsonb DEFAULT NULL,
  p_esito      text DEFAULT 'OK',
  p_ip         text DEFAULT NULL,
  p_actor_type text DEFAULT 'admin'
) RETURNS bigint
LANGUAGE plpgsql
AS $$
DECLARE
  v_id bigint;
BEGIN
  INSERT INTO audit_log (actor_id, actor_type, azione, entita, entita_id, dettagli, esito, ip)
  VALUES (
    p_actor_id,
    CASE WHEN p_actor_id IS NULL THEN NULL ELSE p_actor_type END,
    p_azione, p_entita, p_entita_id, p_dettagli, p_esito, p_ip
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- ── auth.fn_auth_log_attempt: l'attore e' del tipo dell'account che fa login ──
DROP FUNCTION IF EXISTS auth.fn_auth_log_attempt(text, boolean, integer, text, text);
CREATE FUNCTION auth.fn_auth_log_attempt(
  p_email      text,
  p_success    boolean,
  p_user_id    integer DEFAULT NULL,
  p_motivo     text DEFAULT NULL,
  p_ip         text DEFAULT NULL,
  p_actor_type text DEFAULT 'admin'
) RETURNS bigint
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN core.fn_audit_log(
    p_user_id,
    CASE WHEN p_success THEN 'auth.login' ELSE 'auth.login_failed' END,
    CASE WHEN p_actor_type = 'customer' THEN 'customers' ELSE 'users' END,
    NULL,
    jsonb_build_object('email', lower(p_email), 'motivo', p_motivo),
    CASE WHEN p_success THEN 'OK' ELSE 'KO' END,
    p_ip,
    p_actor_type
  );
END;
$$;

-- ── customers.fn_customer_set_password: chiamata da admin (reset) o dal cliente
--    stesso (cambio password). L'attore puo' quindi essere admin o customer. ──
DROP FUNCTION IF EXISTS customers.fn_customer_set_password(integer, integer, text, boolean, text);
CREATE FUNCTION customers.fn_customer_set_password(
  p_actor_id      integer,
  p_customer_id   integer,
  p_password_hash text,
  p_must_change   boolean DEFAULT true,
  p_ip            text DEFAULT NULL,
  p_actor_type    text DEFAULT 'admin'
) RETURNS customers
LANGUAGE plpgsql
AS $$
DECLARE
  v_cust customers;
BEGIN
  UPDATE customers SET password_hash = p_password_hash, must_change_password = p_must_change, updated_at = now()
  WHERE id = p_customer_id
  RETURNING * INTO v_cust;

  PERFORM core.fn_audit_log(p_actor_id, 'customer.set_password', 'customers', v_cust.id::text,
    jsonb_build_object('must_change', p_must_change), 'OK', p_ip, p_actor_type);
  RETURN v_cust;
END;
$$;
