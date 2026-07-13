-- ============================================================
-- Ripristino viste b2b_* / vista_integra_* (dblink verso Integra)
-- Generato da introspect del DB di sviluppo. IDEMPOTENTE.
--
-- Uso:
--   psql "<DATABASE_URL>" -v conn="host=192.168.1.41 port=5432 dbname=integra user=postgres password=XXX" -f restore-b2b-views.sql
-- La password NON e' in questo file: si passa con -v conn=...
-- ============================================================
CREATE EXTENSION IF NOT EXISTS dblink;

-- VIEW public.b2b_prodotti
CREATE OR REPLACE VIEW public.b2b_prodotti AS
 SELECT azi_cdazi,
    pro_id,
    pro_cod,
    pro_descr,
    cod_gruppo_merceologico,
    descr_gruppo_merceologico,
    cod_gruppo_statistico,
    descr_gruppo_statistico,
    cod_clv_tipoarticolo,
    descr_clv_tipoarticolo,
    codice_alternativo,
    codice_esterno,
    incluso_b2b,
    ubicazione,
    cod_famiglia,
    descr_famiglia,
    cod_linea,
    descr_linea,
    cod_diametro_esterno,
    descr_diametro_esterno,
    cod_altezza,
    descr_altezza,
    prodotto_obsoleto,
    data_inserimento,
    data_ultmod
   FROM dblink(:'conn'::text, '
    SELECT
      t0.azi_cdazi, t0.pro_id, t0.pro_cod, t0.pro_descr,
      t0.pro_clvcod01 AS cod_gruppo_merceologico, c1.clv_descr AS descr_gruppo_merceologico,
      t0.pro_clvcod02 AS cod_gruppo_statistico, c2.clv_descr AS descr_gruppo_statistico,
      t0.pro_clvcod03 AS cod_clv_tipoarticolo, c3.clv_descr AS descr_clv_tipoarticolo,
      t0.pro_cod1 AS codice_alternativo, t0.pro_cod2 AS codice_esterno,
      t4.ele_valoreb AS incluso_b2b,
      COALESCE(t5.ele_valorec, '''') AS ubicazione,
      COALESCE(t6.ele_valorec, '''') AS cod_famiglia, COALESCE(t6.clv_descr, '''') AS descr_famiglia,
      COALESCE(t7.ele_valorec, '''') AS cod_linea, COALESCE(t7.clv_descr, '''') AS descr_linea,
      COALESCE(t8.ele_valorec, '''') AS cod_diametro_esterno, COALESCE(t8.clv_descr, '''') AS descr_diametro_esterno,
      COALESCE(t9.ele_valorec, '''') AS cod_altezza, COALESCE(t9.clv_descr, '''') AS descr_altezza,
      t0.pro_obsoleto AS prodotto_obsoleto,
      to_timestamp(extract(epoch from t0.pro_dtins) + t0.pro_orains * 3600 + t0.pro_minins * 60) AS data_inserimento,
      to_timestamp(extract(epoch from t0.pro_dtvar) + t0.pro_oravar * 3600 + t0.pro_minvar * 60) AS data_ultmod
    FROM prodotti t0
      LEFT JOIN classivoci c1 ON t0.azi_cdazi = c1.azi_cdazi AND t0.pro_cldcod01 = c1.cld_cod AND t0.pro_clvcod01 = c1.clv_cod
      LEFT JOIN classivoci c2 ON t0.azi_cdazi = c2.azi_cdazi AND t0.pro_cldcod02 = c2.cld_cod AND t0.pro_clvcod02 = c2.clv_cod
      LEFT JOIN classivoci c3 ON t0.azi_cdazi = c3.azi_cdazi AND t0.pro_cldcod03 = c3.cld_cod AND t0.pro_clvcod03 = c3.clv_cod
      LEFT JOIN (SELECT azi_cdazi, ele_valoreb, ele_key1p FROM entleg WHERE ele_tipkeyp = ''ART'' AND ele_tipkeys = ''EFU'' AND ele_key1s = ''WEB'') t4 ON t0.azi_cdazi = t4.azi_cdazi AND btrim(t4.ele_key1p)::integer = t0.pro_id
      LEFT JOIN (SELECT azi_cdazi, ele_valorec, ele_key1p FROM entleg WHERE ele_tipkeyp = ''ART'' AND ele_tipkeys = ''EFU'' AND ele_key1s = ''UBICA'') t5 ON t0.azi_cdazi = t5.azi_cdazi AND btrim(t5.ele_key1p)::integer = t0.pro_id
      LEFT JOIN (SELECT e.azi_cdazi, e.ele_valorec, e.ele_key1p, cv.clv_descr FROM entleg e JOIN classivoci cv ON e.azi_cdazi = cv.azi_cdazi AND cv.cld_cod = ''FAM'' AND e.ele_valorec = cv.clv_cod WHERE e.ele_tipkeyp = ''ART'' AND e.ele_tipkeys = ''EFU'' AND e.ele_key1s = ''FAM'') t6 ON t0.azi_cdazi = t6.azi_cdazi AND btrim(t6.ele_key1p)::integer = t0.pro_id
      LEFT JOIN (SELECT e.azi_cdazi, e.ele_valorec, e.ele_key1p, cv.clv_descr FROM entleg e JOIN classivoci cv ON e.azi_cdazi = cv.azi_cdazi AND cv.cld_cod = ''LIN'' AND e.ele_valorec = cv.clv_cod WHERE e.ele_tipkeyp = ''ART'' AND e.ele_tipkeys = ''EFU'' AND e.ele_key1s = ''LIN'') t7 ON t0.azi_cdazi = t7.azi_cdazi AND btrim(t7.ele_key1p)::integer = t0.pro_id
      LEFT JOIN (SELECT e.azi_cdazi, e.ele_valorec, e.ele_key1p, cv.clv_descr FROM entleg e JOIN classivoci cv ON e.azi_cdazi = cv.azi_cdazi AND cv.cld_cod = ''DIE'' AND e.ele_valorec = cv.clv_cod WHERE e.ele_tipkeyp = ''ART'' AND e.ele_tipkeys = ''EFU'' AND e.ele_key1s = ''DIE'') t8 ON t0.azi_cdazi = t8.azi_cdazi AND btrim(t8.ele_key1p)::integer = t0.pro_id
      LEFT JOIN (SELECT e.azi_cdazi, e.ele_valorec, e.ele_key1p, cv.clv_descr FROM entleg e JOIN classivoci cv ON e.azi_cdazi = cv.azi_cdazi AND cv.cld_cod = ''H'' AND e.ele_valorec = cv.clv_cod WHERE e.ele_tipkeyp = ''ART'' AND e.ele_tipkeys = ''EFU'' AND e.ele_key1s = ''H'') t9 ON t0.azi_cdazi = t9.azi_cdazi AND btrim(t9.ele_key1p)::integer = t0.pro_id
    WHERE t0.pro_id > 0 AND t0.azi_cdazi = ''001''
  '::text) t(azi_cdazi character varying(3), pro_id integer, pro_cod character varying(30), pro_descr character varying(240), cod_gruppo_merceologico character varying(6), descr_gruppo_merceologico character varying(40), cod_gruppo_statistico character varying(6), descr_gruppo_statistico character varying(40), cod_clv_tipoarticolo character varying(6), descr_clv_tipoarticolo character varying(40), codice_alternativo character varying(30), codice_esterno character varying(30), incluso_b2b boolean, ubicazione text, cod_famiglia text, descr_famiglia character varying(40), cod_linea text, descr_linea character varying(40), cod_diametro_esterno text, descr_diametro_esterno character varying(40), cod_altezza text, descr_altezza character varying(40), prodotto_obsoleto smallint, data_inserimento timestamp with time zone, data_ultmod timestamp with time zone);

-- VIEW public.b2b_clienti
CREATE OR REPLACE VIEW public.b2b_clienti AS
 SELECT id_cliente,
    codice_cliente,
    ragione_sociale,
    ragione_sociale_2,
    cognome,
    nome,
    forma_giuridica,
    indirizzo,
    indirizzo_2,
    cap,
    citta,
    provincia,
    telefono,
    fax,
    email,
    web,
    pec,
    partita_iva,
    codice_fiscale,
    regione,
    stato,
    codice_pagamento,
    codice_listino,
    codice_conto,
    codice_porto,
    codice_vettore,
    codice_spedizione,
    codice_valuta,
    codice_iva,
    codice_zona,
    codice_agente,
    tipo_fatturazione,
    importo_minimo_fattura,
    fido_totale,
    fido_concessione,
    fido_scadenze,
    iban,
    swift_bic,
    bic,
    abi,
    cab,
    fatturazione_elettronica,
    cli_obsoleto,
    data_inserimento,
    data_modifica
   FROM dblink(:'conn'::text, 'SELECT c.cli_cdcli, c.cli_cdclistr, c.cli_rgsoc, c.cli_rgsoc2, c.cli_cognome, c.cli_nome, c.cli_persgiur, c.cli_indir, c.cli_indir2, c.cli_cap, c.cli_citta, c.cli_prov, c.cli_tel, c.cli_fax, c.cli_email, c.cli_web, c.cli_pecdest, c.cli_piva, c.cli_cfisc, c.cli_regcod, c.cli_stacod, ca.cla_pagcod, ca.cla_tlscod, ca.cla_caccod, ca.cla_porcod, ca.cla_vetcod1, ca.cla_specod, ca.cla_valcod, ca.cla_ivacod, ca.cla_zoncod, ca.cla_agecod, ca.cla_tipofatt, ca.cla_minfat, ca.cla_fidotot, ca.cla_fidocont, ca.cla_fidoscad, ca.cla_iban, ca.cla_swift, ca.cla_bic, ca.cla_abicod, ca.cla_cabcod, ca.cla_fatturaele, c.cli_obsoleto, to_timestamp(extract(epoch from c.cli_dtins) + c.cli_orains * 3600 + c.cli_minins * 60) AS data_inserimento, to_timestamp(extract(epoch from c.cli_dtvar) + c.cli_oravar * 3600 + c.cli_minvar * 60) AS data_modifica FROM clienti c LEFT JOIN cliazi ca ON ca.azi_cdazi = ''001'' AND ca.cla_tipo = ''C'' AND ca.cla_clicdcli = c.cli_cdcli AND ca.cla_obsoleto = 0 WHERE c.cli_obsoleto = 0 AND c.cli_cdcli > 0'::text) t(id_cliente integer, codice_cliente character varying(20), ragione_sociale character varying(80), ragione_sociale_2 character varying(80), cognome character varying(40), nome character varying(40), forma_giuridica character varying(3), indirizzo character varying(60), indirizzo_2 character varying(60), cap character varying(15), citta character varying(40), provincia character varying(2), telefono character varying(30), fax character varying(30), email character varying(100), web character varying(50), pec character varying(100), partita_iva character varying(20), codice_fiscale character varying(20), regione character varying(3), stato character varying(3), codice_pagamento character varying(6), codice_listino character varying(6), codice_conto character varying(6), codice_porto character varying(6), codice_vettore character varying(6), codice_spedizione character varying(6), codice_valuta character varying(6), codice_iva character varying(6), codice_zona character varying(6), codice_agente character varying(6), tipo_fatturazione character varying(3), importo_minimo_fattura numeric, fido_totale numeric, fido_concessione numeric, fido_scadenze numeric, iban character varying(30), swift_bic character varying(11), bic character varying(20), abi character varying(5), cab character varying(5), fatturazione_elettronica character varying(1), cli_obsoleto smallint, data_inserimento timestamp with time zone, data_modifica timestamp with time zone);

-- VIEW public.b2b_indirizzi_clienti
CREATE OR REPLACE VIEW public.b2b_indirizzi_clienti AS
 SELECT id_destinazione,
    id_cliente,
    codice_cliente,
    ragione_sociale,
    codice_tipo_destinazione,
    indirizzo,
    indirizzo_2,
    cap,
    citta,
    provincia,
    flag_abituale,
    flag_spedizione,
    km,
    ordinamento,
    codice_zona,
    codice_agente,
    giorni_preparazione,
    layout_linea,
    codice_vettore,
    codice_porto,
    referente,
    telefono_referente,
    stato_destinazione,
    data_inserimento,
    data_modifica
   FROM dblink(:'conn'::text, 'SELECT d.dst_id, d.dst_clicdcli, c.cli_cdclistr, c.cli_rgsoc, d.dst_dsfcod, c.cli_indir, c.cli_indir2, c.cli_cap, c.cli_citta, c.cli_prov, d.dst_abituale, d.dst_spedizione, d.dst_km, d.dst_ordinamento, d.dst_zoncod, d.dst_agecod, d.dst_ggprep, d.dst_linlayout, d.dst_vetcod, d.dst_porcod, d.dst_fteriftesto, d.dst_fterifnumero, d.dst_obsoleto, to_timestamp(extract(epoch from d.dst_dtins) + d.dst_orains * 3600 + d.dst_minins * 60) AS data_inserimento, to_timestamp(extract(epoch from d.dst_dtvar) + d.dst_oravar * 3600 + d.dst_minvar * 60) AS data_modifica FROM destinazioni d JOIN clienti c ON c.cli_cdcli = d.dst_clicdcli AND c.cli_obsoleto = 0 WHERE d.dst_obsoleto = 0 AND d.dst_clicdcli > 0'::text) t(id_destinazione integer, id_cliente integer, codice_cliente character varying(20), ragione_sociale character varying(80), codice_tipo_destinazione character varying(6), indirizzo character varying(60), indirizzo_2 character varying(60), cap character varying(15), citta character varying(40), provincia character varying(2), flag_abituale character(1), flag_spedizione character(1), km integer, ordinamento integer, codice_zona character varying(6), codice_agente character varying(6), giorni_preparazione integer, layout_linea character varying(6), codice_vettore character varying(6), codice_porto character varying(6), referente character varying(60), telefono_referente numeric, stato_destinazione smallint, data_inserimento timestamp with time zone, data_modifica timestamp with time zone);

-- VIEW public.b2b_pagamenti_clienti
CREATE OR REPLACE VIEW public.b2b_pagamenti_clienti AS
 SELECT id_cliente,
    codice_cliente,
    ragione_sociale,
    codice_pagamento,
    iban,
    swift_bic,
    bic,
    abi,
    cab,
    codice_conto_corrente,
    mandato_sdd,
    data_mandato,
    schema_sdd,
    id_credenziale,
    fido_totale,
    fido_concessione,
    fido_scadenze,
    fido_ordini,
    fido_gg_tolleranza,
    gg_fine_mese,
    gg_esclusi,
    posticipazione_consegna,
    descrizione_pagamento,
    tipo_fatturazione,
    importo_minimo_fattura,
    codice_valuta,
    obsoleto
   FROM dblink(:'conn'::text, 'SELECT ca.cla_clicdcli, c.cli_cdclistr, c.cli_rgsoc, ca.cla_pagcod, ca.cla_iban, ca.cla_swift, ca.cla_bic, ca.cla_abicod, ca.cla_cabcod, ca.cla_caccod, ca.cla_mandato, ca.cla_dtmandato, ca.cla_schemasdd, ca.cla_credid,       ca.cla_fidotot, ca.cla_fidocont, ca.cla_fidoscad, ca.cla_fidoordini, ca.cla_fidoggtoll, ca.cla_ggfinemese, ca.cla_ggesclusi, ca.cla_postcons, ca.cla_dscpagam, ca.cla_tipofatt, ca.cla_minfat, ca.cla_valcod, ca.cla_obsoleto FROM cliazi ca JOIN clienti c ON c.cli_cdcli = ca.cla_clicdcli AND c.cli_obsoleto = 0 WHERE ca.azi_cdazi = ''001'' AND ca.cla_tipo = ''C'' AND ca.cla_obsoleto = 0 AND ca.cla_clicdcli > 0'::text) t(id_cliente integer, codice_cliente character varying(20), ragione_sociale character varying(80), codice_pagamento character varying(6), iban character varying(30), swift_bic character varying(11), bic character varying(20), abi character varying(5), cab character varying(5), codice_conto_corrente character varying(6), mandato_sdd character varying(40), data_mandato date, schema_sdd character(1), id_credenziale character varying(23), fido_totale numeric, fido_concessione numeric, fido_scadenze numeric, fido_ordini numeric, fido_gg_tolleranza smallint, gg_fine_mese smallint, gg_esclusi smallint, posticipazione_consegna smallint, descrizione_pagamento character varying(80), tipo_fatturazione character varying(3), importo_minimo_fattura numeric, codice_valuta character varying(6), obsoleto smallint);

-- VIEW public.b2b_ordini_clienti
CREATE OR REPLACE VIEW public.b2b_ordini_clienti AS
 SELECT id_ordine,
    numero_ordine,
    numero_progressivo,
    anno_ordine,
    serie,
    id_cliente,
    codice_cliente,
    ragione_sociale,
    data_ordine,
    data_registrazione,
    data_valuta,
    data_competenza,
    data_trasporto,
    importo_imponibile,
    importo_iva,
    base_imponibile,
    sconto_1,
    sconto_2,
    sconto_3,
    sconto_4,
    sconto_finale,
    codice_pagamento,
    codice_porto,
    codice_vettore,
    codice_spedizione,
    codice_valuta,
    riferimento_ordine_cliente,
    data_riferimento_ordine,
    id_destinazione_merce,
    id_destinazione_fattura,
    id_destinazione_committente,
    stato_saldo,
    flag_fatturato,
    flag_contabilizzato,
    stato_verifica,
    flag_obsoleto,
    note_ordine,
    utente_inserimento,
    data_inserimento,
    data_modifica
   FROM dblink(:'conn'::text, 'SELECT t.mvt_id, t.mvt_num, t.mvt_numnum, t.mvt_anno, t.mvt_mvnserie, t.mvt_clacod, c.cli_cdclistr, c.cli_rgsoc, t.mvt_dtmov, t.mvt_dtreg, t.mvt_dtval, t.mvt_dtcomp, t.mvt_dttrasp, t.mvt_impon, t.mvt_impiva, t.mvt_baseimpo, t.mvt_sc1, t.mvt_sc2, t.mvt_sc3, t.mvt_sc4, t.mvt_scontofin, t.mvt_pagcod, t.mvt_porcod, t.mvt_vetcod1, t.mvt_specod, t.mvt_valcod, t.mvt_numordpa, t.mvt_dtordpa, t.mvt_dstid1, t.mvt_dstid2, t.mvt_dstid3, t.mvt_saldato, t.mvt_fatturato, t.mvt_contab, t.mvt_check, t.mvt_obsoleto, t.mvt_liberoc5, t.mvt_userin, to_timestamp(extract(epoch from t.mvt_dtins) + t.mvt_orains * 3600 + t.mvt_minins * 60) AS data_inserimento, to_timestamp(extract(epoch from t.mvt_dtvar) + t.mvt_oravar * 3600 + t.mvt_minvar * 60) AS data_modifica FROM movtest t LEFT JOIN clienti c ON c.cli_cdcli = t.mvt_clacod WHERE t.azi_cdazi = ''001'' AND t.mvt_natmov = ''ORD'' AND t.mvt_obsoleto = 0 AND t.mvt_clacod > 0'::text) t(id_ordine integer, numero_ordine character varying(20), numero_progressivo bigint, anno_ordine smallint, serie character varying(3), id_cliente integer, codice_cliente character varying(20), ragione_sociale character varying(80), data_ordine date, data_registrazione date, data_valuta date, data_competenza date, data_trasporto date, importo_imponibile numeric, importo_iva numeric, base_imponibile numeric, sconto_1 numeric, sconto_2 numeric, sconto_3 numeric, sconto_4 numeric, sconto_finale numeric, codice_pagamento character varying(6), codice_porto character varying(6), codice_vettore character varying(6), codice_spedizione character varying(6), codice_valuta character varying(6), riferimento_ordine_cliente character varying(20), data_riferimento_ordine date, id_destinazione_merce integer, id_destinazione_fattura integer, id_destinazione_committente integer, stato_saldo character(1), flag_fatturato character(1), flag_contabilizzato character(1), stato_verifica character varying(3), flag_obsoleto smallint, note_ordine character varying(100), utente_inserimento character varying(10), data_inserimento timestamp with time zone, data_modifica timestamp with time zone);

-- VIEW public.b2b_righe_ordini
CREATE OR REPLACE VIEW public.b2b_righe_ordini AS
 SELECT id_ordine,
    numero_ordine,
    data_ordine,
    id_cliente,
    id_riga,
    ordine_riga,
    id_prodotto,
    codice_prodotto,
    descrizione_riga,
    descrizione_prodotto,
    quantita,
    unita_misura,
    prezzo_listino,
    prezzo_netto,
    prezzo_ivato,
    importo,
    sconto_1,
    sconto_2,
    sconto_3,
    sconto_4,
    valore_sconto,
    stato_saldo,
    stato_fatturazione,
    quantita_fatturata,
    importo_fatturato,
    note_riga
   FROM dblink(:'conn'::text, 'SELECT r.mvr_mvtid, t.mvt_num, t.mvt_dtmov, t.mvt_clacod, r.mvr_id, r.mvr_ordinamento, r.mvr_proid, p.pro_cod, r.mvr_descr, p.pro_descr, r.mvr_qta, r.mvr_umicod, r.mvr_prezzo, r.mvr_prznetto, r.mvr_przivato, r.mvr_importo, r.mvr_sconto1, r.mvr_sconto2, r.mvr_sconto3, r.mvr_sconto4, r.mvr_scontoval, r.mvr_flgsaldo, r.mvr_flgfat, r.mvr_qtafat, r.mvr_impfatt, r.mvr_liberoc1 FROM movrig r JOIN movtest t ON t.mvt_id = r.mvr_mvtid AND t.azi_cdazi = r.azi_cdazi AND t.mvt_obsoleto = 0 AND t.mvt_natmov = ''ORD'' LEFT JOIN prodotti p ON p.pro_id = r.mvr_proid AND p.azi_cdazi = r.azi_cdazi WHERE r.azi_cdazi = ''001'' AND r.mvr_obsoleto = 0'::text) t(id_ordine integer, numero_ordine character varying(20), data_ordine date, id_cliente integer, id_riga integer, ordine_riga integer, id_prodotto integer, codice_prodotto character varying(30), descrizione_riga character varying(240), descrizione_prodotto character varying(240), quantita numeric, unita_misura character(8), prezzo_listino numeric, prezzo_netto numeric, prezzo_ivato numeric, importo numeric, sconto_1 numeric, sconto_2 numeric, sconto_3 numeric, sconto_4 numeric, valore_sconto numeric, stato_saldo character(1), stato_fatturazione character varying(1), quantita_fatturata numeric, importo_fatturato numeric, note_riga character varying(100));

-- VIEW public.b2b_listini_testata
CREATE OR REPLACE VIEW public.b2b_listini_testata AS
 SELECT codice_listino,
    descrizione_listino,
    tipo_listino,
    listino_con_iva,
    codice_valuta,
    n_decimali,
    prezzi_netto,
    listino_obsoleto,
    data_inserimento,
    data_modifica
   FROM dblink(:'conn'::text, 'SELECT t.tls_cod, t.tls_descr, t.tls_tipo, t.tls_flgiva, t.tls_valcod, t.tls_ndec, t.tls_flgnetto, t.tls_obsoleto, to_timestamp(extract(epoch from t.tls_dtins) + t.tls_orains * 3600 + t.tls_minins * 60) AS dtins, to_timestamp(extract(epoch from t.tls_dtvar) + t.tls_oravar * 3600 + t.tls_minvar * 60) AS dtvar FROM listest t WHERE t.azi_cdazi = ''001'''::text) t(codice_listino character varying(6), descrizione_listino character varying(40), tipo_listino character varying(3), listino_con_iva smallint, codice_valuta character varying(6), n_decimali smallint, prezzi_netto smallint, listino_obsoleto smallint, data_inserimento timestamp with time zone, data_modifica timestamp with time zone);

-- VIEW public.b2b_listini_righe
CREATE OR REPLACE VIEW public.b2b_listini_righe AS
 SELECT id_riga_listino,
    codice_listino,
    id_prodotto,
    codice_prodotto,
    descrizione_prodotto,
    id_variante,
    prezzo_listino,
    sconto_1,
    sconto_2,
    sconto_3,
    sconto_4,
    codice_iva,
    quantita_da,
    quantita_a,
    scala,
    data_inizio_validita,
    data_fine_validita,
    tipo_cliente,
    id_cliente,
    listino_obsoleto,
    data_inserimento,
    data_modifica
   FROM dblink(:'conn'::text, 'SELECT r.lst_id, r.lst_tlscod, r.lst_proid, p.pro_cod, p.pro_descr, r.lst_varid, r.lst_prezzo, r.lst_sconto1, r.lst_sconto2, r.lst_sconto3, r.lst_sconto4, r.lst_ivacod, r.lst_qtada, r.lst_aqta, r.lst_scala, r.lst_dtinizio, r.lst_dtfine, r.lst_clatipo, r.lst_clacod, r.lst_obsoleto, to_timestamp(extract(epoch from r.lst_dtins) + r.lst_orains * 3600 + r.lst_minins * 60) AS dtins, to_timestamp(extract(epoch from r.lst_dtvar) + r.lst_oravar * 3600 + r.lst_minvar * 60) AS dtvar FROM listini r LEFT JOIN prodotti p ON p.azi_cdazi = r.azi_cdazi AND p.pro_id = r.lst_proid WHERE r.azi_cdazi = ''001'' AND r.lst_obsoleto = 0 AND r.lst_progr = 1'::text) t(id_riga_listino integer, codice_listino character varying(6), id_prodotto integer, codice_prodotto character varying(30), descrizione_prodotto character varying(240), id_variante integer, prezzo_listino numeric, sconto_1 numeric, sconto_2 numeric, sconto_3 numeric, sconto_4 numeric, codice_iva character varying(6), quantita_da numeric, quantita_a numeric, scala integer, data_inizio_validita date, data_fine_validita date, tipo_cliente character varying(1), id_cliente integer, listino_obsoleto smallint, data_inserimento timestamp with time zone, data_modifica timestamp with time zone);

-- VIEW public.b2b_tabpag
CREATE OR REPLACE VIEW public.b2b_tabpag AS
 SELECT codice_pagamento,
    descrizione_pagamento,
    tipo_scadenza,
    tipo_iva,
    sconto_cassa,
    gg_fine_mese,
    gg_esclusi,
    pa_mod_pagamento,
    pa_pagamento,
    obsoleto,
    data_inserimento,
    data_modifica
   FROM dblink(:'conn'::text, 'SELECT t.pag_cod, t.pag_descr, t.pag_tiposcad, t.pag_tipoiva, t.pag_scontocassa, t.pag_ggfinemese, t.pag_ggesclusi, t.pag_pamodpag, t.pag_papagamento, t.pag_obsoleto, to_timestamp(extract(epoch from t.pag_dtins) + t.pag_orains * 3600 + t.pag_minins * 60) AS dtins, to_timestamp(extract(epoch from t.pag_dtvar) + t.pag_oravar * 3600 + t.pag_minvar * 60) AS dtvar FROM tabpag t WHERE t.azi_cdazi = ''001'''::text) t(codice_pagamento character varying(6), descrizione_pagamento character varying(80), tipo_scadenza smallint, tipo_iva smallint, sconto_cassa numeric, gg_fine_mese smallint, gg_esclusi smallint, pa_mod_pagamento character varying(4), pa_pagamento character varying(4), obsoleto smallint, data_inserimento timestamp with time zone, data_modifica timestamp with time zone);

-- VIEW public.b2b_tabpor
CREATE OR REPLACE VIEW public.b2b_tabpor AS
 SELECT codice_porto,
    descrizione_porto,
    obsoleto,
    data_inserimento,
    data_modifica
   FROM dblink(:'conn'::text, 'SELECT t.por_cod, t.por_descr, t.por_obsoleto, to_timestamp(extract(epoch from t.por_dtins) + t.por_orains * 3600 + t.por_minins * 60) AS dtins, to_timestamp(extract(epoch from t.por_dtvar) + t.por_oravar * 3600 + t.por_minvar * 60) AS dtvar FROM tabpor t WHERE t.azi_cdazi = ''001'''::text) t(codice_porto character varying(6), descrizione_porto character varying(80), obsoleto smallint, data_inserimento timestamp with time zone, data_modifica timestamp with time zone);

-- VIEW public.b2b_tabspe
CREATE OR REPLACE VIEW public.b2b_tabspe AS
 SELECT codice_spedizione,
    descrizione_spedizione,
    obsoleto,
    data_inserimento,
    data_modifica
   FROM dblink(:'conn'::text, 'SELECT t.spe_cod, t.spe_descr, t.spe_obsoleto, to_timestamp(extract(epoch from t.spe_dtins) + t.spe_orains * 3600 + t.spe_minins * 60) AS dtins, to_timestamp(extract(epoch from t.spe_dtvar) + t.spe_oravar * 3600 + t.spe_minvar * 60) AS dtvar FROM tabspe t WHERE t.azi_cdazi = ''001'''::text) t(codice_spedizione character varying(6), descrizione_spedizione character varying(80), obsoleto smallint, data_inserimento timestamp with time zone, data_modifica timestamp with time zone);

-- VIEW public.b2b_vettori
CREATE OR REPLACE VIEW public.b2b_vettori AS
 SELECT codice_vettore,
    id_cliente,
    descrizione_vettore,
    autorizzazione,
    obsoleto,
    data_inserimento,
    data_modifica
   FROM dblink(:'conn'::text, 'SELECT v.vet_cod, v.vet_clicdcli, c.cli_rgsoc, v.vet_autorizzazione, v.vet_obsoleto, to_timestamp(extract(epoch from v.vet_dtins) + v.vet_orains * 3600 + v.vet_minins * 60) AS dtins, to_timestamp(extract(epoch from v.vet_dtvar) + v.vet_oravar * 3600 + v.vet_minvar * 60) AS dtvar FROM vettori v LEFT JOIN clienti c ON c.cli_cdcli = v.vet_clicdcli AND c.cli_obsoleto = 0 WHERE v.azi_cdazi = ''001'''::text) t(codice_vettore character varying(6), id_cliente integer, descrizione_vettore character varying(80), autorizzazione character varying(40), obsoleto smallint, data_inserimento timestamp with time zone, data_modifica timestamp with time zone);

-- VIEW public.b2b_giacenze
CREATE OR REPLACE VIEW public.b2b_giacenze AS
 SELECT id_prodotto,
    codice_prodotto,
    giacenza,
    data_inventario
   FROM dblink(:'conn'::text, '
    SELECT mi.mai_proid, p.pro_cod, SUM(mi.mai_esistenza) AS giacenza,
           MAX(mt.mah_data) AS data_inventario
    FROM maginv mi
      LEFT JOIN prodotti p ON p.azi_cdazi = mi.azi_cdazi AND p.pro_id = mi.mai_proid
      JOIN maginvt mt ON mt.azi_cdazi = mi.azi_cdazi AND mt.mah_id = mi.mai_mahid
    WHERE mi.azi_cdazi = ''001'' AND mi.mai_obsoleto = 0
      AND mi.mai_mahid = (SELECT MAX(mah_id) FROM maginvt WHERE azi_cdazi = ''001'' AND mah_obsoleto = 0)
    GROUP BY mi.mai_proid, p.pro_cod
  '::text) t(id_prodotto integer, codice_prodotto character varying(30), giacenza numeric, data_inventario date);

-- VIEW public.vista_integra_prodotti
CREATE OR REPLACE VIEW public.vista_integra_prodotti AS
 SELECT pro_cod,
    pro_descr,
    pro_moddescr,
    pro_cldcod01,
    pro_clddescr01,
    pro_clvcod01,
    pro_cldcod02,
    pro_clddescr02,
    pro_clvcod02,
    pro_cldcod03,
    pro_clddescr03,
    pro_clvcod03,
    pro_funzionalita1,
    pro_proidfam AS pro_famiglia_id
   FROM integrazioni_raw
  WHERE pro_tipo = '01'::text;

-- VIEW public.vista_integra_famiglie
CREATE OR REPLACE VIEW public.vista_integra_famiglie AS
 SELECT DISTINCT l.pro_proidfam AS fam_id,
    f.pro_cod AS fam_codice,
    f.pro_descr AS fam_descrizione,
    NULL::integer AS fam_parent_id
   FROM integrazioni_raw l
     CROSS JOIN ( SELECT integrazioni_raw.pro_cod,
            integrazioni_raw.pro_descr
           FROM integrazioni_raw
          WHERE integrazioni_raw.pro_cod ~~ 'FAM\_%'::text
         LIMIT 1) f
  WHERE l.pro_cod ~~ 'linea\_%'::text;

-- VIEW public.vista_integra_linee
CREATE OR REPLACE VIEW public.vista_integra_linee AS
 SELECT m.lin_id,
    r.pro_cod AS lin_codice,
    r.pro_descr AS lin_descrizione,
    r.pro_proidfam AS lin_famiglia_id
   FROM integrazioni_raw r
     LEFT JOIN integrazioni_linee_map m ON m.lin_cod = r.pro_cod
  WHERE r.pro_cod ~~ 'linea\_%'::text;

