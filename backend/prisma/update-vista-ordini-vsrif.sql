-- Aggiorna SOLO la vista b2b_ordini_clienti: espone il "vostro riferimento"
-- (mvt_vsrif), che l'import Excel degli ordini valorizza col numero ordine B2B.
-- Senza questa colonna il documento che torna da Integra non e' ricollegabile
-- all'ordine che l'ha generato e verrebbe reimportato come ordine nuovo.
--
-- NB: mvt_vsrif e mvt_numordpa sono due colonne DISTINTE di movtest: la vista
-- esponeva solo la seconda. Qui ci sono entrambe.
--
-- La vista sta sul Postgres del B2B e legge le foreign table integra.* via
-- postgres_fdw: su Integra non viene toccato nulla, e' in sola lettura.
--
-- Uso (dalla cartella backend):
--   npx prisma db execute --file prisma/update-vista-ordini-vsrif.sql
--
-- Dopo: lanciare un sync ordini completo, perche' la colonna arriva nella copia
-- locale integra_ordini solo da li'. Rilanciabile quante volte si vuole.
--
-- Estratto da restore-b2b-views.sql (che ricrea TUTTE le viste b2b_*).

DROP VIEW IF EXISTS public.b2b_ordini_clienti;
CREATE VIEW public.b2b_ordini_clienti AS
SELECT t.mvt_id AS id_ordine,
    t.mvt_num AS numero_ordine,
    t.mvt_numnum AS numero_progressivo,
    t.mvt_anno AS anno_ordine,
    t.mvt_mvnserie AS serie,
    t.mvt_clacod AS id_cliente,
    c.cli_cdclistr AS codice_cliente,
    c.cli_rgsoc AS ragione_sociale,
    t.mvt_dtmov AS data_ordine,
    t.mvt_dtreg AS data_registrazione,
    t.mvt_dtval AS data_valuta,
    t.mvt_dtcomp AS data_competenza,
    t.mvt_dttrasp AS data_trasporto,
    t.mvt_impon AS importo_imponibile,
    t.mvt_impiva AS importo_iva,
    t.mvt_baseimpo AS base_imponibile,
    t.mvt_sc1 AS sconto_1,
    t.mvt_sc2 AS sconto_2,
    t.mvt_sc3 AS sconto_3,
    t.mvt_sc4 AS sconto_4,
    t.mvt_scontofin AS sconto_finale,
    t.mvt_pagcod AS codice_pagamento,
    t.mvt_porcod AS codice_porto,
    t.mvt_vetcod1 AS codice_vettore,
    t.mvt_specod AS codice_spedizione,
    t.mvt_valcod AS codice_valuta,
    t.mvt_numordpa AS riferimento_ordine_cliente,
    t.mvt_dtordpa AS data_riferimento_ordine,
    -- "Vostro riferimento": e' la colonna che l'import Excel valorizza (mvt_vsrif del
    -- tracciato) e con cui riagganciamo il documento all'ordine B2B che l'ha generato.
    -- NB: mvt_vsrif e mvt_numordpa sono due colonne distinte di movtest.
    t.mvt_vsrif AS riferimento_b2b,
    t.mvt_dtvsrif AS data_riferimento_b2b,
    t.mvt_dstid1 AS id_destinazione_merce,
    t.mvt_dstid2 AS id_destinazione_fattura,
    t.mvt_dstid3 AS id_destinazione_committente,
    t.mvt_saldato AS stato_saldo,
    t.mvt_fatturato AS flag_fatturato,
    t.mvt_contab AS flag_contabilizzato,
    t.mvt_check AS stato_verifica,
    t.mvt_obsoleto AS flag_obsoleto,
    t.mvt_liberoc5 AS note_ordine,
    t.mvt_userin AS utente_inserimento,
    to_timestamp(extract(epoch from t.mvt_dtins) + t.mvt_orains * 3600 + t.mvt_minins * 60) AS data_inserimento,
    to_timestamp(extract(epoch from t.mvt_dtvar) + t.mvt_oravar * 3600 + t.mvt_minvar * 60) AS data_modifica
 FROM integra.movtest t
    LEFT JOIN integra.clienti c ON c.cli_cdcli = t.mvt_clacod
 WHERE t.azi_cdazi = '001' AND t.mvt_natmov = 'ORD' AND t.mvt_obsoleto = 0 AND t.mvt_clacod > 0;
