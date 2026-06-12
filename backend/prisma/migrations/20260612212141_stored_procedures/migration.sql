-- ============================================================================
-- Stored procedure del portale B2B Luis.
-- Regola di progetto: TUTTE le scritture applicative passano da queste
-- funzioni, che registrano l'audit nella stessa transazione. Le letture
-- restano su Prisma. Eccezioni: store di sessione (connect-pg-simple) e
-- verifica password (argon2, lato applicazione).
-- Debug: SELECT * FROM audit_log ORDER BY id DESC; oppure chiamare le
-- funzioni direttamente da psql per riprodurre un comportamento.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- fn_audit_log: inserisce una riga di audit. Usata dalle altre funzioni e
-- richiamabile direttamente per azioni applicative senza scrittura propria.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_audit_log(
  p_actor_id  integer,
  p_azione    text,
  p_entita    text DEFAULT NULL,
  p_entita_id text DEFAULT NULL,
  p_dettagli  jsonb DEFAULT NULL,
  p_esito     text DEFAULT 'OK',
  p_ip        text DEFAULT NULL
) RETURNS bigint
LANGUAGE plpgsql
AS $$
DECLARE
  v_id bigint;
BEGIN
  INSERT INTO audit_log (actor_id, azione, entita, entita_id, dettagli, esito, ip)
  VALUES (p_actor_id, p_azione, p_entita, p_entita_id, p_dettagli, p_esito, p_ip)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- ----------------------------------------------------------------------------
-- fn_user_create: crea un utente (admin o cliente) e ne traccia la creazione.
-- Errori applicativi con ERRCODE dedicati, intercettati dal backend:
--   LUI01 = email gia' registrata
--   LUI02 = partita IVA gia' registrata (un solo account per azienda)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_user_create(
  p_actor_id           integer,
  p_email              text,
  p_password_hash      text,
  p_nome               text,
  p_ragione_sociale    text DEFAULT NULL,
  p_partita_iva        text DEFAULT NULL,
  p_telefono           text DEFAULT NULL,
  p_ruolo              "UserRole" DEFAULT 'CLIENTE',
  p_preferred_language text DEFAULT 'it',
  p_ip                 text DEFAULT NULL
) RETURNS users
LANGUAGE plpgsql
AS $$
DECLARE
  v_user users;
BEGIN
  IF EXISTS (SELECT 1 FROM users WHERE lower(email) = lower(p_email)) THEN
    RAISE EXCEPTION 'email gia'' registrata: %', p_email USING ERRCODE = 'LUI01';
  END IF;
  IF p_partita_iva IS NOT NULL
     AND EXISTS (SELECT 1 FROM users WHERE partita_iva = p_partita_iva) THEN
    RAISE EXCEPTION 'partita IVA gia'' registrata: %', p_partita_iva USING ERRCODE = 'LUI02';
  END IF;

  INSERT INTO users (email, password_hash, nome, ragione_sociale, partita_iva,
                     telefono, ruolo, preferred_language, updated_at)
  VALUES (lower(p_email), p_password_hash, p_nome, p_ragione_sociale, p_partita_iva,
          p_telefono, p_ruolo, coalesce(p_preferred_language, 'it'), now())
  RETURNING * INTO v_user;

  PERFORM fn_audit_log(p_actor_id, 'user.create', 'users', v_user.id::text,
    jsonb_build_object('email', v_user.email, 'ruolo', v_user.ruolo,
                       'ragione_sociale', v_user.ragione_sociale),
    'OK', p_ip);
  RETURN v_user;
END;
$$;

-- ----------------------------------------------------------------------------
-- fn_user_update: aggiorna i dati anagrafici. I parametri NULL non modificano
-- il campo. L'audit registra i valori precedenti e nuovi dei campi toccati.
--   LUI03 = utente inesistente
--   LUI02 = partita IVA gia' registrata
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_user_update(
  p_actor_id           integer,
  p_user_id            integer,
  p_nome               text DEFAULT NULL,
  p_ragione_sociale    text DEFAULT NULL,
  p_partita_iva        text DEFAULT NULL,
  p_telefono           text DEFAULT NULL,
  p_preferred_language text DEFAULT NULL,
  p_ip                 text DEFAULT NULL
) RETURNS users
LANGUAGE plpgsql
AS $$
DECLARE
  v_old  users;
  v_user users;
