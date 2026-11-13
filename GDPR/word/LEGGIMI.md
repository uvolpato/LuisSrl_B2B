# Versioni Word

Questa cartella contiene le versioni `.docx` dei documenti GDPR, generate dal sorgente
Markdown nella cartella superiore.

- **Carta intestata**: `CARTA-INTESTATA-LUIS.docx` — modello con logo, dati societari e
  numerazione pagine. Duplicarlo e sostituire il testo.
- Ogni `.docx` ha la stessa intestazione, il piè di pagina con la paginazione e lo stile
  comune (Georgia per i titoli, Arial per il testo, tabelle con riga di intestazione).
- Le tabelle con 7 o più colonne vengono impaginate in orizzontale.

## Rigenerare i documenti

```bash
cd GDPR/word
npm install docx
node genera-docx.cjs
```

Il generatore legge tutti i `.md` presenti in `GDPR/` e riscrive i `.docx` qui.
`node_modules/` è escluso dal repository.

> I file Word sono la copia di lavoro dei documenti: la fonte di verità resta il Markdown.
> Se modifichi un documento, aggiorna il `.md` e rigenera.
