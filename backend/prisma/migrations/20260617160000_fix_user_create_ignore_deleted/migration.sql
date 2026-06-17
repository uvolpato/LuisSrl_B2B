-- fn_user_create: ignora gli utenti soft-deleted nel controllo email duplicata
-- così un'email di un account cancellato può essere riutilizzata.

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
  IF EXISTS (SELECT 1 FROM users WHERE lower(email) = lower(p_email) AND deleted_at IS NULL) THEN
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
