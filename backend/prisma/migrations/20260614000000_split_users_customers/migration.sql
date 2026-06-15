-- Split users table: admin/staff in `users`, clienti in `customers`
-- Nuovi enum per i ruoli
CREATE TYPE "AdminRole" AS ENUM ('SUPERUSER', 'AMMINISTRATORE', 'UTENTE', 'SOSPESO');

-- Schema per stored procedure dei clienti
CREATE SCHEMA IF NOT EXISTS customers;

-- Tabella clienti (copia struttura users senza is_super_admin e group_id)
CREATE TABLE customers (
  id                 SERIAL PRIMARY KEY,
  email              TEXT NOT NULL UNIQUE,
  password_hash      TEXT NOT NULL,
  nome               TEXT NOT NULL,
  ragione_sociale    TEXT,
  partita_iva        TEXT UNIQUE,
  telefono           TEXT,
  ruolo              "UserRole" NOT NULL DEFAULT 'CLIENTE',
  stato              "UserStatus" NOT NULL DEFAULT 'ATTIVO',
  preferred_language TEXT NOT NULL DEFAULT 'it',
  must_change_password BOOLEAN NOT NULL DEFAULT true,
  avatar_color       TEXT NOT NULL DEFAULT 'oklch(55% 0.15 250)',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Copia i clienti esistenti
INSERT INTO customers (email, password_hash, nome, ragione_sociale, partita_iva,
                       telefono, ruolo, stato, preferred_language,
                       must_change_password, avatar_color, created_at, updated_at)
SELECT email, password_hash, nome, ragione_sociale, partita_iva,
       telefono, ruolo, stato, preferred_language,
       must_change_password, avatar_color, created_at, updated_at
FROM users WHERE ruolo = 'CLIENTE';

-- Elimina i clienti dalla tabella users
DELETE FROM users WHERE ruolo = 'CLIENTE';

-- Converte la colonna ruolo su users al nuovo enum AdminRole
ALTER TABLE users ALTER COLUMN ruolo DROP DEFAULT;
ALTER TABLE users ALTER COLUMN ruolo TYPE "AdminRole"
  USING (CASE ruolo
    WHEN 'ADMIN' THEN 'AMMINISTRATORE'::"AdminRole"
    ELSE 'UTENTE'::"AdminRole"
  END);

-- Modifica il default
ALTER TABLE users ALTER COLUMN ruolo SET DEFAULT 'UTENTE';

-- L'admin esistente diventa SUPERUSER
UPDATE users SET ruolo = 'SUPERUSER'::"AdminRole"
WHERE email = 'admin@luissrl.it' OR is_super_admin = true;

-- Rimuove is_super_admin (sostituito da ruolo SUPERUSER)
ALTER TABLE users DROP COLUMN is_super_admin;

-- Rimuove campi specifici dei clienti dalla tabella users
ALTER TABLE users DROP COLUMN ragione_sociale;
ALTER TABLE users DROP COLUMN partita_iva;

-- Aggiorna default must_change_password per users (admin non deve cambiare pwd al primo accesso)
ALTER TABLE users ALTER COLUMN must_change_password SET DEFAULT false;

-- ── Stored procedure per customers ──────────────────────────────

CREATE OR REPLACE FUNCTION customers.fn_customer_create(
  p_actor_id           integer,
  p_email              text,
  p_password_hash      text,
  p_nome               text,
  p_ragione_sociale    text DEFAULT NULL,
  p_partita_iva        text DEFAULT NULL,
  p_telefono           text DEFAULT NULL,
  p_preferred_language text DEFAULT 'it',
  p_ip                 text DEFAULT NULL
) RETURNS customers
LANGUAGE plpgsql
AS $$
DECLARE
  v_cust customers;
  v_palette text[] := ARRAY[
    'oklch(55% 0.18 25)', 'oklch(55% 0.15 145)', 'oklch(55% 0.15 250)',
    'oklch(60% 0.15 80)', 'oklch(55% 0.18 330)', 'oklch(55% 0.15 190)',
    'oklch(50% 0.15 15)', 'oklch(58% 0.15 280)', 'oklch(60% 0.15 50)',
    'oklch(50% 0.12 200)'
  ];
BEGIN
  IF EXISTS (SELECT 1 FROM customers WHERE lower(email) = lower(p_email)) THEN
    RAISE EXCEPTION 'email gia'' registrata: %', p_email USING ERRCODE = 'LUI01';
  END IF;
  IF p_partita_iva IS NOT NULL
     AND EXISTS (SELECT 1 FROM customers WHERE partita_iva = p_partita_iva) THEN
    RAISE EXCEPTION 'partita IVA gia'' registrata: %', p_partita_iva USING ERRCODE = 'LUI02';
  END IF;

  INSERT INTO customers (email, password_hash, nome, ragione_sociale, partita_iva,
                         telefono, preferred_language, avatar_color, updated_at)
  VALUES (lower(p_email), p_password_hash, p_nome, p_ragione_sociale, p_partita_iva,
          p_telefono, coalesce(p_preferred_language, 'it'),
          v_palette[floor(random() * array_length(v_palette, 1)) + 1], now())
  RETURNING * INTO v_cust;

  PERFORM core.fn_audit_log(p_actor_id, 'customer.create', 'customers', v_cust.id::text,
    jsonb_build_object('email', v_cust.email, 'ragione_sociale', v_cust.ragione_sociale),
    'OK', p_ip);
  RETURN v_cust;
END;
$$;

CREATE OR REPLACE FUNCTION customers.fn_customer_update(
  p_actor_id           integer,
  p_customer_id        integer,
  p_nome               text DEFAULT NULL,
  p_ragione_sociale    text DEFAULT NULL,
  p_partita_iva        text DEFAULT NULL,
  p_telefono           text DEFAULT NULL,
  p_preferred_language text DEFAULT NULL,
  p_ip                 text DEFAULT NULL
) RETURNS customers
LANGUAGE plpgsql
AS $$
DECLARE
  v_cust customers;
BEGIN
  IF p_partita_iva IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM customers WHERE partita_iva = p_partita_iva AND id <> p_customer_id) THEN
      RAISE EXCEPTION 'partita IVA gia'' registrata: %', p_partita_iva USING ERRCODE = 'LUI02';
    END IF;
  END IF;

  UPDATE customers SET
    nome               = coalesce(p_nome, nome),
    ragione_sociale    = coalesce(p_ragione_sociale, ragione_sociale),
    partita_iva        = coalesce(p_partita_iva, partita_iva),
    telefono           = coalesce(p_telefono, telefono),
    preferred_language = coalesce(p_preferred_language, preferred_language),
    updated_at         = now()
  WHERE id = p_customer_id
  RETURNING * INTO v_cust;

  PERFORM core.fn_audit_log(p_actor_id, 'customer.update', 'customers', v_cust.id::text,
    jsonb_build_object('nome', v_cust.nome, 'ragione_sociale', v_cust.ragione_sociale),
    'OK', p_ip);
  RETURN v_cust;
