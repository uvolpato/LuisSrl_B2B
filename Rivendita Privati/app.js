/* ==========================================================================
   Luis Casa — storefront B2C · dati, carrello e rendering condivisi
   ========================================================================== */
(function () {
  'use strict';

  var IMG = 'img/';
  var STORE = 'luis_casa_carrello';

  /* ── Catalogo prodotti (dati dimostrativi B2C) ───────────────────────── */
  var PRODOTTI = [
    { id: 'felix-giallo', nome: 'Vaso Felix in ceramica smaltata giallo sole', cat: 'Vasi da esterno', mat: 'Ceramica', col: 'Giallo', dim: 'Ø 30 × H 45 cm', lt: 11, prezzo: 39.90, listino: 59.90, rating: 4.6, rec: 128, badge: 'top', img: IMG + 'linea_FELIX_GIALLO/linea_FELIX_GIALLO_001.jpg', imgs: [IMG + 'linea_FELIX_GIALLO/linea_FELIX_GIALLO_001.jpg', IMG + 'linea_FELIX_GIALLO/linea_FELIX_GIALLO_002.jpg'] },
    { id: 'kern-verde', nome: 'Fioriera Kern in fiberstone verde muschio', cat: 'Fiberstone', mat: 'Fiberstone', col: 'Verde', dim: '45 × 45 × H 50 cm', lt: 9, prezzo: 89.00, listino: 119.00, rating: 4.8, rec: 41, badge: 'top', img: IMG + 'linea_KERN_VERDE_MEN/linea_KERN_VERDE_MEN_ai_001.jpg' },
    { id: 'leon-bianco', nome: 'Vaso Leon in ceramica bianco opaco', cat: 'Vasi da interno', mat: 'Ceramica', col: 'Bianco', dim: 'Ø 22 × H 40 cm', lt: 12, prezzo: 34.90, listino: 49.90, rating: 4.7, rec: 173, badge: 'top', img: IMG + 'linea_LEON_BIANCO/linea_LEON_BIANCO_001.jpg' },
    { id: 'valdez-crema', nome: 'Vaso Valdez in ceramica crema a rilievo', cat: 'Vasi da esterno', mat: 'Ceramica', col: 'Crema', dim: 'Ø 32 × H 50 cm', lt: 19, prezzo: 64.00, listino: 92.00, rating: 4.7, rec: 111, badge: 'top', img: IMG + 'linea_VALDEZ_CREMA/linea_VALDEZ_CREMA_001.jpg' },
    { id: 'plata-terra', nome: 'Panca portavasi Plata in cotto terra', cat: 'Complementi', mat: 'Cotto', col: 'Marrone', dim: '90 × 30 × H 45 cm', lt: 20, prezzo: 129.00, listino: 169.00, rating: 4.8, rec: 22, badge: 'top', img: IMG + 'linea_PLATA_TERRA/linea_PLATA_TERRA_galleria_001.jpg' },
    { id: 'madison-bianco', nome: 'Fioriera Madison in ceramica bianca a colonna', cat: 'Fioriere', mat: 'Ceramica', col: 'Bianco', dim: 'Ø 34 × H 68 cm', lt: 18, prezzo: 79.00, listino: 109.00, rating: 4.6, rec: 88, img: IMG + 'linea_MADISON_BIANCO/linea_MADISON_BIANCO_ai_001.jpg', imgs: [IMG + 'linea_MADISON_BIANCO/linea_MADISON_BIANCO_ai_001.jpg', IMG + 'linea_MADISON_BIANCO/linea_MADISON_BIANCO_bianco_002.jpg'] },
    { id: 'pecos-bianco', nome: 'Fioriera Pecos in ceramica bianco lucido', cat: 'Fioriere', mat: 'Ceramica', col: 'Bianco', dim: '50 × 26 × H 30 cm', lt: 17, prezzo: 59.00, listino: 84.00, rating: 4.7, rec: 143, img: IMG + 'linea_PECOS_BIANCO/linea_PECOS_BIANCO_001.webp' },
    { id: 'lakota-crema', nome: 'Vaso Lakota in cotto crema artigianale', cat: 'Cotto', mat: 'Cotto', col: 'Crema', dim: 'Ø 26 × H 32 cm', lt: 15, prezzo: 27.50, listino: 39.00, rating: 4.5, rec: 96, img: IMG + 'linea_LAKOTA_CREMA/linea_LAKOTA_CREMA_001.jpg' },
    { id: 'lakota-verde', nome: 'Vaso Lakota in cotto smaltato verde salvia', cat: 'Cotto', mat: 'Cotto', col: 'Verde', dim: 'Ø 26 × H 32 cm', lt: 15, prezzo: 29.90, listino: 42.00, rating: 4.4, rec: 52, img: IMG + 'linea_LAKOTA_VERDE_S/linea_LAKOTA_VERDE_S_001.jpg' },
    { id: 'missouri-ocra', nome: 'Vaso Missouri in cotto ocra naturale', cat: 'Cotto', mat: 'Cotto', col: 'Marrone', dim: 'Ø 44 × H 48 cm', lt: 18, prezzo: 58.00, listino: 82.00, rating: 4.3, rec: 34, img: IMG + 'linea_MISSOURI_OCRA/linea_MISSOURI_OCRA_galleria_001.jpg' },
    { id: 'melrose-marrone', nome: 'Vaso Melrose in cotto marrone bruciato', cat: 'Cotto', mat: 'Cotto', col: 'Marrone', dim: 'Ø 40 × H 38 cm', lt: 16, prezzo: 44.00, listino: 62.00, rating: 4.2, rec: 37, img: IMG + 'linea_MELROSE_MARRON/linea_MELROSE_MARRON_001.jpg' },
    { id: 'ottawa-grigio', nome: 'Vaso Ottawa in cotto grigio cemento', cat: 'Vasi da esterno', mat: 'Cotto', col: 'Grigio', dim: 'Ø 38 × H 42 cm', lt: 13, prezzo: 47.90, listino: 67.00, rating: 4.4, rec: 59, img: IMG + 'linea_OTTAWA_GRIGIO/linea_OTTAWA_GRIGIO_001.jpg' },
    { id: 'lassik-caram', nome: 'Fioriera Lassik in ceramica caramello', cat: 'Fioriere', mat: 'Ceramica', col: 'Marrone', dim: '55 × 28 × H 40 cm', lt: 14, prezzo: 53.00, listino: 75.00, rating: 4.5, rec: 63, img: IMG + 'linea_LASSIK_CARAM/linea_LASSIK_CARAM_001.jpg' },
    { id: 'argo-blu', nome: 'Vaso Argo in ceramica blu notte', cat: 'Vasi da esterno', mat: 'Ceramica', col: 'Blu', dim: 'Ø 36 × H 55 cm', lt: 15, prezzo: 69.00, listino: 98.00, rating: 4.6, rec: 79, img: IMG + 'linea_ARGO_BLU/linea_ARGO_BLU_galleria_001.jpg' },
    { id: 'kern-bianco', nome: 'Fioriera Kern in fiberstone bianco ghiaccio', cat: 'Fiberstone', mat: 'Fiberstone', col: 'Bianco', dim: '45 × 45 × H 50 cm', lt: 9, prezzo: 92.00, listino: 124.00, rating: 4.7, rec: 36, img: IMG + 'linea_KERN_BIANCO/linea_KERN_BIANCO_ai_001.jpg' },
    { id: 'grindeks-verde', nome: 'Fioriera Grindeks in fiberstone verde scuro', cat: 'Fiberstone', mat: 'Fiberstone', col: 'Verde', dim: '40 × 40 × H 45 cm', lt: 12, prezzo: 79.00, listino: 105.00, rating: 4.6, rec: 48, img: IMG + 'linea_GRINDEKS_VERDE/linea_GRINDEKS_VERDE_001.png' },
    { id: 'kai-grigio', nome: 'Fioriera Kai in metallo grigio antracite', cat: 'Metallo', mat: 'Metallo', col: 'Grigio', dim: '60 × 30 × H 35 cm', lt: 14, prezzo: 54.00, listino: 79.00, rating: 4.3, rec: 64, badge: 'new', img: IMG + 'linea_KAI_GRIGIO/linea_KAI_GRIGIO_001.jpg' },
    { id: 'kai-taupe', nome: 'Fioriera Kai in metallo taupe satinato', cat: 'Metallo', mat: 'Metallo', col: 'Grigio', dim: '60 × 30 × H 35 cm', lt: 14, prezzo: 56.00, listino: 82.00, rating: 4.3, rec: 44, img: IMG + 'linea_KAI_TAUPE/linea_KAI_TAUPE_001.jpg' },
    { id: 'milton-nero', nome: 'Portavasi Milton in metallo nero opaco', cat: 'Complementi', mat: 'Metallo', col: 'Nero', dim: '30 × 30 × H 25 cm', lt: 10, prezzo: 24.90, listino: 34.90, rating: 4.5, rec: 121, badge: 'top', img: IMG + 'linea_MILTON_NERO/linea_MILTON_NERO_001.jpg' },
    { id: 'rogers-crema', nome: 'Cesto Rogers in fibra naturale intrecciata', cat: 'Cesti', mat: 'Intreccio', col: 'Crema', dim: 'Ø 36 × H 40 cm', lt: 16, prezzo: 32.00, listino: 45.00, rating: 4.6, rec: 74, img: IMG + 'linea_ROGERS_CREMA/linea_ROGERS_CREMA_ai_001.jpg' },
    { id: 'pico-verde', nome: 'Vasetto Pico in ceramica verde bosco', cat: 'Vasi da interno', mat: 'Ceramica', col: 'Verde', dim: 'Ø 14 × H 18 cm', lt: 7, prezzo: 14.90, listino: 21.00, rating: 4.3, rec: 210, badge: 'new', img: IMG + 'linea_PICO_VERDE/linea_PICO_VERDE_001.jpg' },
    { id: 'sorrento-blu', nome: 'Vaso Sorrento in ceramica blu cobalto', cat: 'Vasi da interno', mat: 'Ceramica', col: 'Blu', dim: 'Ø 20 × H 26 cm', lt: 10, prezzo: 26.90, listino: 38.00, rating: 4.5, rec: 68, img: IMG + 'linea_SORRENTO_BLU/linea_SORRENTO_BLU_001.jpg' },
    { id: 'enid-rosa', nome: 'Vasetto Enid in ceramica rosa cipria', cat: 'Vasi da interno', mat: 'Ceramica', col: 'Rosa', dim: 'Ø 16 × H 22 cm', lt: 8, prezzo: 18.90, listino: 27.00, rating: 4.4, rec: 57, badge: 'new', img: IMG + 'linea_ENID_ROSA/linea_ENID_ROSA_001.png' },
    { id: 'tacoma-azzurro', nome: 'Piatto portavaso Tacoma smaltato azzurro', cat: 'Complementi', mat: 'Ceramica', col: 'Blu', dim: 'Ø 24 cm', lt: 6, prezzo: 12.90, listino: 18.90, rating: 4.2, rec: 95, img: IMG + 'linea_TACOMA_AZZURRO/linea_TACOMA_AZZURRO_001.jpg' }
  ];

  /* ── Utility ─────────────────────────────────────────────────────────── */
  function eur(n) { return '€' + Number(n).toFixed(2).replace('.', ','); }
  function sconto(p) { return p.listino ? Math.round((1 - p.prezzo / p.listino) * 100) : 0; }
  function trova(id) {
    for (var i = 0; i < PRODOTTI.length; i++) if (PRODOTTI[i].id === id) return PRODOTTI[i];
    return null;
  }
  var STAR = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 1.8l3 6.3 6.9.9-5 4.9 1.2 6.8L12 17.4 5.9 20.7 7.1 13.9l-5-4.9 6.9-.9z"/></svg>';
  function stelle(r) {
    var w = (r / 5 * 100).toFixed(1);
    var row = STAR + STAR + STAR + STAR + STAR;
    return '<span class="stars" style="position:relative;display:inline-flex">' +
      '<span style="display:inline-flex;gap:1px;color:#d9d3c6">' + row + '</span>' +
      '<span style="position:absolute;inset:0;overflow:hidden;width:' + w + '%;color:var(--star);display:inline-flex;gap:1px">' + row + '</span>' +
      '</span>';
  }
  var GIORNI = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];
  var MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
  function dataConsegna(p) {
    var d = new Date();
    d.setDate(d.getDate() + 2 + (p.lt % 3));
    if (d.getDay() === 0) d.setDate(d.getDate() + 1);
    return GIORNI[d.getDay()] + ' ' + d.getDate() + ' ' + MESI[d.getMonth()];
  }
  function badgeHTML(p) {
    var out = '', off = sconto(p);
    if (p.badge === 'top') out += '<span class="pill pill-top">Best seller</span>';
    if (p.badge === 'new') out += '<span class="pill pill-new">Novità</span>';
    if (off >= 20) out += '<span class="pill pill-sale">-' + off + '%</span>';
    return out;
  }
  function cardHTML(p) {
    var off = sconto(p);
    return '<article class="card">' +
      '<a class="media" href="prodotto.html?id=' + p.id + '">' +
        '<img loading="lazy" src="' + p.img + '" alt="' + p.nome + '">' +
        '<span class="badges">' + badgeHTML(p) + '</span>' +
      '</a>' +
      '<div class="body">' +
        '<a class="nome" href="prodotto.html?id=' + p.id + '">' + p.nome + '</a>' +
        '<span class="rating">' + stelle(p.rating) + '<span class="n">' + p.rating.toFixed(1) + '</span><span>(' + p.rec + ')</span></span>' +
        '<div class="prezz"><span class="now">' + eur(p.prezzo) + '</span>' +
          (p.listino ? '<span class="was">' + eur(p.listino) + '</span><span class="off">-' + off + '%</span>' : '') +
        '</div>' +
        '<div class="deliv">Consegna <b>GRATIS</b> ' + dataConsegna(p) + '</div>' +
        '<div class="prime"><span class="pz">prime</span> Disponibile in magazzino</div>' +
        '<div class="actions"><button class="btn btn-buy btn-block btn-sm" data-add="' + p.id + '">Aggiungi al carrello</button></div>' +
        '<div class="muted-line">Venduto da <b>Luis Casa</b></div>' +
      '</div>' +
    '</article>';
  }
  function renderGrid(el, list) {
    if (!el) return;
    el.innerHTML = list.map(cardHTML).join('');
  }

  /* ── Carrello (localStorage) ─────────────────────────────────────────── */
  function leggi() {
    try { return JSON.parse(localStorage.getItem(STORE)) || []; } catch (e) { return []; }
  }
  function scrivi(c) {
    try { localStorage.setItem(STORE, JSON.stringify(c)); } catch (e) {}
    aggiornaConta();
  }
  function conta() {
    var c = leggi(), n = 0;
    for (var i = 0; i < c.length; i++) n += c[i].qty;
    return n;
  }
  function aggiungi(id, qty, opz) {
    var c = leggi(), trovato = null;
    for (var i = 0; i < c.length; i++) if (c[i].id === id && (c[i].opz || '') === (opz || '')) trovato = c[i];
    if (trovato) trovato.qty += qty; else c.push({ id: id, qty: qty, opz: opz || '' });
    scrivi(c);
  }
  function imposta(id, qty, opz) {
    var c = leggi().filter(function (l) { return !(l.id === id && (l.opz || '') === (opz || '')); });
    if (qty > 0) c.push({ id: id, qty: qty, opz: opz || '' });
    scrivi(c);
  }

  /* ── Interfaccia: badge, drawer, toast ───────────────────────────────── */
  function aggiornaConta() {
    var n = conta();
    document.querySelectorAll('.cart-btn .count').forEach(function (el) {
      el.textContent = String(n);
      el.style.display = n > 0 ? 'grid' : 'none';
    });
  }

  function iniettaUI() {
    if (document.getElementById('cart-drawer')) return;
    var drawer = document.createElement('aside');
    drawer.className = 'drawer'; drawer.id = 'cart-drawer';
    drawer.innerHTML =
      '<div class="panel" style="border:0;border-radius:0;height:100%;display:flex;flex-direction:column">' +
        '<div class="sec-head" style="padding:16px 18px;margin:0;border-bottom:1px solid var(--line)">' +
          '<h2 style="font-size:18px">Il tuo carrello</h2>' +
          '<button class="icon-x" id="cart-close" aria-label="Chiudi">×</button>' +
        '</div>' +
        '<div id="cart-drawer-body" style="flex:1 1 auto;overflow:auto;padding:6px 18px"></div>' +
        '<div id="cart-drawer-foot" style="border-top:1px solid var(--line);padding:16px 18px"></div>' +
      '</div>';
    var shell = document.createElement('div');
    shell.className = 'drawer-shell';
    shell.appendChild(drawer);
    var toast = document.createElement('div');
    toast.className = 'toast'; toast.id = 'toast';
    var scrim = document.createElement('div');
    scrim.className = 'scrim'; scrim.id = 'cart-scrim';
    scrim.addEventListener('click', chiudiDrawer);
    document.body.appendChild(scrim);
    document.body.appendChild(shell);
    document.body.appendChild(toast);
    document.getElementById('cart-close').addEventListener('click', chiudiDrawer);
  }
  function apriDrawer() {
    disegnaDrawer();
    var s = document.getElementById('cart-scrim'), d = document.getElementById('cart-drawer');
    if (s) s.classList.add('on');
    if (d) d.classList.add('on');
  }
  function chiudiDrawer() {
    var s = document.getElementById('cart-scrim'), d = document.getElementById('cart-drawer');
    if (s) s.classList.remove('on');
    if (d) d.classList.remove('on');
  }
  function disegnaDrawer() {
    var c = leggi(), b = document.getElementById('cart-drawer-body'), f = document.getElementById('cart-drawer-foot');
    if (!b) return;
    if (!c.length) {
      b.innerHTML = '<p style="color:var(--muted);padding:30px 0;text-align:center">Il carrello è vuoto.<br><a href="catalogo.html">Scopri il catalogo →</a></p>';
      f.innerHTML = '';
      return;
    }
    var tot = 0;
    b.innerHTML = c.map(function (l) {
      var p = trova(l.id); if (!p) return '';
      tot += p.prezzo * l.qty;
      return '<div class="dline">' +
        '<div class="im"><img src="' + p.img + '" alt="' + p.nome + '"></div>' +
        '<div><h4>' + p.nome + '</h4>' +
          '<div class="sub">' + (l.opz || p.dim) + '</div>' +
          '<div class="sub">Quantità: ' + l.qty + '</div>' +
          '<button class="rm" data-rm="' + l.id + '|' + (l.opz || '') + '">Rimuovi</button>' +
        '</div>' +
        '<div class="px">' + eur(p.prezzo * l.qty) + '</div>' +
      '</div>';
    }).join('');
    f.innerHTML =
      '<div class="srow"><span>Subtotale (' + conta() + ')</span><b>' + eur(tot) + '</b></div>' +
      '<a class="btn btn-buy btn-block" href="carrello.html" style="margin-top:10px">Vai al carrello</a>';
  }
  function mostraToast(msg) {
    var t = document.getElementById('toast');
    if (!t) return;
    t.innerHTML = '<span class="ok">✓</span> ' + msg;
    t.classList.add('on');
    clearTimeout(t._t);
    t._t = setTimeout(function () { t.classList.remove('on'); }, 2600);
  }

  /* ── Delegazione eventi ──────────────────────────────────────────────── */
  function aggancia() {
    document.addEventListener('click', function (e) {
      var t = e.target;
      if (!t.closest) return;
      var add = t.closest('[data-add]');
      if (add) {
        e.preventDefault();
        var id = add.getAttribute('data-add');
        var opz = add.getAttribute('data-opz') || '';
        var q = add.getAttribute('data-qty') ? parseInt(add.getAttribute('data-qty'), 10) : 1;
        var p = trova(id);
        aggiungi(id, q, opz);
        mostraToast('Aggiunto: ' + (p ? p.nome : 'articolo'));
        apriDrawer();
        if (document.getElementById('cart-page')) disegnaCarrelloPagina();
        return;
      }
      var rm = t.closest('[data-rm]');
      if (rm) {
        var parts = rm.getAttribute('data-rm').split('|');
        imposta(parts[0], 0, parts[1]);
        if (document.getElementById('cart-page')) disegnaCarrelloPagina(); else disegnaDrawer();
        return;
      }
      if (t.closest('[data-cart-open]')) { e.preventDefault(); apriDrawer(); }
      if (t.closest('[data-checkout]')) {
        mostraToast('Demo: ordine pronto per il pagamento.');
      }
    });
    document.addEventListener('change', function (e) {
      var t = e.target;
      if (t.matches && t.matches('[data-qty-line]')) {
        var parts = t.getAttribute('data-qty-line').split('|');
        imposta(parts[0], parseInt(t.value, 10) || 0, parts[1]);
        setTimeout(function () {
          if (document.getElementById('cart-page')) disegnaCarrelloPagina();
          if (document.getElementById('cart-drawer-body')) disegnaDrawer();
        }, 0);
      }
    });
    document.addEventListener('submit', function (e) {
      var f = e.target;
      if (f.id === 'news-form') {
        e.preventDefault();
        mostraToast('Grazie! Iscrizione alla newsletter confermata.');
        if (f.reset) f.reset();
      }
      if (f.id === 'search-form') {
        e.preventDefault();
        var q = f.querySelector('input[name="q"]');
        var c = f.querySelector('select[name="cat"]');
        var params = [];
        if (q && q.value.trim()) params.push('q=' + encodeURIComponent(q.value.trim()));
        if (c && c.value) params.push('cat=' + encodeURIComponent(c.value));
        window.location.href = 'catalogo.html' + (params.length ? '?' + params.join('&') : '');
      }
    });
  }

  /* ── Pagina carrello ─────────────────────────────────────────────────── */
  function disegnaCarrelloPagina() {
    var box = document.getElementById('cart-lines');
    if (!box) return;
    var c = leggi();
    if (!c.length) {
      box.innerHTML = '<div class="empty"><h3>Il tuo carrello è vuoto</h3><p>Scopri la nostra selezione di vasi e fioriere.</p><p><a class="btn btn-brand" href="catalogo.html">Vai al catalogo</a></p></div>';
      var s0 = document.getElementById('cart-summary');
      if (s0) s0.innerHTML = '';
      return;
    }
    box.innerHTML = c.map(function (l) {
      var p = trova(l.id); if (!p) return '';
      return '<div class="cart-item">' +
        '<a class="im" href="prodotto.html?id=' + p.id + '"><img src="' + p.img + '" alt="' + p.nome + '"></a>' +
        '<div><a class="nome" style="font-weight:600" href="prodotto.html?id=' + p.id + '">' + p.nome + '</a>' +
          '<div class="opts">' + p.mat + ' · ' + p.col + ' · ' + p.dim + (l.opz ? ' · ' + l.opz : '') + '</div>' +
          '<div class="deliv" style="margin-top:6px">Consegna <b>GRATIS</b> ' + dataConsegna(p) + '</div>' +
          '<div style="margin-top:8px;display:flex;gap:14px;align-items:center">' +
            '<input class="qty-inline" type="number" min="0" max="99" value="' + l.qty + '" data-qty-line="' + l.id + '|' + (l.opz || '') + '">' +
            '<button class="rm" data-rm="' + l.id + '|' + (l.opz || '') + '">Elimina</button>' +
          '</div>' +
        '</div>' +
        '<div style="font-weight:800;color:var(--sale)">' + eur(p.prezzo * l.qty) + '</div>' +
      '</div>';
    }).join('');
    var tot = 0;
    c.forEach(function (l) { var p = trova(l.id); if (p) tot += p.prezzo * l.qty; });
    var sped = tot >= 79 ? 0 : 6.90;
    var sum = document.getElementById('cart-summary');
    if (sum) sum.innerHTML =
      '<h3 style="font-size:16px;margin-bottom:10px">Riepilogo ordine</h3>' +
      '<div class="srow"><span>Articoli (' + conta() + ')</span><span>' + eur(tot) + '</span></div>' +
      '<div class="srow"><span>Spedizione</span><span>' + (sped === 0 ? 'GRATIS' : eur(sped)) + '</span></div>' +
      (sped > 0
        ? '<div class="free-badge">Aggiungi ' + eur(79 - tot) + ' per ottenere la <b>spedizione gratuita</b>.</div>'
        : '<div class="free-badge">Hai ottenuto la <b>spedizione gratuita</b>!</div>') +
      '<div class="srow total"><span>Totale</span><span>' + eur(tot + sped) + '</span></div>' +
      '<button class="btn btn-buy btn-block" style="margin-top:14px" data-checkout>Procedi all\'ordine</button>' +
      '<p style="font-size:12px;color:var(--muted);margin:12px 0 0">Pagamento sicuro · Resi entro 30 giorni</p>';
  }

  /* ── Header e footer condivisi ───────────────────────────────────────── */
  var CATEGORIE = ['Vasi da esterno', 'Vasi da interno', 'Fioriere', 'Cotto', 'Fiberstone', 'Metallo', 'Cesti', 'Complementi'];

  function headerHTML() {
    return '' +
      '<div class="promo-bar"><div class="wrap">' +
        '<span>Spedizione <b>GRATIS</b> sopra 79 €</span><span class="dot">·</span>' +
        '<span>Resi entro 30 giorni</span><span class="dot">·</span>' +
        '<span>Assistenza <b>+39 035 0521957</b></span>' +
      '</div></div>' +
      '<header class="site-header">' +
        '<div class="wrap">' +
          '<a class="logo" href="index.html"><span class="logo-mark">L</span>' +
            '<span class="logo-txt"><span class="n">Luis Casa</span><span class="s">Vasi &amp; arredo</span></span></a>' +
          '<a class="hdr-chip loc" href="#"><span class="top">Consegna a</span><span class="bot">Bergamo 24100</span></a>' +
          '<form class="searchbar" id="search-form">' +
            '<select name="cat"><option value="">Tutte le categorie</option>' +
              CATEGORIE.map(function (c) { return '<option value="' + c + '">' + c + '</option>'; }).join('') +
            '</select>' +
            '<input name="q" type="search" placeholder="Cerca vasi, fioriere, cesti…" aria-label="Cerca">' +
            '<button type="submit" aria-label="Cerca"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="18" height="18"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg></button>' +
          '</form>' +
          '<div class="hdr-right">' +
            '<a class="hdr-chip" href="#"><span class="top">Ciao, accedi</span><span class="bot">Account e liste</span></a>' +
            '<a class="hdr-chip" href="#"><span class="top">Resi</span><span class="bot">e ordini</span></a>' +
            '<a class="hdr-chip cart-btn" href="#" data-cart-open><span class="count" style="display:none">0</span>' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="9" cy="20" r="1.6"/><circle cx="18.5" cy="20" r="1.6"/><path d="M1.5 3h3l2.4 12h11l2.1-9H6"/></svg>' +
              '<span class="bot">Carrello</span></a>' +
          '</div>' +
        '</div>' +
        '<nav class="cat-nav"><div class="wrap">' +
          '<a class="all" href="catalogo.html">☰ Tutte le categorie</a>' +
          CATEGORIE.map(function (c) { return '<a href="catalogo.html?cat=' + encodeURIComponent(c) + '">' + c + '</a>'; }).join('') +
          '<a href="catalogo.html?sort=sconto" style="font-weight:700">Offerte del giorno</a>' +
        '</div></nav>' +
      '</header>';
  }
  function footerHTML() {
    return '<div class="to-top" onclick="window.scrollTo({top:0,behavior:\'smooth\'})">↑ Torna su</div>' +
      '<footer class="site-foot">' +
        '<div class="wrap">' +
          '<div class="foot-grid">' +
            '<div><div class="foot-brand"><span class="logo-mark">L</span><span style="font-family:var(--serif);font-size:19px;font-weight:700;color:#fff">Luis Casa</span></div>' +
              '<p style="color:#bcd3c8;font-size:13px;margin-top:12px">Vasi, fioriere e complementi d\'arredo per la casa e il giardino. Spedizioni in tutta Italia.</p></div>' +
            '<div class="foot-col"><h4 style="color:#fff;font-size:13px;text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px">Categorie</h4><ul>' +
              CATEGORIE.slice(0, 5).map(function (c) { return '<li><a style="color:#bcd3c8;font-size:13px;line-height:2" href="catalogo.html?cat=' + encodeURIComponent(c) + '">' + c + '</a></li>'; }).join('') +
            '</ul></div>' +
            '<div class="foot-col"><h4 style="color:#fff;font-size:13px;text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px">Assistenza</h4><ul>' +
              ['Spedizioni e consegne', 'Resi e rimborsi', 'Metodi di pagamento', 'FAQ', 'Contattaci'].map(function (x) { return '<li><a href="#" style="color:#bcd3c8;font-size:13px;line-height:2">' + x + '</a></li>'; }).join('') +
            '</ul></div>' +
            '<div class="foot-col"><h4 style="color:#fff;font-size:13px;text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px">Contatti</h4><ul>' +
              '<li style="color:#bcd3c8;font-size:13px;line-height:2">Via F. Bellafino 28/30, Bergamo</li>' +
              '<li><a style="color:#bcd3c8;font-size:13px;line-height:2" href="tel:+390350521957">+39 035 0521957</a></li>' +
              '<li><a style="color:#bcd3c8;font-size:13px;line-height:2" href="mailto:info@luiscasa.it">info@luiscasa.it</a></li></ul></div>' +
          '</div>' +
          '<div class="foot-bottom" style="border-top:1px solid rgba(255,255,255,.14);padding:16px 0;display:flex;justify-content:space-between;gap:14px;flex-wrap:wrap;font-size:12px;color:#9fb6aa">' +
            '<span>© 2026 Luis Casa S.r.l. · C.F. e P. IVA 04253020160</span>' +
            '<span class="pay"><span>VISA</span><span>MASTERCARD</span><span>PAYPAL</span><span>KLARNA</span><span>BONIFICO</span></span>' +
          '</div>' +
        '</div>' +
      '</footer>';
  }

  /* ── Catalogo: filtri, ricerca, ordinamento ──────────────────────────── */
  function initCatalogo() {
    var grid = document.getElementById('grid');
    if (!grid) return;
    var params = new URLSearchParams(location.search);
    var stato = {
      q: (params.get('q') || '').trim().toLowerCase(),
      cat: params.get('cat') ? [params.get('cat')] : [],
      mat: [], col: [], max: 200, min: 0,
      sort: params.get('sort') || params.get('ordina') || 'rilevanza'
    };
    var qInput = document.querySelector('.searchbar input[name="q"]');
    if (qInput && params.get('q')) qInput.value = params.get('q');

    var valori = function (key) {
      var s = {};
      PRODOTTI.forEach(function (p) { s[p[key]] = (s[p[key]] || 0) + 1; });
      return Object.keys(s).sort();
    };
    var conteggio = function (key, val) {
      return PRODOTTI.filter(function (p) { return p[key] === val; }).length;
    };
    var fascia = function (dis, id, key, etichetta) {
      var valori2 = valori(key);
      dis.innerHTML = valori2.map(function (v) {
        var on = stato[key].indexOf(v) > -1 ? ' checked' : '';
        return '<label class="chk"><input type="checkbox" data-f="' + key + '" value="' + v + '"' + on + '>' +
          etichetta(v) + '<span class="cnt">' + conteggio(key, v) + '</span></label>';
      }).join('');
    };
    fascia(document.getElementById('f-cat'), 'f-cat', 'cat', function (v) { return v; });
    fascia(document.getElementById('f-mat'), 'f-mat', 'mat', function (v) { return v; });
    fascia(document.getElementById('f-col'), 'f-col', 'col', function (v) { return v; });

    var pr = document.getElementById('f-price');
    if (pr) {
      pr.addEventListener('input', function () {
        stato.max = parseInt(pr.value, 10);
        document.getElementById('f-price-lb').textContent = 'Fino a ' + eur(stato.max);
        applica();
      });
      document.getElementById('f-price-lb').textContent = 'Fino a ' + eur(stato.max);
    }
    var rg = document.getElementById('f-rating');
    if (rg) {
      rg.innerHTML = [4.5, 4, 3.5, 0].map(function (r) {
        return '<label class="chk"><input type="radio" name="rating" data-rating value="' + r + '"' + (r === 0 ? ' checked' : '') + '>' +
          (r === 0 ? 'Tutte' : stelle(r) + ' e oltre') + '</label>';
      }).join('');
      rg.addEventListener('change', function () { applica(); });
    }
    var form = document.getElementById('catalog-form');
    document.addEventListener('change', function (e) {
      if (e.target.matches && e.target.matches('[data-f]')) applica();
    });
    var sort = document.getElementById('f-sort');
    if (sort) { sort.value = stato.sort; sort.addEventListener('change', function () { stato.sort = sort.value; applica(); }); }

    var ratingSel = function () {
      var r = document.querySelector('[data-rating]:checked');
      return r ? parseFloat(r.value) : 0;
    };
    var spunta = function (sel) {
      return Array.prototype.slice.call(document.querySelectorAll(sel + ' input:checked')).map(function (x) { return x.value; });
    };
    function filtra() {
      var min = ratingSel();
      var list = PRODOTTI.filter(function (p) {
        if (stato.cat.length && stato.cat.indexOf(p.cat) < 0) return false;
        if (stato.mat.length && stato.mat.indexOf(p.mat) < 0) return false;
        if (stato.col.length && stato.col.indexOf(p.col) < 0) return false;
        if (p.prezzo > stato.max) return false;
        if (p.rating < min) return false;
        if (stato.q) {
          var hay = (p.nome + ' ' + p.cat + ' ' + p.mat + ' ' + p.col).toLowerCase();
          if (hay.indexOf(stato.q) < 0) return false;
        }
        return true;
      });
      var s = stato.sort;
      if (s === 'prezzo-asc') list.sort(function (a, b) { return a.prezzo - b.prezzo; });
      else if (s === 'prezzo-desc') list.sort(function (a, b) { return b.prezzo - a.prezzo; });
      else if (s === 'rating') list.sort(function (a, b) { return b.rating - a.rating; });
      else if (s === 'sconto') list.sort(function (a, b) { return sconto(b) - sconto(a); });
      return list;
    }
    function chips(list) {
      var c = [];
      var nomi = { cat: 'Categoria', mat: 'Materiale', col: 'Colore' };
      ['cat', 'mat', 'col'].forEach(function (k) {
        stato[k].forEach(function (v) {
          c.push('<span class="chip">' + nomi[k] + ': ' + v + ' <button data-chk="' + k + '|' + v + '">×</button></span>');
        });
      });
      if (stato.q) c.push('<span class="chip">Ricerca: "' + stato.q + '" <button data-chk="q|">×</button></span>');
      var el = document.getElementById('chips');
      if (el) el.innerHTML = c.join('') + (c.length ? '<button class="rm" id="chk-clear" style="padding:5px 4px">Azzera tutto</button>' : '');
    }
    function applica() {
      stato.cat = spunta('#f-cat'); stato.mat = spunta('#f-mat'); stato.col = spunta('#f-col');
      var list = filtra();
      grid.innerHTML = list.map(cardHTML).join('');
      var cnt = document.getElementById('count');
      if (cnt) cnt.textContent = list.length + (list.length === 1 ? ' risultato' : ' risultati') + (stato.cat.length ? ' in "' + stato.cat.join(', ') + '"' : '');
      var v = document.getElementById('vuoto');
      if (v) v.style.display = list.length ? 'none' : 'block';
      chips(list);
    }
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-chk]');
      if (b) {
        var parts = b.getAttribute('data-chk').split('|');
        if (parts[0] === 'q') {
          stato.q = '';
          var qi = document.querySelector('#search-form input[name="q"]');
          if (qi) qi.value = '';
        } else {
          var k = parts[0], val = parts[1];
          stato[k] = stato[k].filter(function (x) { return x !== val; });
          var cb = document.querySelector('[data-f="' + k + '"][value="' + val + '"]');
          if (cb) cb.checked = false;
        }
        applica();
        return;
      }
      if (e.target.closest && e.target.closest('#chk-clear')) {
        stato.cat = []; stato.mat = []; stato.col = []; stato.q = '';
        document.querySelectorAll('[data-f]').forEach(function (x) { x.checked = false; });
        var qi2 = document.querySelector('#search-form input[name="q"]');
        if (qi2) qi2.value = '';
        applica();
      }
      if (e.target.closest && e.target.closest('#f-reset')) {
        stato.cat = []; stato.mat = []; stato.col = []; stato.q = ''; stato.max = 200;
        document.querySelectorAll('[data-f]').forEach(function (x) { x.checked = false; });
        var pr2 = document.getElementById('f-price'); if (pr2) { pr2.value = 200; document.getElementById('f-price-lb').textContent = 'Fino a ' + eur(200); }
        var r0 = document.querySelector('[data-rating][value="0"]'); if (r0) r0.checked = true;
        applica();
      }
    });
    applica();
  }

  /* ── Scheda prodotto ─────────────────────────────────────────────────── */
  function initProdotto() {
    var root = document.getElementById('pdp');
    if (!root) return;
    var id = new URLSearchParams(location.search).get('id');
    var p = trova(id) || PRODOTTI[0];
    document.title = p.nome + ' · Luis Casa';
    var imgs = p.imgs && p.imgs.length ? p.imgs : [p.img];
    document.getElementById('stage-img').src = imgs[0];
    document.getElementById('thumbs').innerHTML = imgs.map(function (src, i) {
      return '<button class="' + (i === 0 ? 'on' : '') + '" data-thumb="' + i + '"><img src="' + src + '" alt=""></button>';
    }).join('');
    document.getElementById('p-nome').textContent = p.nome;
    var cn = document.getElementById('crumb-nome'); if (cn) cn.textContent = p.nome;
    document.getElementById('p-meta').innerHTML = 'Venduto da <b>Luis Casa</b> · Cod. ' + p.id.toUpperCase() + ' · ' + p.cat;
    document.getElementById('p-rating').innerHTML = stelle(p.rating) + ' <span class="n">' + p.rating.toFixed(1) + '</span> <span>(' + p.rec + ' recensioni)</span>';
    var off = sconto(p);
    document.getElementById('p-price').innerHTML = '<span class="now">' + eur(p.prezzo) + '</span>' +
      (p.listino ? '<span class="was">' + eur(p.listino) + '</span><span class="off">-' + off + '%</span>' : '');
    document.getElementById('p-price2').textContent = eur(p.prezzo);
    if (p.listino) document.getElementById('p-was').textContent = eur(p.listino);
    document.getElementById('p-deliv').innerHTML = 'Consegna <b>GRATIS</b> ' + dataConsegna(p) + ' · Ordina entro 3 ore';
    document.getElementById('p-col').innerHTML = (p.col ? [p.col] : ['Standard']).map(function (c, i) {
      return '<button class="swatch' + (i === 0 ? ' on' : '') + '">' + c + '</button>';
    }).join('');
    document.getElementById('p-dim').innerHTML = '<button class="swatch on">' + p.dim + '</button>';
    document.getElementById('p-desc').textContent = 'Il prodotto ' + p.nome.toLowerCase() + ' è realizzato in ' + p.mat.toLowerCase() +
      ' ed è pensato per arredare con eleganza sia gli spazi interni che esterni. Resistente agli agenti atmosferici, combina praticità e design. Perfetto per terrazzi, giardini, salotti e angoli verdi della casa.';
    document.getElementById('p-spec').innerHTML =
      '<tr><td>Materiale</td><td>' + p.mat + '</td></tr>' +
      '<tr><td>Colore</td><td>' + p.col + '</td></tr>' +
      '<tr><td>Dimensioni</td><td>' + p.dim + '</td></tr>' +
      '<tr><td>Categoria</td><td>' + p.cat + '</td></tr>';
    document.getElementById('thumbs').addEventListener('click', function (e) {
      var b = e.target.closest('[data-thumb]');
      if (!b) return;
      document.querySelectorAll('#thumbs button').forEach(function (x) { x.classList.remove('on'); });
      b.classList.add('on');
      document.getElementById('stage-img').src = imgs[parseInt(b.getAttribute('data-thumb'), 10)];
    });
    root.addEventListener('click', function (e) {
      var sw = e.target.closest && e.target.closest('.swatch');
      if (sw && e.target.closest('#p-col, #p-dim')) {
        var parent = sw.parentNode;
        Array.prototype.forEach.call(parent.children, function (x) { x.classList.remove('on'); });
        sw.classList.add('on');
      }
    });
    var add = document.getElementById('p-add');
    if (add) add.addEventListener('click', function () {
      var q = parseInt(document.getElementById('p-qty').value, 10) || 1;
      var col = (document.querySelector('#p-col .swatch.on') || {}).textContent || p.col;
      aggiungi(p.id, q, p.dim + ' · ' + col);
      mostraToast('Aggiunto: ' + p.nome);
      apriDrawer();
    });
    var buy = document.getElementById('p-buy');
    if (buy) buy.addEventListener('click', function () {
      var q = parseInt(document.getElementById('p-qty').value, 10) || 1;
      aggiungi(p.id, q, '');
      window.location.href = 'carrello.html';
    });
    // correlati
    var corr = document.getElementById('correlati');
    if (corr) {
      var lista = PRODOTTI.filter(function (x) { return x.cat === p.cat && x.id !== p.id; });
      if (lista.length < 5) lista = lista.concat(PRODOTTI.filter(function (x) { return x.id !== p.id; })).slice(0, 5);
      corr.innerHTML = lista.slice(0, 5).map(cardHTML).join('');
    }
  }

  /* ── Export pubblico ─────────────────────────────────────────────────── */
  window.LUIS = {
    PRODOTTI: PRODOTTI, eur: eur, sconto: sconto, trova: trova, stelle: stelle,
    cardHTML: cardHTML, renderGrid: renderGrid, dataConsegna: dataConsegna, CATEGORIE: CATEGORIE,
    carrello: { leggi: leggi, aggiungi: aggiungi, imposta: imposta, conta: conta },
    apriDrawer: apriDrawer, toast: mostraToast, disegnaCarrelloPagina: disegnaCarrelloPagina
  };

  document.addEventListener('DOMContentLoaded', function () {
    var h = document.getElementById('site-header');
    if (h) h.innerHTML = headerHTML();
    var f = document.getElementById('site-footer');
    if (f) f.innerHTML = footerHTML();

    iniettaUI();
    aggancia();
    aggiornaConta();

    // Home: griglie
    var deals = document.getElementById('deals');
    if (deals) {
      var offerte = PRODOTTI.slice().sort(function (a, b) { return sconto(b) - sconto(a); }).slice(0, 5);
      renderGrid(deals, offerte);
      var best = PRODOTTI.slice().sort(function (a, b) { return b.rec - a.rec; }).slice(0, 10);
      renderGrid(document.getElementById('best'), best);
      var nuovi = PRODOTTI.filter(function (p) { return p.badge === 'new'; }).concat(PRODOTTI.slice(0, 5)).slice(0, 5);
      renderGrid(document.getElementById('nuovi'), nuovi);
    }
    initCatalogo();
    initProdotto();
    disegnaCarrelloPagina();
  });
})();
