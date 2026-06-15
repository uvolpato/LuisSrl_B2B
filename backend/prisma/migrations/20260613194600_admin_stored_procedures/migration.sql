-- ============================================================================
-- Stored procedure per amministrazione: gruppi di permessi, override permessi
-- utente, assegnazione gruppo. Ogni scrittura registra audit in transazione.
-- Codici errore LAI (Luis Admin Integration):
--   LAI01 = slug gruppo gia' esistente
--   LAI02 = gruppo inesistente
--   LAI03 = gruppo con utenti assegnati (non eliminabile)
--   LAI04 = utente inesistente
--   LAI05 = permesso non valido
-- ============================================================================

-- ----------------------------------------------------------------------------
-- fn_permission_group_create: crea un gruppo di permessi.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_permission_group_create(
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

  PERFORM fn_audit_log(p_actor_id, 'admin.group.create', 'permission_groups',
    v_group.id::text,
    jsonb_build_object('name', v_group.name, 'slug', v_group.slug),
    'OK', p_ip);
  RETURN v_group;
END;
$$;

-- ----------------------------------------------------------------------------
-- fn_permission_group_update: aggiorna un gruppo di permessi.
-- I campi NULL non modificano il valore. Se slug cambia, verifica univocita'.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_permission_group_update(
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

  PERFORM fn_audit_log(p_actor_id, 'admin.group.update', 'permission_groups',
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

-- ----------------------------------------------------------------------------
-- fn_permission_group_delete: elimina un gruppo solo se non ha utenti.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_permission_group_delete(
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

  PERFORM fn_audit_log(p_actor_id, 'admin.group.delete', 'permission_groups',
    p_group_id::text,
    jsonb_build_object('name', v_group.name, 'slug', v_group.slug),
    'OK', p_ip);
END;
$$;

-- ----------------------------------------------------------------------------
-- fn_admin_permission_upsert: crea o aggiorna un override di permesso per
-- un utente specifico. Se granted = TRUE, concede il permesso (anche se non
-- nel gruppo); se FALSE, lo nega (sovrascrive il gruppo).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_admin_permission_upsert(
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

  PERFORM fn_audit_log(p_actor_id, 'admin.permission.upsert', 'admin_permissions',
    v_ap.id::text,
    jsonb_build_object('user_id', p_user_id, 'permission', p_permission,
                       'granted', p_granted),
    'OK', p_ip);
  RETURN v_ap;
END;
$$;

-- ----------------------------------------------------------------------------
-- fn_admin_permission_remove: rimuove uno o piu' override per un utente.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_admin_permission_remove(
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

  PERFORM fn_audit_log(p_actor_id, 'admin.permission.remove', 'admin_permissions',
    NULL,
    jsonb_build_object('user_id', p_user_id, 'permissions', p_permissions,
                       'rimossi', v_removed),
    'OK', p_ip);
END;
$$;

-- ----------------------------------------------------------------------------
-- fn_user_assign_group: assegna un gruppo a un utente (o lo rimuove se NULL).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_user_assign_group(
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

  PERFORM fn_audit_log(p_actor_id, 'admin.user.group.assign', 'users',
    p_user_id::text,
    jsonb_build_object('group_id', p_group_id),
    'OK', p_ip);
  RETURN v_user;
END;
$$;
