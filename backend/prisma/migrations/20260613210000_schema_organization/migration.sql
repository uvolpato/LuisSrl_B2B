-- ============================================================================
-- Organizzazione degli schemi PostgreSQL. Le tabelle restano in public
-- (Prisma le trova con schema=public), le funzioni vengono spostate in
-- schemi dedicati per modulo:
--
--   core  → fn_audit_log            (utility condivisa da tutti i moduli)
--   auth  → fn_auth_log_attempt     (login/logout)
--   users → fn_user_*               (crud utenti)
--   admin → fn_permission_group_*,  (gruppi, permessi, assegnazione)
--           fn_admin_permission_*,
--           fn_user_assign_group
--
-- I riferimenti incrociati tra funzioni usano nomi qualificati
-- (es. core.fn_audit_log), cosi' come le chiamate dai repository NestJS.
-- ============================================================================

-- 1. Creazione schemi ────────────────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS users;
CREATE SCHEMA IF NOT EXISTS admin;

-- 2. Eliminazione vecchie funzioni da public ─────────────────────────────────
DROP FUNCTION IF EXISTS public.fn_audit_log(
  integer, text, text, text, jsonb, text, text
) CASCADE;
DROP FUNCTION IF EXISTS public.fn_auth_log_attempt(
  text, boolean, integer, text, text
) CASCADE;
DROP FUNCTION IF EXISTS public.fn_user_create(
  integer, text, text, text, text, text, text, "UserRole", text, text
) CASCADE;
DROP FUNCTION IF EXISTS public.fn_user_update(
  integer, integer, text, text, text, text, text, text
) CASCADE;
DROP FUNCTION IF EXISTS public.fn_user_set_blocked(
  integer, integer, boolean, text
) CASCADE;
DROP FUNCTION IF EXISTS public.fn_user_set_password(
  integer, integer, text, boolean, text
) CASCADE;
DROP FUNCTION IF EXISTS public.fn_permission_group_create(
  integer, text, text, text[], text
) CASCADE;
DROP FUNCTION IF EXISTS public.fn_permission_group_update(
  integer, integer, text, text, text[], text
) CASCADE;
DROP FUNCTION IF EXISTS public.fn_permission_group_delete(
  integer, integer, text
) CASCADE;
DROP FUNCTION IF EXISTS public.fn_admin_permission_upsert(
  integer, integer, text, boolean, text
) CASCADE;
DROP FUNCTION IF EXISTS public.fn_admin_permission_remove(
  integer, integer, text[], text
) CASCADE;
DROP FUNCTION IF EXISTS public.fn_user_assign_group(
  integer, integer, integer, text
) CASCADE;

-- ============================================================================
-- SCHEMA core
-- ============================================================================

