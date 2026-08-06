/* Editor destinazione */
var current = null;
var currentLevel = 'nazione';
var editModal = document.getElementById('edit-modal');
var currentComboboxNazione = null;
var currentComboboxRegione = null;
var simComboboxNazione = null;
var simComboboxRegione = null;

function buildComboboxOptions() {
  var nazioniOpts = [{ value: '', label: 'Usa tariffa automatica', meta: '' }].concat(NAZIONI_ORDER.map(function(n) {
    return { value: n, label: NAZIONI[n].n, meta: NAZIONI[n].z === 'EU' ? 'EU' : 'ROW' };
  }));
  var regioniOpts = [{ value: '', label: 'Usa tariffa automatica', meta: '' }].concat(REGIONI_IT.map(function(name) {
    return { value: name, label: name, meta: 'IT' };
  }));
  return { nazioni: nazioniOpts, regioni: regioniOpts };
}

var comboboxCache = null;
function getComboboxOptions() {
  if (!comboboxCache) comboboxCache = buildComboboxOptions();
  return comboboxCache;
}

/* Combobox riutilizzabile — singolo input con suggerimenti a tendina */
function createCombobox(inputId, dropdownId, hiddenInputId, options, filterFn, onSelect) {
  var input = document.getElementById(inputId);
  var dropdown = document.getElementById(dropdownId);
  var hiddenInput = document.getElementById(hiddenInputId);
  var opts = options || [];
  var selectCallback = onSelect || null;
  var highlightedIndex = -1;
  var isOpen = false;

  function filterOptions(query) {
    if (!query) return opts;
    var q = query.toLowerCase();
    return opts.filter(function(opt) {
      if (opt.value === '') return true;
      return opt.value.toLowerCase().indexOf(q) !== -1 ||
             (opt.label && opt.label.toLowerCase().indexOf(q) !== -1);
    });
  }

  function renderOptions(filter) {
    var filtered = filterOptions(filter);
    var html = '';
    if (!filtered.length) {
      html = '<div class="combobox-empty">Nessun risultato</div>';
    } else {
      filtered.forEach(function(opt) {
        var isAuto = opt.value === '';
        html += '<div class="combobox-option' + (isAuto ? ' auto-option' : '') + '" data-value="' + opt.value + '">' +
          '<span class="option-label">' + opt.label + '</span>' +
          (opt.meta ? '<span class="option-meta">' + opt.meta + '</span>' : '') +
          '</div>';
      });
    }
    dropdown.innerHTML = html;
    dropdown.querySelectorAll('.combobox-option').forEach(function(el) {
      el.addEventListener('click', function() {
        selectOption(this.dataset.value);
      });
    });
  }

  function open() {
    dropdown.classList.add('open');
    isOpen = true;
    renderOptions(input.value);
    var els = dropdown.querySelectorAll('.combobox-option');
    if (els.length > 0) {
      highlightedIndex = 0;
      highlight(0);
    }
  }

  function close() {
    dropdown.classList.remove('open');
    isOpen = false;
    highlightedIndex = -1;
  }

  function highlight(index) {
    var els = dropdown.querySelectorAll('.combobox-option');
    if (index < 0 || index >= els.length) return;
    els.forEach(function(el, i) {
      el.classList.toggle('highlighted', i === index);
    });
    highlightedIndex = index;
  }

  function selectOption(value) {
    var opt = null;
    for (var i = 0; i < opts.length; i++) {
      if (opts[i].value === value) { opt = opts[i]; break; }
    }
    hiddenInput.value = value;
    input.value = opt ? opt.label : '';
    dropdown.classList.remove('open');
    isOpen = false;
    highlightedIndex = -1;
    if (selectCallback) selectCallback(value);
  }

  input.addEventListener('input', function() {
    renderOptions(this.value);
    if (!isOpen) {
      dropdown.classList.add('open');
      isOpen = true;
    }
    highlightedIndex = -1;
  });

  input.addEventListener('focus', function() {
    renderOptions(this.value);
    dropdown.classList.add('open');
    isOpen = true;
  });

  input.addEventListener('blur', function() {
    setTimeout(close, 150);
  });

  input.addEventListener('keydown', function(e) {
    var els = dropdown.querySelectorAll('.combobox-option');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) { open(); return; }
      highlightedIndex = Math.min(highlightedIndex + 1, els.length - 1);
      highlight(highlightedIndex);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      highlightedIndex = Math.max(highlightedIndex - 1, 0);
      highlight(highlightedIndex);
    } else if (e.key === 'Enter' && highlightedIndex >= 0 && highlightedIndex < els.length) {
      e.preventDefault();
      selectOption(els[highlightedIndex].dataset.value);
    } else if (e.key === 'Escape') {
      close();
    }
  });

  document.addEventListener('click', function(e) {
    if (!e.target.closest('.combobox')) close();
  });

  return {
    close: close,
    open: open,
    getValue: function() { return hiddenInput.value; },
    clearSearch: function() {
      input.value = '';
      hiddenInput.value = '';
      dropdown.classList.remove('open');
      isOpen = false;
      highlightedIndex = -1;
    },
    selectOption: selectOption
  };
}

function initComboboxes() {
  var opts = getComboboxOptions();
  currentComboboxNazione = createCombobox(
    'edit-nazione-search', 'edit-nazione-dropdown', 'edit-nazione',
    opts.nazioni, null,
    function(val) { setLevel(currentLevel); destPreview(); }
  );
  currentComboboxRegione = createCombobox(
    'edit-regione-search', 'edit-regione-dropdown', 'edit-regione',
    opts.regioni, null,
    function(val) { destPreview(); }
  );
  simComboboxNazione = createCombobox(
    'sim-nazione-search', 'sim-nazione-dropdown', 'sim-nazione',
    opts.nazioni.slice(1), null,
    function(val) { simNazioneChange(); }
  );
  simComboboxRegione = createCombobox(
    'sim-regione-search', 'sim-regione-dropdown', 'sim-regione',
    opts.regioni, null,
    function(val) { simCalc(); }
  );
}

function bindNationSearch(searchId, selectId, onPick) {
  /* Legacy - reserved for backward compatibility */
}

function resetNationSearch(searchId, sel) {
  /* Legacy - reserved for backward compatibility */
}

function renderDestDesc(d) {
  var desc = describeTariffa(d);
  if (!desc) return;
  document.getElementById('edit-desc-title').textContent = desc.title;
  document.getElementById('edit-desc-text').textContent = desc.text;
  document.querySelectorAll('#edit-hier span').forEach(function (span) {
    span.classList.toggle('on', span.dataset.h === desc.hier);
  });
}
