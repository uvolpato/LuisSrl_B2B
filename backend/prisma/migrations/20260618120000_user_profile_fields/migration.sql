-- Campi profilo dell'utente admin (modificabili dal tab Account).
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_date date;

-- Aggiornamento del PROPRIO profilo (nome, bio, genere, data di nascita).
-- Solo i campi profilo: ruolo/stato non sono toccabili da qui. Audit come da
-- convenzione (ogni scrittura passa da una SP che traccia nella stessa
-- transazione). L'attore e' l'utente stesso (default actor_type 'admin').
CREATE OR REPLACE FUNCTION users.fn_user_update_profile(
  p_actor_id   integer,
  p_user_id    integer,
  p_nome       text,
  p_bio        text DEFAULT NULL,
  p_gender     text DEFAULT NULL,
  p_birth_date date DEFAULT NULL,
  p_ip         text DEFAULT NULL
) RETURNS users
LANGUAGE plpgsql
AS $$
DECLARE
  v_user users;
BEGIN
  UPDATE users SET
    nome       = coalesce(p_nome, nome),
    bio        = p_bio,
    gender     = p_gender,
    birth_date = p_birth_date,
    updated_at = now()
  WHERE id = p_user_id
  RETURNING * INTO v_user;

  IF v_user.id IS NULL THEN
    RAISE EXCEPTION 'utente % inesistente', p_user_id USING ERRCODE = 'LUI03';
  END IF;

  PERFORM core.fn_audit_log(p_actor_id, 'user.profile_update', 'users', v_user.id::text,
    jsonb_build_object('nome', v_user.nome, 'gender', v_user.gender,
                       'birth_date', v_user.birth_date), 'OK', p_ip);
  RETURN v_user;
END;
$$;