CREATE OR REPLACE FUNCTION core.fn_audit_log(
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

-- ============================================================================
-- SCHEMA auth
-- ============================================================================

CREATE OR REPLACE FUNCTION auth.fn_auth_log_attempt(
  p_email   text,
  p_success boolean,
  p_user_id integer DEFAULT NULL,
  p_motivo  text DEFAULT NULL,
  p_ip      text DEFAULT NULL
) RETURNS bigint
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN core.fn_audit_log(p_user_id,
    CASE WHEN p_success THEN 'auth.login' ELSE 'auth.login_failed' END,
    'users', NULL,
    jsonb_build_object('email', lower(p_email), 'motivo', p_motivo),
    CASE WHEN p_success THEN 'OK' ELSE 'KO' END,
    p_ip);
END;
$$;

-- ============================================================================
-- SCHEMA users
-- ============================================================================

CREATE OR REPLACE FUNCTION users.fn_user_create(
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

  PERFORM core.fn_audit_log(p_actor_id, 'user.create', 'users', v_user.id::text,
    jsonb_build_object('email', v_user.email, 'ruolo', v_user.ruolo,
                       'ragione_sociale', v_user.ragione_sociale),
    'OK', p_ip);
  RETURN v_user;
END;
$$;

CREATE OR REPLACE FUNCTION users.fn_user_update(
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

  PERFORM core.fn_audit_log(p_actor_id, 'user.update', 'users', p_user_id::text,
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

  PERFORM core.fn_audit_log(p_actor_id,
    CASE WHEN p_blocked THEN 'user.block' ELSE 'user.unblock' END,
    'users', p_user_id::text, NULL, 'OK', p_ip);
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
  UPDATE users SET
    password_hash        = p_password_hash,
    must_change_password = p_must_change,
    updated_at           = now()
  WHERE id = p_user_id
  RETURNING * INTO v_user;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'utente % inesistente', p_user_id USING ERRCODE = 'LUI03';
  END IF;

  PERFORM core.fn_audit_log(p_actor_id, 'user.set_password', 'users', p_user_id::text,
    jsonb_build_object('must_change', p_must_change), 'OK', p_ip);
  RETURN v_user;
END;
$$;

-- ============================================================================
-- SCHEMA admin
-- ============================================================================

CREATE OR REPLACE FUNCTION admin.fn_permission_group_create(
  p_actor_id    integer,
  p_name        text,
  p_slug        text,
  p_permissions text[],
  p_ip          text DEFAULT NULL
) RETURNS permission_groups
LANGUAGE plpgsql
AS $$
DECLARE
  v_group permission_groups;
BEGIN
  IF EXISTS (SELECT 1 FROM permission_groups WHERE slug = p_slug) THEN
    RAISE EXCEPTION 'slug gruppo gia'' esistente: %', p_slug USING ERRCODE = 'LAI01';
  END IF;

  INSERT INTO permission_groups (name, slug, permissions, updated_at)
  VALUES (p_name, p_slug, p_permissions, now())
  RETURNING * INTO v_group;

  PERFORM core.fn_audit_log(p_actor_id, 'admin.group.create', 'permission_groups',
    v_group.id::text,
    jsonb_build_object('name', v_group.name, 'slug', v_group.slug),
    'OK', p_ip);
  RETURN v_group;
END;
$$;

CREATE OR REPLACE FUNCTION admin.fn_permission_group_update(
  p_actor_id    integer,
  p_group_id    integer,
  p_name        text DEFAULT NULL,
  p_slug        text DEFAULT NULL,
  p_permissions text[] DEFAULT NULL,
  p_ip          text DEFAULT NULL
) RETURNS permission_groups
LANGUAGE plpgsql
AS $$
DECLARE
  v_old   permission_groups;
  v_group permission_groups;
BEGIN
  SELECT * INTO v_old FROM permission_groups WHERE id = p_group_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'gruppo % inesistente', p_group_id USING ERRCODE = 'LAI02';
  END IF;

  IF p_slug IS NOT NULL AND p_slug <> v_old.slug
     AND EXISTS (SELECT 1 FROM permission_groups WHERE slug = p_slug AND id <> p_group_id) THEN
    RAISE EXCEPTION 'slug gruppo gia'' esistente: %', p_slug USING ERRCODE = 'LAI01';
  END IF;

  UPDATE permission_groups SET
    name        = coalesce(p_name, name),
    slug        = coalesce(p_slug, slug),
    permissions = coalesce(p_permissions, permissions),
    updated_at  = now()
  WHERE id = p_group_id
  RETURNING * INTO v_group;

  PERFORM core.fn_audit_log(p_actor_id, 'admin.group.update', 'permission_groups',
    p_group_id::text,
    jsonb_build_object(
      'prima', jsonb_build_object('name', v_old.name, 'slug', v_old.slug,
                                  'permissions', v_old.permissions),
      'dopo',  jsonb_build_object('name', v_group.name, 'slug', v_group.slug,
                                  'permissions', v_group.permissions)),
    'OK', p_ip);
  RETURN v_group;
END;
$$;

CREATE OR REPLACE FUNCTION admin.fn_permission_group_delete(
  p_actor_id integer,
  p_group_id integer,
  p_ip       text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_group permission_groups;
  v_count bigint;
BEGIN
  SELECT * INTO v_group FROM permission_groups WHERE id = p_group_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'gruppo % inesistente', p_group_id USING ERRCODE = 'LAI02';
  END IF;

  SELECT count(*) INTO v_count FROM users WHERE group_id = p_group_id;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'gruppo % ha % utenti assegnati', p_group_id, v_count USING ERRCODE = 'LAI03';
  END IF;

  DELETE FROM permission_groups WHERE id = p_group_id;

  PERFORM core.fn_audit_log(p_actor_id, 'admin.group.delete', 'permission_groups',
    p_group_id::text,
    jsonb_build_object('name', v_group.name, 'slug', v_group.slug),
    'OK', p_ip);
END;
$$;

CREATE OR REPLACE FUNCTION admin.fn_admin_permission_upsert(
  p_actor_id   integer,
  p_user_id    integer,
  p_permission text,
  p_granted    boolean,
  p_ip         text DEFAULT NULL
) RETURNS admin_permissions
LANGUAGE plpgsql
AS $$
DECLARE
  v_ap admin_permissions;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'utente % inesistente', p_user_id USING ERRCODE = 'LAI04';
  END IF;

  INSERT INTO admin_permissions (user_id, permission, granted)
  VALUES (p_user_id, p_permission, p_granted)
  ON CONFLICT (user_id, permission)
  DO UPDATE SET granted = p_granted
  RETURNING * INTO v_ap;

  PERFORM core.fn_audit_log(p_actor_id, 'admin.permission.upsert', 'admin_permissions',
    v_ap.id::text,
    jsonb_build_object('user_id', p_user_id, 'permission', p_permission,
                       'granted', p_granted),
    'OK', p_ip);
  RETURN v_ap;
END;
$$;

CREATE OR REPLACE FUNCTION admin.fn_admin_permission_remove(
  p_actor_id    integer,
  p_user_id     integer,
  p_permissions text[],
  p_ip          text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_removed bigint;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'utente % inesistente', p_user_id USING ERRCODE = 'LAI04';
  END IF;

  DELETE FROM admin_permissions
  WHERE user_id = p_user_id AND permission = ANY(p_permissions);

  GET DIAGNOSTICS v_removed = ROW_COUNT;

  PERFORM core.fn_audit_log(p_actor_id, 'admin.permission.remove', 'admin_permissions',
    NULL,
    jsonb_build_object('user_id', p_user_id, 'permissions', p_permissions,
                       'rimossi', v_removed),
    'OK', p_ip);
END;
$$;

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
  SELECT * INTO v_user FROM users WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'utente % inesistente', p_user_id USING ERRCODE = 'LAI04';
  END IF;

  IF p_group_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM permission_groups WHERE id = p_group_id) THEN
      RAISE EXCEPTION 'gruppo % inesistente', p_group_id USING ERRCODE = 'LAI02';
    END IF;
  END IF;

  UPDATE users SET
    group_id   = p_group_id,
    updated_at = now()
  WHERE id = p_user_id
  RETURNING * INTO v_user;

  PERFORM core.fn_audit_log(p_actor_id, 'admin.user.group.assign', 'users',
    p_user_id::text,
    jsonb_build_object('group_id', p_group_id),
    'OK', p_ip);
  RETURN v_user;
END;
$$;