BEGIN
  SELECT * INTO v_old FROM users WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'utente % inesistente', p_user_id USING ERRCODE = 'LUI03';
  END IF;
  IF p_partita_iva IS NOT NULL AND p_partita_iva <> coalesce(v_old.partita_iva, '')
     AND EXISTS (SELECT 1 FROM users WHERE partita_iva = p_partita_iva AND id <> p_user_id) THEN
    RAISE EXCEPTION 'partita IVA gia'' registrata: %', p_partita_iva USING ERRCODE = 'LUI02';
  END IF;

  UPDATE users SET
    nome               = coalesce(p_nome, nome),
    ragione_sociale    = coalesce(p_ragione_sociale, ragione_sociale),
    partita_iva        = coalesce(p_partita_iva, partita_iva),
    telefono           = coalesce(p_telefono, telefono),
    preferred_language = coalesce(p_preferred_language, preferred_language),
    updated_at         = now()
  WHERE id = p_user_id
  RETURNING * INTO v_user;

  PERFORM fn_audit_log(p_actor_id, 'user.update', 'users', p_user_id::text,
    jsonb_build_object(
      'prima', jsonb_build_object('nome', v_old.nome, 'ragione_sociale', v_old.ragione_sociale,
                                  'partita_iva', v_old.partita_iva, 'telefono', v_old.telefono,
                                  'preferred_language', v_old.preferred_language),
      'dopo',  jsonb_build_object('nome', v_user.nome, 'ragione_sociale', v_user.ragione_sociale,
                                  'partita_iva', v_user.partita_iva, 'telefono', v_user.telefono,
                                  'preferred_language', v_user.preferred_language)),
    'OK', p_ip);
  RETURN v_user;
END;
$$;

-- ----------------------------------------------------------------------------
-- fn_user_set_blocked: blocca/sblocca un cliente. I clienti non si cancellano
-- mai (regola di progetto): il blocco impedisce il login mantenendo lo storico.
--   LUI03 = utente inesistente
--   LUI04 = non si puo' bloccare un amministratore
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_user_set_blocked(
  p_actor_id integer,
  p_user_id  integer,
  p_blocked  boolean,
  p_ip       text DEFAULT NULL
) RETURNS users
LANGUAGE plpgsql
AS $$
DECLARE
  v_user users;
BEGIN
  SELECT * INTO v_user FROM users WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'utente % inesistente', p_user_id USING ERRCODE = 'LUI03';
  END IF;
  IF v_user.ruolo = 'ADMIN' THEN
    RAISE EXCEPTION 'non si puo'' bloccare un amministratore' USING ERRCODE = 'LUI04';
  END IF;

  UPDATE users SET
    stato      = CASE WHEN p_blocked THEN 'BLOCCATO'::"UserStatus" ELSE 'ATTIVO'::"UserStatus" END,
    updated_at = now()
  WHERE id = p_user_id
  RETURNING * INTO v_user;

  PERFORM fn_audit_log(p_actor_id,
    CASE WHEN p_blocked THEN 'user.block' ELSE 'user.unblock' END,
    'users', p_user_id::text, NULL, 'OK', p_ip);
  RETURN v_user;
END;
$$;

-- ----------------------------------------------------------------------------
-- fn_user_set_password: imposta l'hash password (reset admin o cambio proprio).
-- p_must_change = true quando la password e' provvisoria.
--   LUI03 = utente inesistente
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_user_set_password(
  p_actor_id      integer,
  p_user_id       integer,
  p_password_hash text,
  p_must_change   boolean DEFAULT false,
  p_ip            text DEFAULT NULL
) RETURNS users
LANGUAGE plpgsql
AS $$
DECLARE
  v_user users;
BEGIN
  UPDATE users SET
    password_hash        = p_password_hash,
    must_change_password = p_must_change,
    updated_at           = now()
  WHERE id = p_user_id
  RETURNING * INTO v_user;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'utente % inesistente', p_user_id USING ERRCODE = 'LUI03';
  END IF;

  PERFORM fn_audit_log(p_actor_id, 'user.set_password', 'users', p_user_id::text,
    jsonb_build_object('must_change', p_must_change), 'OK', p_ip);
  RETURN v_user;
END;
$$;

-- ----------------------------------------------------------------------------
-- fn_auth_log_attempt: traccia ogni tentativo di login (riuscito o no).
-- La verifica della password avviene nell'applicazione (argon2): qui si
-- registra solo l'esito, per audit e per indagare attacchi o problemi.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_auth_log_attempt(
  p_email   text,
  p_success boolean,
  p_user_id integer DEFAULT NULL,
  p_motivo  text DEFAULT NULL,
  p_ip      text DEFAULT NULL
) RETURNS bigint
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN fn_audit_log(p_user_id,
    CASE WHEN p_success THEN 'auth.login' ELSE 'auth.login_failed' END,
    'users', NULL,
    jsonb_build_object('email', lower(p_email), 'motivo', p_motivo),
    CASE WHEN p_success THEN 'OK' ELSE 'KO' END,
    p_ip);
END;
$$;
