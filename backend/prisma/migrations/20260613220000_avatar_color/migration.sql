-- Aggiunge avatar_color alla tabella users
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_color text NOT NULL DEFAULT 'oklch(55% 0.15 250)';

-- Assegna un colore random agli utenti esistenti che hanno ancora il default
WITH palette AS (
  SELECT ARRAY[
    'oklch(55% 0.18 25)',
    'oklch(55% 0.15 145)',
    'oklch(55% 0.15 250)',
    'oklch(60% 0.15 80)',
    'oklch(55% 0.18 330)',
    'oklch(55% 0.15 190)',
    'oklch(50% 0.15 15)',
    'oklch(58% 0.15 280)',
    'oklch(60% 0.15 50)',
    'oklch(50% 0.12 200)'
  ] AS colors
)
UPDATE users SET avatar_color = palette.colors[floor(random() * 10) + 1]
FROM palette
WHERE avatar_color = 'oklch(55% 0.15 250)';

-- Aggiorna fn_user_create per assegnare un avatar_color random
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
  v_palette text[] := ARRAY[
    'oklch(55% 0.18 25)',
    'oklch(55% 0.15 145)',
    'oklch(55% 0.15 250)',
    'oklch(60% 0.15 80)',
    'oklch(55% 0.18 330)',
    'oklch(55% 0.15 190)',
    'oklch(50% 0.15 15)',
    'oklch(58% 0.15 280)',
    'oklch(60% 0.15 50)',
    'oklch(50% 0.12 200)'
  ];
BEGIN
  IF EXISTS (SELECT 1 FROM users WHERE lower(email) = lower(p_email)) THEN
    RAISE EXCEPTION 'email gia'' registrata: %', p_email USING ERRCODE = 'LUI01';
  END IF;
  IF p_partita_iva IS NOT NULL
     AND EXISTS (SELECT 1 FROM users WHERE partita_iva = p_partita_iva) THEN
    RAISE EXCEPTION 'partita IVA gia'' registrata: %', p_partita_iva USING ERRCODE = 'LUI02';
  END IF;

  INSERT INTO users (email, password_hash, nome, ragione_sociale, partita_iva,
                     telefono, ruolo, preferred_language, avatar_color, updated_at)
  VALUES (lower(p_email), p_password_hash, p_nome, p_ragione_sociale, p_partita_iva,
          p_telefono, p_ruolo, coalesce(p_preferred_language, 'it'),
          v_palette[floor(random() * array_length(v_palette, 1)) + 1], now())
  RETURNING * INTO v_user;

  PERFORM core.fn_audit_log(p_actor_id, 'user.create', 'users', v_user.id::text,
    jsonb_build_object('email', v_user.email, 'ruolo', v_user.ruolo,
                       'ragione_sociale', v_user.ragione_sociale),
    'OK', p_ip);
  RETURN v_user;
END;
$$;