END;
$$;

CREATE OR REPLACE FUNCTION customers.fn_customer_set_blocked(
  p_actor_id   integer,
  p_customer_id integer,
  p_blocked    boolean,
  p_ip         text DEFAULT NULL
) RETURNS customers
LANGUAGE plpgsql
AS $$
DECLARE
  v_cust customers;
BEGIN
  UPDATE customers SET stato = CASE WHEN p_blocked THEN 'BLOCCATO'::"UserStatus" ELSE 'ATTIVO'::"UserStatus" END, updated_at = now()
  WHERE id = p_customer_id
  RETURNING * INTO v_cust;

  PERFORM core.fn_audit_log(p_actor_id, 'customer.' || CASE WHEN p_blocked THEN 'block' ELSE 'unblock' END,
    'customers', v_cust.id::text, jsonb_build_object('email', v_cust.email, 'stato', v_cust.stato), 'OK', p_ip);
  RETURN v_cust;
END;
$$;

CREATE OR REPLACE FUNCTION customers.fn_customer_set_password(
  p_actor_id      integer,
  p_customer_id   integer,
  p_password_hash text,
  p_must_change   boolean DEFAULT true,
  p_ip            text DEFAULT NULL
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
    jsonb_build_object('must_change', p_must_change), 'OK', p_ip);
  RETURN v_cust;
END;
$$;

-- ── Aggiorna le SP esistenti per gestire il nuovo AdminRole ─────

CREATE OR REPLACE FUNCTION users.fn_user_create(
  p_actor_id           integer,
  p_email              text,
  p_password_hash      text,
  p_nome               text,
  p_ruolo              "AdminRole" DEFAULT 'UTENTE',
  p_preferred_language text DEFAULT 'it',
  p_ip                 text DEFAULT NULL
) RETURNS users
LANGUAGE plpgsql
AS $$
DECLARE
  v_user users;
  v_palette text[] := ARRAY[
    'oklch(55% 0.18 25)', 'oklch(55% 0.15 145)', 'oklch(55% 0.15 250)',
    'oklch(60% 0.15 80)', 'oklch(55% 0.18 330)', 'oklch(55% 0.15 190)',
    'oklch(50% 0.15 15)', 'oklch(58% 0.15 280)', 'oklch(60% 0.15 50)',
    'oklch(50% 0.12 200)'
  ];
BEGIN
  IF EXISTS (SELECT 1 FROM users WHERE lower(email) = lower(p_email)) THEN
    RAISE EXCEPTION 'email gia'' registrata: %', p_email USING ERRCODE = 'LUI01';
  END IF;

  INSERT INTO users (email, password_hash, nome, ruolo, preferred_language,
                     avatar_color, must_change_password, updated_at)
  VALUES (lower(p_email), p_password_hash, p_nome, p_ruolo,
          coalesce(p_preferred_language, 'it'),
          v_palette[floor(random() * array_length(v_palette, 1)) + 1], false, now())
  RETURNING * INTO v_user;

  PERFORM core.fn_audit_log(p_actor_id, 'user.create', 'users', v_user.id::text,
    jsonb_build_object('email', v_user.email, 'ruolo', v_user.ruolo),
    'OK', p_ip);
  RETURN v_user;
