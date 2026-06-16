-- Soft-delete utente admin via stored procedure: allinea alla convenzione del
-- progetto (ogni scrittura passa da una SP che scrive l'audit nella stessa
-- transazione). Sostituisce l'UPDATE raw che non tracciava l'eliminazione.
CREATE OR REPLACE FUNCTION users.fn_user_soft_delete(
  p_actor_id integer,
  p_user_id  integer,
  p_ip       text DEFAULT NULL
) RETURNS users
LANGUAGE plpgsql
AS $$
DECLARE
  v_user users;
BEGIN
  IF EXISTS (SELECT 1 FROM users WHERE id = p_user_id AND ruolo = 'SUPERUSER'::"AdminRole") THEN
    RAISE EXCEPTION 'non puoi eliminare un SUPERUSER' USING ERRCODE = 'LUI03';
  END IF;

  UPDATE users
  SET stato = 'BLOCCATO'::"UserStatus", deleted_at = now(), updated_at = now()
  WHERE id = p_user_id AND deleted_at IS NULL
  RETURNING * INTO v_user;

  IF v_user.id IS NULL THEN
    RAISE EXCEPTION 'utente % inesistente o gia'' eliminato', p_user_id USING ERRCODE = 'LUI03';
  END IF;

  PERFORM core.fn_audit_log(p_actor_id, 'user.delete', 'users', v_user.id::text,
    jsonb_build_object('email', v_user.email), 'OK', p_ip);
  RETURN v_user;
END;
$$;
