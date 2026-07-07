(function () {
  'use strict';

  // ====================================================================
  // CONFIG — ajuste estes valores quando o sindicato definir
  // ====================================================================
  // Defina o valor da anuidade em reais. Deixe 0 para ocultar o valor
  // e exibir "Valor a confirmar" no card de pagamento.
  var VALOR_ANUIDADE = 0;            // ex.: 500.00
  var MAX_PARCELAS = 12;             // limite no cartão parcelado
  var PARCELAS_SEM_JUROS = 6;        // até quantas parcelas sem juros
  var STORAGE_KEY = 'sincidema_filiacao_rascunho';
  var SUBMISSIONS_KEY = 'sincidema_filiacoes_pendentes';
  // ====================================================================

  var form = document.getElementById('filiacaoForm');
  var stepperItems = document.querySelectorAll('.stepper__item');
  var steps = document.querySelectorAll('.step');
  var submitBtn = document.getElementById('submitBtn');
  var parcelasBox = document.getElementById('parcelasBox');
  var parcelasSelect = document.getElementById('parcelas');
  var maxParcelasLabel = document.getElementById('maxParcelasLabel');
  var payInfoText = document.getElementById('payInfoText');
  var payInfoValue = document.getElementById('payInfoValue');
  var summaryLines = document.getElementById('summaryLines');
  var currentStep = 1;

  // -------------------- Helpers --------------------
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return (ctx || document).querySelectorAll(sel); }

  function formatBRL(v) {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function setInvalid(input, invalid) {
    var field = input.closest('.field');
    if (!field) return;
    field.classList.toggle('is-invalid', !!invalid);
    input.classList.toggle('is-invalid', !!invalid);
  }

  // -------------------- Máscaras --------------------
  function maskCPF(v) {
    v = v.replace(/\D/g, '').slice(0, 11);
    if (v.length > 9) return v.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
    if (v.length > 6) return v.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
    if (v.length > 3) return v.replace(/(\d{3})(\d{1,3})/, '$1.$2');
    return v;
  }

  function maskPhone(v) {
    v = v.replace(/\D/g, '').slice(0, 11);
    if (v.length > 10) return v.replace(/(\d{2})(\d{5})(\d{1,4})/, '($1) $2-$3');
    if (v.length > 6) return v.replace(/(\d{2})(\d{4})(\d{1,4})/, '($1) $2-$3');
    if (v.length > 2) return v.replace(/(\d{2})(\d{1,5})/, '($1) $2');
    if (v.length > 0) return v.replace(/(\d{1,2})/, '($1');
    return v;
  }

  function maskCEP(v) {
    v = v.replace(/\D/g, '').slice(0, 8);
    if (v.length > 5) return v.replace(/(\d{5})(\d{1,3})/, '$1-$2');
    return v;
  }

  function attachMask(id, fn) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', function () {
      var pos = el.selectionEnd;
      el.value = fn(el.value);
      try { el.setSelectionRange(pos, pos); } catch (_) {}
      setInvalid(el, false);
    });
  }

  attachMask('cpf', maskCPF);
  attachMask('telefone', maskPhone);
  attachMask('cep', maskCEP);

  // -------------------- Validadores --------------------
  function isValidCPF(cpf) {
    cpf = cpf.replace(/\D/g, '');
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
    var sum = 0, rest;
    for (var i = 1; i <= 9; i++) sum += parseInt(cpf.charAt(i - 1)) * (11 - i);
    rest = (sum * 10) % 11;
    if (rest === 10 || rest === 11) rest = 0;
    if (rest !== parseInt(cpf.charAt(9))) return false;
    sum = 0;
    for (var j = 1; j <= 10; j++) sum += parseInt(cpf.charAt(j - 1)) * (12 - j);
    rest = (sum * 10) % 11;
    if (rest === 10 || rest === 11) rest = 0;
    return rest === parseInt(cpf.charAt(10));
  }

  function isValidEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }

  function isValidPhone(v) {
    return v.replace(/\D/g, '').length >= 10;
  }

  function isValidCEP(v) {
    return v.replace(/\D/g, '').length === 8;
  }

  // -------------------- ViaCEP autofill --------------------
  document.getElementById('cep').addEventListener('blur', function (e) {
    var raw = e.target.value.replace(/\D/g, '');
    if (raw.length !== 8) return;
    fetch('https://viacep.com.br/ws/' + raw + '/json/')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.erro) return;
        if (data.logradouro) document.getElementById('rua').value = data.logradouro;
        if (data.bairro) document.getElementById('bairro').value = data.bairro;
        if (data.localidade) document.getElementById('cidade').value = data.localidade;
        if (data.uf) document.getElementById('uf').value = data.uf;
        ['rua','bairro','cidade','uf'].forEach(function (id) {
          setInvalid(document.getElementById(id), false);
        });
        document.getElementById('numero').focus();
      })
      .catch(function () { /* offline ou CEP não encontrado: ignora */ });
  });

  // -------------------- Validação por step --------------------
  function validateStep(step) {
    var inputs = $$('.step[data-step="' + step + '"] [required]');
    var ok = true;
    inputs.forEach(function (input) {
      var v = input.value.trim();
      var invalid = false;
      if (!v) invalid = true;
      else if (input.id === 'cpf' && !isValidCPF(v)) invalid = true;
      else if (input.id === 'email' && !isValidEmail(v)) invalid = true;
      else if (input.id === 'telefone' && !isValidPhone(v)) invalid = true;
      else if (input.id === 'cep' && !isValidCEP(v)) invalid = true;
      setInvalid(input, invalid);
      if (invalid) ok = false;
    });
    if (step === 3) {
      var radio = form.querySelector('input[name="forma_pagamento"]:checked');
      if (!radio) {
        ok = false;
        alert('Selecione uma forma de pagamento.');
      } else if (radio.value === 'credito_parcelado' && !parcelasSelect.value) {
        ok = false;
        alert('Selecione o número de parcelas.');
      }
    }
    if (!ok) {
      var firstInvalid = $('.step[data-step="' + step + '"] .is-invalid');
      if (firstInvalid) firstInvalid.focus();
    }
    return ok;
  }

  // -------------------- Navegação entre steps --------------------
  function showStep(n) {
    steps.forEach(function (s) { s.classList.toggle('is-active', +s.dataset.step === n); });
    stepperItems.forEach(function (it) {
      var num = +it.dataset.step;
      it.classList.toggle('is-active', num === n);
      it.classList.toggle('is-done', num < n);
    });
    currentStep = n;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (n === 3) updateSummary();
  }

  form.addEventListener('click', function (e) {
    var t = e.target.closest('[data-action]');
    if (!t) return;
    if (t.dataset.action === 'next') {
      if (validateStep(currentStep)) {
        saveDraft();
        showStep(currentStep + 1);
      }
    } else if (t.dataset.action === 'prev') {
      showStep(currentStep - 1);
    }
  });

  // -------------------- Pagamento --------------------
  function buildParcelas() {
    parcelasSelect.innerHTML = '<option value="">Selecione…</option>';
    for (var i = 2; i <= MAX_PARCELAS; i++) {
      var opt = document.createElement('option');
      opt.value = String(i);
      var label = i + 'x';
      if (VALOR_ANUIDADE > 0) {
        label += ' de ' + formatBRL(VALOR_ANUIDADE / i);
        label += i <= PARCELAS_SEM_JUROS ? ' (sem juros)' : ' (com juros)';
      }
      opt.textContent = label;
      parcelasSelect.appendChild(opt);
    }
    maxParcelasLabel.textContent = MAX_PARCELAS;
  }

  function updatePayInfo() {
    if (VALOR_ANUIDADE > 0) {
      payInfoText.textContent = 'Valor da anuidade ' + new Date().getFullYear() + '.';
      payInfoValue.style.display = 'inline-block';
      payInfoValue.textContent = formatBRL(VALOR_ANUIDADE);
    }
  }

  form.addEventListener('change', function (e) {
    if (e.target.name === 'forma_pagamento') {
      parcelasBox.classList.toggle('is-visible', e.target.value === 'credito_parcelado');
      updateSummary();
    }
    if (e.target.id === 'parcelas') updateSummary();
  });

  // -------------------- Resumo --------------------
  function updateSummary() {
    var data = collectData();
    var forma = data.forma_pagamento;
    var formaLabel = {
      pix: 'Pix à vista',
      credito_avista: 'Cartão de crédito à vista',
      credito_parcelado: 'Cartão de crédito parcelado' + (data.parcelas ? ' em ' + data.parcelas + 'x' : '')
    }[forma] || '— selecione acima —';

    var html =
      '<strong>' + (data.nome || '—') + '</strong><br>' +
      'CPF ' + (data.cpf || '—') + ' · CRO ' + (data.cro || '—') + '/' + (data.cro_uf || '—') + '<br>' +
      (data.email || '—') + ' · ' + (data.telefone || '—') + '<br>' +
      'Forma: <strong>' + formaLabel + '</strong>';

    if (VALOR_ANUIDADE > 0) {
      html += '<br>Valor: <strong>' + formatBRL(VALOR_ANUIDADE) + '</strong>';
    }
    summaryLines.innerHTML = html;
  }

  // -------------------- Coleta + persistência --------------------
  function collectData() {
    var fd = new FormData(form);
    var data = {};
    fd.forEach(function (v, k) { data[k] = (typeof v === 'string') ? v.trim() : v; });
    return data;
  }

  function saveDraft() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(collectData()));
    } catch (_) {}
  }

  function loadDraft() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var data = JSON.parse(raw);
      Object.keys(data).forEach(function (k) {
        var el = form.elements[k];
        if (!el) return;
        if (el.type === 'radio') {
          var match = form.querySelector('[name="' + k + '"][value="' + data[k] + '"]');
          if (match) match.checked = true;
        } else {
          el.value = data[k];
        }
      });
      if (data.forma_pagamento === 'credito_parcelado') {
        parcelasBox.classList.add('is-visible');
      }
    } catch (_) {}
  }

  // -------------------- Submit final --------------------
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validateStep(3)) return;

    var data = collectData();
    data.criado_em = new Date().toISOString();
    data.status = 'pendente_pagamento';
    data.valor_anuidade = VALOR_ANUIDADE || null;
    data.id = 'sind_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

    // Persiste localmente (Fase 1 — substituir por Supabase na Fase 2)
    try {
      var list = JSON.parse(localStorage.getItem(SUBMISSIONS_KEY) || '[]');
      list.push(data);
      localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(list));
      localStorage.removeItem(STORAGE_KEY);
    } catch (_) {}

    // Guarda último envio pra exibir na obrigado.html
    try {
      sessionStorage.setItem('sincidema_ultimo_envio', JSON.stringify(data));
    } catch (_) {}

    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Enviando...';

    // Simula latência de envio (Fase 2: chamada à edge function Asaas)
    setTimeout(function () {
      window.location.href = 'obrigado.html';
    }, 600);
  });

  // -------------------- Boot --------------------
  buildParcelas();
  updatePayInfo();
  loadDraft();

  // Salva rascunho ao sair
  window.addEventListener('beforeunload', saveDraft);
})();