END;
$$;

CREATE OR REPLACE FUNCTION users.fn_user_update(
  p_actor_id           integer,
  p_user_id            integer,
  p_nome               text DEFAULT NULL,
  p_ruolo              "AdminRole" DEFAULT NULL,
  p_preferred_language text DEFAULT NULL,
  p_ip                 text DEFAULT NULL
) RETURNS users
LANGUAGE plpgsql
AS $$
DECLARE
  v_user users;
BEGIN
  UPDATE users SET
    nome               = coalesce(p_nome, nome),
    ruolo              = coalesce(p_ruolo, ruolo),
    preferred_language = coalesce(p_preferred_language, preferred_language),
    updated_at         = now()
  WHERE id = p_user_id
  RETURNING * INTO v_user;

  PERFORM core.fn_audit_log(p_actor_id, 'user.update', 'users', v_user.id::text,
    jsonb_build_object('nome', v_user.nome, 'ruolo', v_user.ruolo), 'OK', p_ip);
  RETURN v_user;
END;
$$;

CREATE OR REPLACE FUNCTION users.fn_user_set_blocked(
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
  IF EXISTS (SELECT 1 FROM users WHERE id = p_user_id AND ruolo = 'SUPERUSER'::"AdminRole") THEN
    RAISE EXCEPTION 'non puoi bloccare un SUPERUSER' USING ERRCODE = 'LUI03';
  END IF;

  UPDATE users SET stato = CASE WHEN p_blocked THEN 'BLOCCATO'::"UserStatus" ELSE 'ATTIVO'::"UserStatus" END, updated_at = now()
  WHERE id = p_user_id
  RETURNING * INTO v_user;

  PERFORM core.fn_audit_log(p_actor_id, 'user.' || CASE WHEN p_blocked THEN 'block' ELSE 'unblock' END,
    'users', v_user.id::text, jsonb_build_object('email', v_user.email, 'stato', v_user.stato), 'OK', p_ip);
  RETURN v_user;
END;
$$;

CREATE OR REPLACE FUNCTION users.fn_user_set_password(
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
  UPDATE users SET password_hash = p_password_hash, must_change_password = p_must_change, updated_at = now()
  WHERE id = p_user_id
  RETURNING * INTO v_user;

  PERFORM core.fn_audit_log(p_actor_id, 'user.set_password', 'users', v_user.id::text,
    jsonb_build_object('must_change', p_must_change), 'OK', p_ip);
  RETURN v_user;
END;
$$;

-- ── Correlazione utente-gruppo (usa AdminRole) ──────────────────

CREATE OR REPLACE FUNCTION admin.fn_user_assign_group(
  p_actor_id integer,
  p_user_id  integer,
  p_group_id integer DEFAULT NULL,
  p_ip       text DEFAULT NULL
) RETURNS users
LANGUAGE plpgsql
AS $$
DECLARE
  v_user users;
BEGIN
  IF EXISTS (SELECT 1 FROM users WHERE id = p_user_id AND ruolo = 'SUPERUSER'::"AdminRole") THEN
    RAISE EXCEPTION 'non puoi assegnare un gruppo a un SUPERUSER' USING ERRCODE = 'LAI04';
  END IF;

  UPDATE users SET group_id = p_group_id, updated_at = now()
  WHERE id = p_user_id
  RETURNING * INTO v_user;

  PERFORM core.fn_audit_log(p_actor_id, 'user.assign_group', 'users', v_user.id::text,
    jsonb_build_object('group_id', p_group_id), 'OK', p_ip);
  RETURN v_user;
END;
$$;

-- ── Auth: cerca in entrambe le tabelle ──────────────────────────

CREATE OR REPLACE FUNCTION auth.fn_login_lookup(
  p_email text,
  OUT user_id integer,
  OUT user_type text,
  OUT password_hash text,
  OUT nome text,
  OUT ruolo text,
  OUT stato "UserStatus",
  OUT must_change_password boolean,
  OUT avatar_color text
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Cerca prima tra gli utenti admin
  SELECT id, 'admin'::text, u.password_hash, u.nome, u.ruolo::text, u.stato, u.must_change_password, u.avatar_color
  INTO user_id, user_type, password_hash, nome, ruolo, stato, must_change_password, avatar_color
  FROM users u WHERE lower(email) = lower(p_email);

  IF FOUND THEN RETURN; END IF;

  -- Poi tra i clienti
  SELECT id, 'customer'::text, c.password_hash, c.nome, c.ruolo::text, c.stato, c.must_change_password, c.avatar_color
  INTO user_id, user_type, password_hash, nome, ruolo, stato, must_change_password, avatar_color
  FROM customers c WHERE lower(email) = lower(p_email);
END;
$$;
