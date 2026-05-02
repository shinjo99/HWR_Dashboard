/* ============================================================
   HDOS Valuation v2 — core.js
   ============================================================
   Path  : js/pages/valuation/core.js (또는 별도 위치)
   Prefix: hv (HDOS Valuation)
   Date  : 2026-05-02

   구조:
     §1  Constants & State
     §2  Utils (fmt, toast, dom)
     §3  API layer
     §4  Excel parser
     §5  Input gathering & validation
     §6  Calculate flow (main)
     §7  Renderer — Overview
     §8  Renderer — Sensitivity
     §9  Renderer — Cash Flow
     §10 Renderer — History
     §11 Renderer — Benchmark
     §12 Event handlers (toggle/tab/slider)
     §13 Init & lifecycle
   ============================================================ */


/* ╔═══════════════════════════════════════════════════════════
   ║  §1  CONSTANTS & STATE
   ╚═══════════════════════════════════════════════════════════ */

const HV_API = (window.API_BASE || 'https://web-production-c60fe.up.railway.app').replace(/\/$/, '');
const HV_TZ = 'America/Chicago';   // Houston Central Time

// Threshold fallback (백엔드 endpoint 미배포 시 사용)
const HV_THRESHOLD_FALLBACK = {
  pv_only:   { sponsor_irr_hurdle_after_tax: 11.0, project_irr_reference: 8.0,  dscr_min_threshold: 1.35 },
  bess_only: { sponsor_irr_hurdle_after_tax: 13.0, project_irr_reference: 10.0, dscr_min_threshold: 1.30 },
  hybrid:    { sponsor_irr_hurdle_after_tax: 12.0, project_irr_reference: 9.0,  dscr_min_threshold: 1.30 },
};

// Tornado 변수 정의 (which inputs to perturb)
const HV_TORNADO_VARS = [
  { key: 'ppa_price',   label: 'PPA Price',     domId: 'hv-ppa-price'   },
  { key: 'capex_total', label: 'Total CAPEX',   domId: 'hv-capex-total' },
  { key: 'dev_fee',     label: 'Dev Fee',       domId: 'hv-dev-fee'     },
  { key: 'int_rate',    label: 'Interest Rate', domId: 'hv-int-rate'    },
  { key: 'opex_total',  label: 'Total OPEX',    domId: 'hv-opex-total'  },
  { key: 'ppa_term',    label: 'PPA Term',      domId: 'hv-ppa-term'    },
  { key: 'pv_itc',      label: 'PV ITC',        domId: 'hv-pv-itc'      },
  { key: 'capacity_factor', label: 'Capacity Factor', domId: 'hv-capacity-factor' },
];

// Two-way matrix axis (PPA vs CAPEX)
const HV_MATRIX_DELTAS = [-20, -10, 0, 10, 20];   // %

// Phase boundaries (Y0=construction, Y1-Y5=pre-flip, ...)
const HV_PHASES = [
  { id: 'p1', label: 'Construction',   start: 0,         end: 0           },
  { id: 'p2', label: 'TE Pre-Flip',    start: 1,         end: 'flip_year' },
  { id: 'p3', label: 'Operation',      start: 'flip_y1', end: 'ppa_end'   },
  { id: 'p4', label: 'Merchant Tail',  start: 'ppa_end1',end: 'life_end'  },
];

// Module state (single object — reset on project change)
const HV = {
  project: null,                  // selected project meta
  inputs: null,                   // last gathered inputs (snapshot)
  result: null,                   // last calculation result
  threshold: null,                // current type's reference
  projectType: null,              // 'pv_only' | 'bess_only' | 'hybrid'
  history: { project: [], threshold: [] },
  benchmark: { peer: null, levelten: null, bnef: null },
  excelParse: null,               // last parsed PF (inputs + original IRRs from Excel)
  tornado: null,                  // last computed tornado (server or client)
  uploadedFile: null,             // staged File object
  isCalculating: false,
};


/* ╔═══════════════════════════════════════════════════════════
   ║  §2  UTILS
   ╚═══════════════════════════════════════════════════════════ */

function $(sel)  { return document.querySelector(sel); }
function $$(sel) { return Array.from(document.querySelectorAll(sel)); }
function el(id)  { return document.getElementById(id); }

// number formatting — tabular nums friendly
function fmtN(v, digits = 0) {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
function fmtPct(v, digits = 1) {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return `${n.toFixed(digits)}%`;
}
function fmtMoney(v, digits = 1, unit = 'M') {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return `$${n.toFixed(digits)}${unit}`;
}
function fmtMoneyAuto(v) {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}
function fmtDelta(v, digits = 2, suffix = 'pp') {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(digits)} ${suffix}`;
}

// Date in Central Time
function fmtDateTime(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-US', {
      timeZone: HV_TZ,
      year: 'numeric', month: 'short', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    });
  } catch { return iso; }
}
function fmtDate(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', {
      timeZone: HV_TZ,
      year: 'numeric', month: 'short', day: '2-digit',
    });
  } catch { return iso; }
}

// Setter helpers
function setText(id, value) {
  const node = el(id);
  if (node) node.textContent = value;
}
function setVal(id, value) {
  const node = el(id);
  if (node && value !== null && value !== undefined && value !== '') {
    node.value = value;
  }
}
function getVal(id, asNumber = true) {
  const node = el(id);
  if (!node) return null;
  const raw = node.value;
  if (raw === '' || raw === null || raw === undefined) return null;
  if (!asNumber) return raw;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

// Status update (toolbar status dot)
function setStatus(text, kind = 'idle') {
  setText('hv-status-text', text);
  const dot = el('hv-status-dot');
  if (dot) {
    dot.className = 'hv-status-dot';
    if (kind === 'ok')      dot.classList.add('ok');
    if (kind === 'warn')    dot.classList.add('warn');
    if (kind === 'err')     dot.classList.add('err');
    if (kind === 'loading') dot.classList.add('loading');
  }
}
function setCalcStatus(text) { setText('hv-calc-status', text); }

// Toast (가벼운 알림 — 기존 dashboard에 alert 없으면 console)
function hvToast(msg, kind = 'info') {
  // 기존 dashboard에 toast util 있으면 그거 사용
  if (typeof window.toast === 'function') return window.toast(msg, kind);
  console.log(`[HV ${kind}]`, msg);
}

// Project type 자동 감지
function detectProjectType(inputs) {
  const pv = (inputs.pv_mwac || 0) > 0 || (inputs.pv_mwdc || 0) > 0;
  const bess = (inputs.bess_mw || 0) > 0 || (inputs.bess_mwh || 0) > 0;
  if (pv && bess) return 'hybrid';
  if (bess)       return 'bess_only';
  return 'pv_only';
}
function projectTypeLabel(t) {
  return t === 'pv_only'   ? 'PV Only' :
         t === 'bess_only' ? 'BESS Only' :
         t === 'hybrid'    ? 'PV + BESS' : '—';
}

// Auth token
function getToken() {
  return localStorage.getItem('token')
      || localStorage.getItem('jwt_token')
      || window.authToken
      || '';
}
function authHeader() {
  const t = getToken();
  return t ? { 'Authorization': `Bearer ${t}` } : {};
}

// Safe JSON parse
function safeParse(s) {
  try { return JSON.parse(s); } catch { return null; }
}

// Clamp
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }




/* ╔═══════════════════════════════════════════════════════════
   ║  §3  API LAYER
   ╚═══════════════════════════════════════════════════════════ */

async function hvFetch(path, opts = {}) {
  const url = path.startsWith('http') ? path : `${HV_API}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...authHeader(),
    ...(opts.headers || {}),
  };
  const res = await fetch(url, { ...opts, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`HTTP ${res.status} — ${text || res.statusText}`);
    err.status = res.status;
    err.body = text;
    throw err;
  }
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  return res.text();
}

// Multipart upload (file)
async function hvUpload(path, file, extraFields = {}) {
  const url = path.startsWith('http') ? path : `${HV_API}${path}`;
  const fd = new FormData();
  fd.append('file', file);
  for (const [k, v] of Object.entries(extraFields)) fd.append(k, v);
  const res = await fetch(url, {
    method: 'POST',
    body: fd,
    headers: { ...authHeader() },   // Content-Type 자동 (boundary)
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Upload failed (${res.status}): ${text}`);
  }
  return res.json();
}

// ── Projects ──
async function apiGetProjects() {
  return hvFetch('/projects');
}
async function apiGetProject(id) {
  return hvFetch(`/projects/${id}`);
}

// ── Calculate ──
async function apiCalculate(inputs) {
  return hvFetch('/valuation/calculate', {
    method: 'POST',
    body: JSON.stringify(inputs),
  });
}

// ── Calculation runs (history) ──
async function apiSaveRun(projectId, inputs, result) {
  return hvFetch(`/valuation/runs/${projectId}`, {
    method: 'POST',
    body: JSON.stringify({ inputs, result, run_at: new Date().toISOString() }),
  });
}
async function apiGetRuns(projectId, limit = 20) {
  try {
    return await hvFetch(`/valuation/runs/${projectId}?limit=${limit}`);
  } catch (e) {
    if (e.status === 404) return [];
    throw e;
  }
}

// ── Thresholds ──
async function apiGetThreshold(type) {
  try {
    return await hvFetch(`/valuation/thresholds/${type}`);
  } catch (e) {
    console.warn('[HV] threshold fetch failed, using fallback:', e.message);
    return { ...HV_THRESHOLD_FALLBACK[type], type, _fallback: true };
  }
}
async function apiPutThreshold(type, payload) {
  return hvFetch(`/valuation/thresholds/${type}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}
async function apiGetThresholdAudit(type) {
  try {
    return await hvFetch(`/valuation/thresholds/${type}/audit`);
  } catch (e) {
    if (e.status === 404) return [];
    return [];
  }
}

// ── Excel parser (PF model) ──
async function apiParsePF(file) {
  try {
    return await hvUpload('/valuation/parse-pf', file);
  } catch (e) {
    // 백엔드 미구현 시 stub 응답 (개발용)
    if (e.message && e.message.includes('404')) {
      console.warn('[HV] /valuation/parse-pf 미구현 — 빈 응답 반환');
      return { inputs: {}, original_irrs: {}, warnings: ['Backend endpoint not yet deployed'] };
    }
    throw e;
  }
}

// ── Benchmark ──
async function apiGetPeerIrr() {
  try { return await hvFetch('/benchmark/peer_irr'); }
  catch { return null; }
}
async function apiGetLevelTenLatest() {
  try { return await hvFetch('/benchmark/levelten/latest'); }
  catch { return null; }
}
async function apiGetBnefLatest(reportType = 'renewable_outlook') {
  try { return await hvFetch(`/benchmark/bnef/latest?report_type=${encodeURIComponent(reportType)}`); }
  catch { return null; }
}


/* ╔═══════════════════════════════════════════════════════════
   ║  §4  EXCEL PARSER (PF model upload)
   ╚═══════════════════════════════════════════════════════════ */

function hvOnFilePick() {
  const input = el('hv-file-input');
  if (!input || !input.files || !input.files.length) return;
  const file = input.files[0];
  HV.uploadedFile = file;
  setText('hv-file-name', file.name);
  const parseBtn = el('hv-parse-btn');
  const auditBtn = el('hv-audit-btn');
  if (parseBtn) parseBtn.disabled = false;
  if (auditBtn) auditBtn.disabled = false;
  setStatus(`File staged: ${file.name}`, 'idle');
}

async function hvParseModel() {
  if (!HV.uploadedFile) { hvToast('No file selected', 'warn'); return; }

  const btn = el('hv-parse-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Parsing…'; }
  setStatus('Parsing PF model...', 'loading');

  try {
    const resp = await apiParsePF(HV.uploadedFile);
    HV.excelParse = resp;

    if (resp && resp.inputs) {
      hvApplyParsedInputs(resp.inputs);
      const filled = Object.keys(resp.inputs).length;
      setStatus(`Parsed: ${filled} fields filled`, 'ok');
    } else {
      setStatus('Parse returned no inputs', 'warn');
    }

    if (resp && resp.warnings && resp.warnings.length) {
      console.warn('[HV] Parse warnings:', resp.warnings);
    }
  } catch (e) {
    console.error('[HV] Parse failed:', e);
    setStatus('Parse failed', 'err');
    hvToast(`Parse failed: ${e.message}`, 'err');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Upload & Parse'; }
  }
}

// 파싱 결과를 input field에 적용
function hvApplyParsedInputs(inputs) {
  // Project
  setVal('hv-pv-mwac',          inputs.pv_mwac);
  setVal('hv-pv-mwdc',          inputs.pv_mwdc);
  setVal('hv-bess-mw',          inputs.bess_mw);
  setVal('hv-bess-mwh',         inputs.bess_mwh);
  setVal('hv-capacity-factor',  inputs.capacity_factor);
  setVal('hv-life',             inputs.life);
  setVal('hv-cod-year',         inputs.cod_year);

  // CAPEX
  setVal('hv-capex-total',      inputs.capex_total);
  setVal('hv-pv-module',        inputs.pv_module);
  setVal('hv-pv-bos',           inputs.pv_bos);
  setVal('hv-bess-equip',       inputs.bess_equip);
  setVal('hv-bess-bos',         inputs.bess_bos);
  setVal('hv-epc-cont',         inputs.epc_cont);
  setVal('hv-owner-cost',       inputs.owner_cost);
  setVal('hv-intercon',         inputs.intercon);
  setVal('hv-dev-cost',         inputs.dev_cost);
  setVal('hv-dev-fee',          inputs.dev_fee);

  // OPEX
  setVal('hv-opex-total',       inputs.opex_total);
  setVal('hv-opex-esc',         inputs.opex_esc);
  setVal('hv-pv-om',            inputs.pv_om);
  setVal('hv-bess-om',          inputs.bess_om);
  setVal('hv-insurance',        inputs.insurance);
  setVal('hv-asset-mgmt',       inputs.asset_mgmt);

  // Revenue
  setVal('hv-ppa-price',        inputs.ppa_price);
  setVal('hv-ppa-term',         inputs.ppa_term);
  setVal('hv-ppa-esc',          inputs.ppa_esc);
  setVal('hv-toll-price',       inputs.toll_price);
  setVal('hv-toll-term',        inputs.toll_term);
  setVal('hv-toll-esc',         inputs.toll_esc);
  setVal('hv-merchant-tail',    inputs.merchant_tail);

  // Financing
  setVal('hv-dscr-contracted',  inputs.dscr_contracted);
  setVal('hv-dscr-merchant',    inputs.dscr_merchant);
  setVal('hv-int-rate',         inputs.int_rate);
  setVal('hv-loan-tenor',       inputs.loan_tenor);
  setVal('hv-tax-rate',         inputs.tax_rate);
  setVal('hv-debt-ratio',       inputs.debt_ratio);

  // Tax Credit
  if (inputs.credit_type === 'PTC') hvSetCredit('PTC');
  else hvSetCredit('ITC');
  setVal('hv-pv-itc',           inputs.pv_itc);
  setVal('hv-bess-itc',         inputs.bess_itc);
  setVal('hv-ptc-rate',         inputs.ptc_rate);
  setVal('hv-ptc-term',         inputs.ptc_term);
  setVal('hv-te-flip-y',        inputs.te_flip_y);
  setVal('hv-te-flip-t',        inputs.te_flip_t);
  setVal('hv-itc-elig',         inputs.itc_elig);
  setVal('hv-te-fee',           inputs.te_fee);
  setVal('hv-te-ratio',         inputs.te_ratio);

  // BESS Augmentation
  setVal('hv-aug-y1',           inputs.aug_y1);
  setVal('hv-aug-pct1',         inputs.aug_pct1);
  setVal('hv-aug-y2',           inputs.aug_y2);
  setVal('hv-aug-pct2',         inputs.aug_pct2);
}


/* ╔═══════════════════════════════════════════════════════════
   ║  §5  INPUT GATHERING & VALIDATION
   ╚═══════════════════════════════════════════════════════════ */

function hvGatherInputs() {
  const inputs = {
    // Project
    pv_mwac:          getVal('hv-pv-mwac'),
    pv_mwdc:          getVal('hv-pv-mwdc'),
    bess_mw:          getVal('hv-bess-mw'),
    bess_mwh:         getVal('hv-bess-mwh'),
    capacity_factor:  getVal('hv-capacity-factor'),
    life:             getVal('hv-life'),
    cod_year:         getVal('hv-cod-year'),

    // CAPEX
    capex_total:      getVal('hv-capex-total'),
    pv_module:        getVal('hv-pv-module'),
    pv_bos:           getVal('hv-pv-bos'),
    bess_equip:       getVal('hv-bess-equip'),
    bess_bos:         getVal('hv-bess-bos'),
    epc_cont:         getVal('hv-epc-cont'),
    owner_cost:       getVal('hv-owner-cost'),
    intercon:         getVal('hv-intercon'),
    dev_cost:         getVal('hv-dev-cost'),
    dev_fee:          getVal('hv-dev-fee'),

    // OPEX
    opex_total:       getVal('hv-opex-total'),
    opex_esc:         getVal('hv-opex-esc'),
    pv_om:            getVal('hv-pv-om'),
    bess_om:          getVal('hv-bess-om'),
    insurance:        getVal('hv-insurance'),
    asset_mgmt:       getVal('hv-asset-mgmt'),

    // Revenue
    ppa_price:        getVal('hv-ppa-price'),
    ppa_term:         getVal('hv-ppa-term'),
    ppa_esc:          getVal('hv-ppa-esc'),
    toll_price:       getVal('hv-toll-price'),
    toll_term:        getVal('hv-toll-term'),
    toll_esc:         getVal('hv-toll-esc'),
    merchant_tail:    getVal('hv-merchant-tail'),

    // Financing
    dscr_contracted:  getVal('hv-dscr-contracted'),
    dscr_merchant:    getVal('hv-dscr-merchant'),
    int_rate:         getVal('hv-int-rate'),
    loan_tenor:       getVal('hv-loan-tenor'),
    tax_rate:         getVal('hv-tax-rate'),
    debt_ratio:       getVal('hv-debt-ratio'),

    // Tax Credit
    credit_type:      el('hv-credit-itc') && el('hv-credit-itc').classList.contains('on') ? 'ITC' : 'PTC',
    pv_itc:           getVal('hv-pv-itc'),
    bess_itc:         getVal('hv-bess-itc'),
    ptc_rate:         getVal('hv-ptc-rate'),
    ptc_term:         getVal('hv-ptc-term'),
    te_flip_y:        getVal('hv-te-flip-y'),
    te_flip_t:        getVal('hv-te-flip-t'),
    itc_elig:         getVal('hv-itc-elig'),
    te_fee:           getVal('hv-te-fee'),
    te_ratio:         getVal('hv-te-ratio'),

    // BESS Augmentation
    aug_y1:           getVal('hv-aug-y1'),
    aug_pct1:         getVal('hv-aug-pct1'),
    aug_y2:           getVal('hv-aug-y2'),
    aug_pct2:         getVal('hv-aug-pct2'),

    // Meta
    project_id:       HV.project ? HV.project.id : null,
    project_type:     null,   // 자동 감지 후 채움
  };

  inputs.project_type = detectProjectType(inputs);
  return inputs;
}

function hvValidateInputs(inputs) {
  const errors = [];

  // PV 또는 BESS 중 하나는 필수
  const hasPV = (inputs.pv_mwac || 0) > 0;
  const hasBESS = (inputs.bess_mwh || 0) > 0;
  if (!hasPV && !hasBESS) errors.push('PV (MWac) 또는 BESS (MWh) 중 최소 하나 필요');

  // 필수 필드
  if (!inputs.life || inputs.life < 1)        errors.push('Project Life 필수');
  if (!inputs.cod_year)                        errors.push('COD Year 필수');
  if (!inputs.capex_total && !inputs.pv_module && !inputs.bess_equip)
    errors.push('CAPEX: Total 또는 Breakdown 필수');
  if (!inputs.ppa_price && !inputs.toll_price && !inputs.merchant_tail)
    errors.push('Revenue: PPA / Toll / Merchant 중 최소 하나 필요');
  if (!inputs.int_rate || !inputs.loan_tenor) errors.push('Financing: Interest Rate + Tenor 필수');

  return errors;
}


/* ╔═══════════════════════════════════════════════════════════
   ║  §6  CALCULATE FLOW (main)
   ╚═══════════════════════════════════════════════════════════ */

async function hvCalculate() {
  if (HV.isCalculating) return;

  // Gather + validate
  const inputs = hvGatherInputs();
  const errors = hvValidateInputs(inputs);
  if (errors.length) {
    setStatus(`Validation failed: ${errors.length} issue(s)`, 'err');
    hvToast(errors.join('\n'), 'err');
    return;
  }

  HV.isCalculating = true;
  HV.inputs = inputs;
  HV.projectType = inputs.project_type;

  const calcBtn = el('hv-calc-btn');
  if (calcBtn) { calcBtn.disabled = true; calcBtn.classList.add('loading'); }
  setCalcStatus('Calculating…');
  setStatus('Calculating IRR / Cash Flow...', 'loading');

  try {
    // 1) Threshold (type별 reference)
    const threshold = await apiGetThreshold(inputs.project_type);
    HV.threshold = threshold;

    // 2) Calculate (main engine call)
    const result = await apiCalculate(inputs);
    HV.result = result;

    // 3) Auto-save run (best-effort)
    if (HV.project && HV.project.id) {
      try {
        await apiSaveRun(HV.project.id, inputs, result);
      } catch (e) {
        console.warn('[HV] Save run failed (non-fatal):', e.message);
      }
    }

    // 4) Render all tabs (active is first)
    hvRenderOverview();
    hvRenderSensitivity();
    hvRenderCashFlow();
    await hvRefreshHistory();
    await hvRefreshBenchmark();

    setCalcStatus(`Done · ${fmtDateTime(new Date().toISOString())}`);
    setStatus('Calculation complete', 'ok');
  } catch (e) {
    console.error('[HV] Calculate failed:', e);
    setStatus(`Failed: ${e.message}`, 'err');
    setCalcStatus('Failed');
    hvToast(`Calculation failed: ${e.message}`, 'err');
  } finally {
    HV.isCalculating = false;
    if (calcBtn) { calcBtn.disabled = false; calcBtn.classList.remove('loading'); }
  }
}


/* ╔═══════════════════════════════════════════════════════════
   ║  §7  RENDERER — Overview tab
   ╚═══════════════════════════════════════════════════════════ */

function hvRenderOverview() {
  const r = HV.result;
  const t = HV.threshold;
  const ins = HV.inputs;
  if (!r) return;

  // ── Reference Comparison 2 cards ──
  const sponsorIRR = r.sponsor_irr_after_tax;          // %, Lev AT
  const projectIRR = r.project_irr;                     // %, Unlev Pre-Tax

  setText('hv-ref-sponsor-value',   sponsorIRR != null ? sponsorIRR.toFixed(1) : '—');
  setText('hv-ref-project-value',   projectIRR != null ? projectIRR.toFixed(1) : '—');

  if (t) {
    const refSp = t.sponsor_irr_hurdle_after_tax;
    const refPr = t.project_irr_reference;

    setText('hv-ref-sponsor-baseline', `Reference: ${fmtPct(refSp)}${t._fallback ? ' *' : ''}`);
    setText('hv-ref-project-baseline', `Reference: ${fmtPct(refPr)}${t._fallback ? ' *' : ''}`);

    if (sponsorIRR != null && refSp != null) {
      const d = sponsorIRR - refSp;
      const node = el('hv-ref-sponsor-delta');
      if (node) {
        node.textContent = fmtDelta(d, 2, 'pp');
        node.className = `hv-ref-delta ${d > 0 ? 'up' : d < 0 ? 'down' : ''}`;
      }
    }
    if (projectIRR != null && refPr != null) {
      const d = projectIRR - refPr;
      const node = el('hv-ref-project-delta');
      if (node) {
        node.textContent = fmtDelta(d, 2, 'pp');
        node.className = `hv-ref-delta ${d > 0 ? 'up' : d < 0 ? 'down' : ''}`;
      }
    }
  }

  // ── Project Type bar ──
  setText('hv-type-value', projectTypeLabel(HV.projectType));

  // ── Returns Detail (3 primary + 3 advanced) ──
  setText('hv-ret-lev-at',    sponsorIRR != null ? `${sponsorIRR.toFixed(1)}%` : '—');
  setText('hv-ret-unlev-at',  r.unlev_irr_after_tax != null ? `${r.unlev_irr_after_tax.toFixed(1)}%` : '—');
  setText('hv-ret-proj',      projectIRR != null ? `${projectIRR.toFixed(1)}%` : '—');
  setText('hv-ret-lev-pre',   r.sponsor_irr_pre_tax != null ? `${r.sponsor_irr_pre_tax.toFixed(1)}%` : '—');
  setText('hv-ret-after-nol', r.sponsor_irr_after_nol != null ? `${r.sponsor_irr_after_nol.toFixed(1)}%` : '—');
  setText('hv-ret-npv',       r.sponsor_npv != null ? fmtMoneyAuto(r.sponsor_npv * 1e6) : '—');

  // ── Capital Structure ──
  const cap = r.capital_stack || {};
  const total = (cap.debt || 0) + (cap.tax_equity || 0) + (cap.sponsor_equity || 0);
  setText('hv-cap-total-sub', total > 0 ? `Total: ${fmtMoney(total, 1)}` : '—');

  if (total > 0) {
    const dPct = (cap.debt || 0) / total * 100;
    const tPct = (cap.tax_equity || 0) / total * 100;
    const ePct = (cap.sponsor_equity || 0) / total * 100;

    const segs = $$('#hv-capstack .hv-cs-seg');
    if (segs[0]) { segs[0].style.width = `${dPct}%`; segs[0].querySelector('.hv-cs-seg-pct').textContent = dPct >= 8 ? `${dPct.toFixed(0)}%` : ''; }
    if (segs[1]) { segs[1].style.width = `${tPct}%`; segs[1].querySelector('.hv-cs-seg-pct').textContent = tPct >= 8 ? `${tPct.toFixed(0)}%` : ''; }
    if (segs[2]) { segs[2].style.width = `${ePct}%`; segs[2].querySelector('.hv-cs-seg-pct').textContent = ePct >= 8 ? `${ePct.toFixed(0)}%` : ''; }

    setText('hv-cs-debt', `${fmtMoney(cap.debt || 0, 1)} (${dPct.toFixed(1)}%)`);
    setText('hv-cs-te',   `${fmtMoney(cap.tax_equity || 0, 1)} (${tPct.toFixed(1)}%)`);
    setText('hv-cs-eq',   `${fmtMoney(cap.sponsor_equity || 0, 1)} (${ePct.toFixed(1)}%)`);
  }

  // ── Deal Terms ──
  setText('hv-dt-ppa',   ins.ppa_price ? `$${ins.ppa_price.toFixed(1)}/MWh × ${ins.ppa_term || '—'}yr · ${ins.ppa_esc || 0}% esc` : '—');
  setText('hv-dt-toll',  ins.toll_price ? `$${ins.toll_price.toFixed(2)}/kW-mo × ${ins.toll_term || '—'}yr` : '—');
  setText('hv-dt-debt',  `${fmtMoney(cap.debt || 0, 1)} @ ${ins.int_rate || '—'}% / ${ins.loan_tenor || '—'}yr`);
  setText('hv-dt-flip',  `${ins.te_flip_y || '—'}% by Y${ins.te_flip_t || '—'}`);

  // ── Project Specs ──
  const sizeStr = [
    (ins.pv_mwac ? `${ins.pv_mwac} MWac PV` : null),
    (ins.bess_mwh ? `${ins.bess_mw || (ins.bess_mwh / 4)} MW / ${ins.bess_mwh} MWh BESS` : null),
  ].filter(Boolean).join(' + ') || '—';
  setText('hv-ps-size',   sizeStr);
  setText('hv-ps-cod',    ins.cod_year ? `Q4 ${ins.cod_year}` : '—');
  setText('hv-ps-credit', ins.credit_type === 'PTC'
    ? `PTC $${ins.ptc_rate}/kWh × ${ins.ptc_term}yr`
    : `ITC PV ${ins.pv_itc || '—'}% / BESS ${ins.bess_itc || '—'}%`);
  setText('hv-ps-ebitda', r.ebitda_y1 != null ? fmtMoney(r.ebitda_y1, 1) : '—');
  setText('hv-ps-dev-margin', r.dev_margin != null ? fmtMoney(r.dev_margin, 1) : '—');
}


/* ╔═══════════════════════════════════════════════════════════
   ║  §8  RENDERER — Sensitivity tab
   ╚═══════════════════════════════════════════════════════════ */

function hvRenderSensitivity() {
  const r = HV.result;
  if (!r) return;

  hvRenderTornado();
  hvRenderTwoWayMatrix();
  hvUpdateSliderResults();   // initial 0% state
}

// 백엔드 응답에 sens_tornado 필드 있으면 그거 사용,
// 없으면 client-side에서 ±20% perturbation으로 추정 (간이)
function hvRenderTornado() {
  const r = HV.result;
  const baseIRR = r.sponsor_irr_after_tax;
  const tornado = el('hv-tornado');
  if (!tornado) return;

  // 백엔드가 sens_tornado 제공 시 그거 사용
  let rows;
  if (r.sens_tornado && Array.isArray(r.sens_tornado)) {
    rows = r.sens_tornado.map(s => ({
      key: s.key,
      label: s.label || s.key,
      neg: s.delta_neg,   // IRR delta at -20%
      pos: s.delta_pos,   // IRR delta at +20%
    }));
  } else {
    // Client-side stub: linear elasticity 추정 — 정확도 X (UI 동작 검증용)
    rows = HV_TORNADO_VARS.map(v => ({
      key: v.key,
      label: v.label,
      neg: -1.0 * (Math.random() * 1.5 + 0.5),   // placeholder
      pos: +1.0 * (Math.random() * 1.5 + 0.5),
    }));
    rows = []; // placeholder 안 보여주는 게 나음 — 빈 상태로
  }

  if (!rows.length) {
    tornado.innerHTML = `<div class="hv-empty-inline">Sensitivity data not yet available — backend will provide sens_tornado in result</div>`;
    return;
  }

  // sort by absolute impact
  rows.sort((a, b) => (Math.abs(b.neg) + Math.abs(b.pos)) - (Math.abs(a.neg) + Math.abs(a.pos)));

  const maxImpact = Math.max(...rows.map(r => Math.max(Math.abs(r.neg), Math.abs(r.pos))));

  tornado.innerHTML = rows.map(row => {
    const negPct = Math.abs(row.neg) / maxImpact * 100;
    const posPct = Math.abs(row.pos) / maxImpact * 100;
    return `
      <div class="hv-tornado-row">
        <div class="hv-tornado-label">${row.label}</div>
        <div class="hv-tornado-bar-neg"><div class="hv-tornado-fill-neg" style="width:${negPct}%"></div></div>
        <div class="hv-tornado-bar-pos"><div class="hv-tornado-fill-pos" style="width:${posPct}%"></div></div>
        <div class="hv-tornado-impact">${row.neg.toFixed(2)}/+${row.pos.toFixed(2)}</div>
      </div>
    `;
  }).join('');
}

function hvRenderTwoWayMatrix() {
  const r = HV.result;
  const matrix = r.sens_matrix_ppa_capex;   // 2D array [ppa_idx][capex_idx]
  const tbody = el('hv-sens-matrix') ? el('hv-sens-matrix').querySelector('tbody') : null;
  if (!tbody) return;

  if (!matrix || !Array.isArray(matrix)) {
    tbody.innerHTML = `<tr><td colspan="6" class="hv-empty-inline">Two-way matrix not yet available</td></tr>`;
    return;
  }

  tbody.innerHTML = HV_MATRIX_DELTAS.map((ppaD, i) => {
    const cells = HV_MATRIX_DELTAS.map((capexD, j) => {
      const v = matrix[i] && matrix[i][j];
      const isBase = (ppaD === 0 && capexD === 0);
      const cls = isBase ? 'hv-sens-cell-base' : '';
      return `<td class="${cls}">${v != null ? `${v.toFixed(1)}%` : '—'}</td>`;
    }).join('');
    const ppaLbl = ppaD === 0 ? 'Base' : (ppaD > 0 ? `+${ppaD}%` : `${ppaD}%`);
    return `<tr><th>PPA ${ppaLbl}</th>${cells}</tr>`;
  }).join('');
}

function hvUpdateSliderResults() {
  const r = HV.result;
  if (!r) return;
  const baseIRR = r.sponsor_irr_after_tax;
  if (baseIRR == null) return;

  const sliders = [
    { id: 'ppa',    label: 'ppa_price',   elasticity: r.elasticity_ppa    || 0.10 },
    { id: 'capex',  label: 'capex_total', elasticity: r.elasticity_capex  || -0.08 },
    { id: 'devfee', label: 'dev_fee',     elasticity: r.elasticity_devfee || -0.02 },
    { id: 'int',    label: 'int_rate',    elasticity: r.elasticity_int    || -0.04 },
  ];

  sliders.forEach(s => {
    const slider = el(`hv-slider-${s.id}`);
    if (!slider) return;
    const pct = Number(slider.value) || 0;
    setText(`hv-slider-${s.id}-pct`, `${pct >= 0 ? '+' : ''}${pct}%`);

    // Linear approx: new_irr ≈ base + (pct × elasticity_pp_per_pct)
    const newIRR = baseIRR + (pct * s.elasticity);
    setText(`hv-slider-${s.id}-result`, `IRR: ${newIRR.toFixed(1)}%`);
  });
}


/* ╔═══════════════════════════════════════════════════════════
   ║  §9  RENDERER — Cash Flow tab
   ╚═══════════════════════════════════════════════════════════ */

function hvRenderCashFlow() {
  const r = HV.result;
  if (!r) return;

  hvRenderPhaseSummary();
  hvRenderStackedChart();
  hvRenderCumulativeChart();
  hvRenderCFTable();
}

function hvRenderPhaseSummary() {
  const r = HV.result;
  const ph = r.phase_summary || {};

  setText('hv-phase1-cf', ph.p1_cf != null ? fmtMoney(ph.p1_cf, 1) : '—');
  setText('hv-phase2-cf', ph.p2_cf != null ? fmtMoney(ph.p2_cf, 1) : '—');
  setText('hv-phase3-cf', ph.p3_cf != null ? fmtMoney(ph.p3_cf, 1) : '—');
  setText('hv-phase4-cf', ph.p4_cf != null ? fmtMoney(ph.p4_cf, 1) : '—');
}

// SVG stacked area chart — 의존성 X
function hvRenderStackedChart() {
  const r = HV.result;
  const wrap = el('hv-cf-stacked');
  if (!wrap) return;

  const cf = r.cash_flow;
  if (!cf || !Array.isArray(cf) || !cf.length) {
    wrap.innerHTML = `<div class="hv-empty-inline">No cash flow data</div>`;
    return;
  }

  // dimensions
  const W = wrap.clientWidth || 700;
  const H = 260;
  const M = { top: 16, right: 16, bottom: 28, left: 50 };
  const w = W - M.left - M.right;
  const h = H - M.top - M.bottom;

  // series: revenue (positive), opex/debt/tax (negative stacked)
  // each year row from cf[]: { year, revenue, opex, debt_service, tax, sponsor_cf }
  const years = cf.map(d => d.year);
  const yMax = Math.max(...cf.map(d => Math.max(d.revenue || 0, (d.opex || 0) + (d.debt_service || 0) + (d.tax || 0))));
  const yMin = Math.min(0, Math.min(...cf.map(d => -((d.opex || 0) + (d.debt_service || 0) + (d.tax || 0)))));

  const x = i => M.left + (w * i / Math.max(1, cf.length - 1));
  const y = v => M.top + h - (h * (v - yMin) / Math.max(1e-6, yMax - yMin));

  const yearTicks = [0, Math.floor(cf.length / 4), Math.floor(cf.length / 2), Math.floor(3 * cf.length / 4), cf.length - 1];

  // Revenue line (top, positive area)
  const revArea = `M${x(0)},${y(0)} ` +
    cf.map((d, i) => `L${x(i)},${y(d.revenue || 0)}`).join(' ') +
    ` L${x(cf.length - 1)},${y(0)} Z`;

  // OPEX area (negative, stacked)
  const opexArea = `M${x(0)},${y(0)} ` +
    cf.map((d, i) => `L${x(i)},${y(-(d.opex || 0))}`).join(' ') +
    ` L${x(cf.length - 1)},${y(0)} Z`;

  // Debt service area (negative, stacked below opex)
  const debtArea = `M${x(0)},${y(0)} ` +
    cf.map((d, i) => `L${x(i)},${y(-((d.opex || 0) + (d.debt_service || 0)))}`).join(' ') +
    cf.map((d, i) => `L${x(cf.length - 1 - i)},${y(-((cf[cf.length - 1 - i].opex || 0)))}`).reverse().join(' ') +
    ` Z`;

  const sponsorLine = `M ` + cf.map((d, i) => `${i === 0 ? '' : 'L'}${x(i)},${y(d.sponsor_cf || 0)}`).join(' ');
  const zeroLine = `M${M.left},${y(0)} L${M.left + w},${y(0)}`;

  const svg = `
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" style="width:100%;height:${H}px;display:block">
      <defs>
        <pattern id="hv-grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#25292f" stroke-width="0.5"/>
        </pattern>
      </defs>
      <rect x="${M.left}" y="${M.top}" width="${w}" height="${h}" fill="url(#hv-grid)"/>

      <path d="${revArea}" fill="rgba(16, 185, 129, 0.30)" stroke="#10b981" stroke-width="1.5"/>
      <path d="${opexArea}" fill="rgba(245, 158, 11, 0.30)" stroke="#f59e0b" stroke-width="1.2"/>
      <path d="${sponsorLine}" fill="none" stroke="#4a8eff" stroke-width="2"/>

      <path d="${zeroLine}" stroke="#454a52" stroke-width="0.5"/>

      ${yearTicks.map(i => i < cf.length ? `
        <text x="${x(i)}" y="${H - 8}" fill="#6b7280" font-size="10" text-anchor="middle">Y${cf[i].year}</text>
      ` : '').join('')}

      <text x="${M.left - 6}" y="${y(yMax)}" fill="#6b7280" font-size="10" text-anchor="end" dy="3">${fmtN(yMax, 0)}</text>
      <text x="${M.left - 6}" y="${y(0)}" fill="#6b7280" font-size="10" text-anchor="end" dy="3">0</text>
      <text x="${M.left - 6}" y="${y(yMin)}" fill="#6b7280" font-size="10" text-anchor="end" dy="3">${fmtN(yMin, 0)}</text>

      <g transform="translate(${M.left + 8}, ${M.top + 8})">
        <rect x="0" y="0" width="10" height="10" fill="rgba(16, 185, 129, 0.5)" stroke="#10b981"/>
        <text x="14" y="9" fill="#a8acb3" font-size="10">Revenue</text>
        <rect x="80" y="0" width="10" height="10" fill="rgba(245, 158, 11, 0.5)" stroke="#f59e0b"/>
        <text x="94" y="9" fill="#a8acb3" font-size="10">OPEX</text>
        <line x1="146" y1="5" x2="156" y2="5" stroke="#4a8eff" stroke-width="2"/>
        <text x="160" y="9" fill="#a8acb3" font-size="10">Sponsor CF</text>
      </g>
    </svg>
  `;
  wrap.innerHTML = svg;
}

function hvRenderCumulativeChart() {
  const r = HV.result;
  const wrap = el('hv-cf-cumulative');
  if (!wrap) return;

  const cf = r.cash_flow;
  if (!cf || !cf.length) {
    wrap.innerHTML = `<div class="hv-empty-inline">No cash flow data</div>`;
    return;
  }

  // cumulative sponsor cf
  let cum = 0;
  const points = cf.map((d, i) => { cum += (d.sponsor_cf || 0); return { y: d.year, cum, raw: d.sponsor_cf || 0 }; });

  const W = wrap.clientWidth || 700;
  const H = 240;
  const M = { top: 16, right: 16, bottom: 28, left: 60 };
  const w = W - M.left - M.right;
  const h = H - M.top - M.bottom;

  const yMin = Math.min(0, ...points.map(p => p.cum));
  const yMax = Math.max(0, ...points.map(p => p.cum));
  const x = i => M.left + (w * i / Math.max(1, points.length - 1));
  const y = v => M.top + h - (h * (v - yMin) / Math.max(1e-6, yMax - yMin));

  // breakeven year (first year cum >= 0 after construction)
  let breakeven = -1;
  for (let i = 1; i < points.length; i++) {
    if (points[i - 1].cum < 0 && points[i].cum >= 0) { breakeven = i; break; }
  }

  const path = `M ` + points.map((p, i) => `${i === 0 ? '' : 'L'}${x(i)},${y(p.cum)}`).join(' ');
  const area = path + ` L${x(points.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;

  const yearTicks = [0, Math.floor(points.length / 4), Math.floor(points.length / 2), Math.floor(3 * points.length / 4), points.length - 1];

  const svg = `
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" style="width:100%;height:${H}px;display:block">
      <defs>
        <pattern id="hv-grid2" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#25292f" stroke-width="0.5"/>
        </pattern>
      </defs>
      <rect x="${M.left}" y="${M.top}" width="${w}" height="${h}" fill="url(#hv-grid2)"/>

      <path d="${area}" fill="rgba(74, 142, 255, 0.20)"/>
      <path d="${path}" fill="none" stroke="#4a8eff" stroke-width="2"/>

      <line x1="${M.left}" y1="${y(0)}" x2="${M.left + w}" y2="${y(0)}" stroke="#454a52" stroke-width="0.5"/>

      ${breakeven > 0 ? `
        <line x1="${x(breakeven)}" y1="${M.top}" x2="${x(breakeven)}" y2="${M.top + h}" stroke="#10b981" stroke-width="1" stroke-dasharray="3,3"/>
        <text x="${x(breakeven) + 4}" y="${M.top + 12}" fill="#10b981" font-size="10">Breakeven Y${points[breakeven].y}</text>
      ` : ''}

      ${yearTicks.map(i => i < points.length ? `
        <text x="${x(i)}" y="${H - 8}" fill="#6b7280" font-size="10" text-anchor="middle">Y${points[i].y}</text>
      ` : '').join('')}

      <text x="${M.left - 6}" y="${y(yMax)}" fill="#6b7280" font-size="10" text-anchor="end" dy="3">${fmtMoneyAuto(yMax * 1e6)}</text>
      <text x="${M.left - 6}" y="${y(0)}" fill="#6b7280" font-size="10" text-anchor="end" dy="3">0</text>
      <text x="${M.left - 6}" y="${y(yMin)}" fill="#6b7280" font-size="10" text-anchor="end" dy="3">${fmtMoneyAuto(yMin * 1e6)}</text>
    </svg>
  `;
  wrap.innerHTML = svg;

  // Milestones
  const mil = el('hv-cf-milestones');
  if (mil) {
    const ins = HV.inputs;
    const milestones = [];
    if (ins && ins.te_flip_t) milestones.push({ label: `TE Flip Y${ins.te_flip_t}` });
    if (ins && ins.loan_tenor) milestones.push({ label: `Loan Maturity Y${ins.loan_tenor}` });
    if (ins && ins.ppa_term) milestones.push({ label: `PPA End Y${ins.ppa_term}` });
    if (breakeven > 0) milestones.push({ label: `Breakeven Y${points[breakeven].y}` });
    if (ins && ins.life) milestones.push({ label: `Project End Y${ins.life}` });

    mil.innerHTML = milestones.map(m => `
      <div class="hv-cf-milestone">
        <span class="hv-cf-milestone-dot"></span>
        <span>${m.label}</span>
      </div>
    `).join('');
  }
}

function hvRenderCFTable() {
  const r = HV.result;
  const tbody = el('hv-cf-table-body');
  if (!tbody) return;

  const cf = r.cash_flow;
  if (!cf || !cf.length) {
    tbody.innerHTML = `<tr><td colspan="9" class="hv-empty-inline">No data</td></tr>`;
    return;
  }

  tbody.innerHTML = cf.map(d => {
    let rowCls = '';
    if (d.year === 0)             rowCls = 'hv-cf-row-construction';
    else if (d.year === (HV.inputs && HV.inputs.te_flip_t)) rowCls = 'hv-cf-row-flip';

    return `
      <tr class="${rowCls}">
        <td>Y${d.year}</td>
        <td>${fmtMoney(d.revenue || 0, 1)}</td>
        <td>${fmtMoney(d.opex || 0, 1)}</td>
        <td>${fmtMoney(d.ebitda || 0, 1)}</td>
        <td>${fmtMoney(d.debt_service || 0, 1)}</td>
        <td>${fmtMoney(d.tax || 0, 1)}</td>
        <td>${fmtMoney(d.cfads || 0, 1)}</td>
        <td>${fmtMoney(d.sponsor_cf || 0, 1)}</td>
        <td>${d.dscr != null ? d.dscr.toFixed(2) : '—'}</td>
      </tr>
    `;
  }).join('');
}


/* ╔═══════════════════════════════════════════════════════════
   ║  §10  RENDERER — History tab
   ╚═══════════════════════════════════════════════════════════ */

async function hvRefreshHistory() {
  if (!HV.project || !HV.project.id) {
    el('hv-history-project') && (el('hv-history-project').innerHTML = `<div class="hv-empty-inline">Select a project to see history</div>`);
    el('hv-history-threshold') && (el('hv-history-threshold').innerHTML = `<div class="hv-empty-inline">No changes yet</div>`);
    return;
  }

  // Project run history
  try {
    const runs = await apiGetRuns(HV.project.id, 20);
    HV.history.project = Array.isArray(runs) ? runs : [];
  } catch (e) {
    console.warn('[HV] Run history fetch failed:', e.message);
    HV.history.project = [];
  }

  // Threshold audit
  try {
    const audit = await apiGetThresholdAudit(HV.projectType || 'pv_only');
    HV.history.threshold = Array.isArray(audit) ? audit : [];
  } catch (e) {
    console.warn('[HV] Threshold audit fetch failed:', e.message);
    HV.history.threshold = [];
  }

  hvRenderHistory();
}

function hvRenderHistory() {
  // Project Calculation history
  const pNode = el('hv-history-project');
  if (pNode) {
    const runs = HV.history.project;
    if (!runs.length) {
      pNode.innerHTML = `<div class="hv-empty-inline">No calculation runs yet</div>`;
    } else {
      pNode.innerHTML = runs.slice(0, 15).map((run, i) => {
        const time = fmtDateTime(run.run_at || run.created_at);
        const irr = run.result && run.result.sponsor_irr_after_tax;
        const prev = i + 1 < runs.length ? runs[i + 1] : null;
        const prevIrr = prev && prev.result && prev.result.sponsor_irr_after_tax;
        let diffCls = 'neutral', diffTxt = '—';
        if (irr != null && prevIrr != null) {
          const d = irr - prevIrr;
          diffCls = d > 0 ? 'up' : d < 0 ? 'down' : 'neutral';
          diffTxt = (d > 0 ? '+' : '') + d.toFixed(2) + 'pp';
        } else if (irr != null && i === runs.length - 1) {
          diffTxt = 'Initial';
        }
        const detail = run.inputs ?
          [
            run.inputs.ppa_price ? `PPA $${run.inputs.ppa_price}` : null,
            run.inputs.capex_total ? `CAPEX ${fmtMoney(run.inputs.capex_total, 0)}` : null,
            run.inputs.dev_fee ? `Dev ${run.inputs.dev_fee}¢` : null,
          ].filter(Boolean).join(' · ') : '';

        return `
          <div class="hv-history-item">
            <div class="hv-history-time">${time}</div>
            <div class="hv-history-content">
              <div class="hv-history-main">Sponsor IRR: ${irr != null ? irr.toFixed(2) : '—'}%</div>
              ${detail ? `<div class="hv-history-detail">${detail}</div>` : ''}
            </div>
            <div class="hv-history-diff ${diffCls}">${diffTxt}</div>
          </div>
        `;
      }).join('');
    }
  }

  // Threshold change history
  const tNode = el('hv-history-threshold');
  if (tNode) {
    const audits = HV.history.threshold;
    if (!audits.length) {
      tNode.innerHTML = `<div class="hv-empty-inline">No threshold changes yet</div>`;
    } else {
      tNode.innerHTML = audits.slice(0, 15).map(a => {
        const time = fmtDateTime(a.changed_at);
        const oldV = a.old_value, newV = a.new_value;
        const diff = (typeof oldV === 'number' && typeof newV === 'number') ? newV - oldV : null;
        let diffCls = 'neutral', diffTxt = '—';
        if (diff != null) {
          diffCls = diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral';
          diffTxt = (diff > 0 ? '+' : '') + diff.toFixed(2);
        }
        return `
          <div class="hv-history-item">
            <div class="hv-history-time">${time}</div>
            <div class="hv-history-content">
              <div class="hv-history-main">${a.field || 'field'}: ${oldV} → ${newV}</div>
              <div class="hv-history-detail">${a.changed_by || '—'} · ${a.reason || ''}</div>
            </div>
            <div class="hv-history-diff ${diffCls}">${diffTxt}</div>
          </div>
        `;
      }).join('');
    }
  }
}


/* ╔═══════════════════════════════════════════════════════════
   ║  §11  RENDERER — Benchmark tab
   ╚═══════════════════════════════════════════════════════════ */

async function hvRefreshBenchmark() {
  // Fetch all 3 sources in parallel (best-effort)
  const [peer, lt, bnef] = await Promise.all([
    apiGetPeerIrr(),
    apiGetLevelTenLatest(),
    apiGetBnefLatest('renewable_outlook'),
  ]);
  HV.benchmark = { peer, levelten: lt, bnef };
  hvRenderBenchmark();
}

function hvRenderBenchmark() {
  hvRenderBenchmarkSummary();
  hvRenderInternalPeer();
  hvRenderLevelTen();
  hvRenderBnef();
}

function hvRenderBenchmarkSummary() {
  const node = el('hv-bm-summary');
  if (!node) return;

  const r = HV.result;
  if (!r) {
    node.innerHTML = `<div class="hv-empty-inline">Run Calculation to see benchmark match</div>`;
    return;
  }

  const ppa = HV.inputs && HV.inputs.ppa_price;
  const lt = HV.benchmark.levelten;
  const ltAvg = lt && lt.solar_continental && lt.solar_continental.p25;

  let summary = `Project Sponsor IRR ${fmtPct(r.sponsor_irr_after_tax)}`;
  if (ppa && ltAvg) {
    const diff = ppa - ltAvg;
    summary += ` · PPA ${fmtMoney(ppa, 1, '')}/MWh vs LevelTen P25 ${fmtMoney(ltAvg, 1, '')}/MWh (${diff > 0 ? '+' : ''}${diff.toFixed(1)})`;
  }
  node.classList.add('hv-bm-summary-active');
  node.innerHTML = summary;
}

function hvRenderInternalPeer() {
  const wrap = el('hv-bm-peer');
  if (!wrap) return;

  const peer = HV.benchmark.peer;
  if (!peer || !Array.isArray(peer) || !peer.length) {
    wrap.innerHTML = `<div class="hv-empty-inline">No peer data available</div>`;
    return;
  }

  // Distribution histogram (simple SVG)
  const irrs = peer.map(p => p.sponsor_irr_after_tax).filter(v => v != null);
  if (!irrs.length) { wrap.innerHTML = `<div class="hv-empty-inline">Peer data has no IRR values</div>`; return; }

  const myIRR = HV.result && HV.result.sponsor_irr_after_tax;
  const minIRR = Math.min(...irrs, myIRR != null ? myIRR : Infinity);
  const maxIRR = Math.max(...irrs, myIRR != null ? myIRR : -Infinity);
  const range = maxIRR - minIRR || 1;

  // bin into 8 buckets
  const bins = 8;
  const buckets = Array(bins).fill(0);
  irrs.forEach(v => {
    const idx = Math.min(bins - 1, Math.floor((v - minIRR) / range * bins));
    buckets[idx]++;
  });
  const maxBucket = Math.max(...buckets, 1);

  const W = wrap.clientWidth || 700;
  const H = 160;
  const M = { top: 10, right: 16, bottom: 30, left: 30 };
  const w = W - M.left - M.right;
  const h = H - M.top - M.bottom;

  const barW = w / bins * 0.85;
  const myX = myIRR != null ? M.left + ((myIRR - minIRR) / range * w) : null;

  const svg = `
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" style="width:100%;height:${H}px;display:block">
      ${buckets.map((c, i) => {
        const bx = M.left + (i / bins) * w + (w / bins - barW) / 2;
        const bh = (c / maxBucket) * h;
        return `<rect x="${bx}" y="${M.top + h - bh}" width="${barW}" height="${bh}" fill="#4a8eff" opacity="0.5"/>`;
      }).join('')}
      <line x1="${M.left}" y1="${M.top + h}" x2="${M.left + w}" y2="${M.top + h}" stroke="#454a52" stroke-width="0.5"/>

      ${myX != null ? `
        <line x1="${myX}" y1="${M.top}" x2="${myX}" y2="${M.top + h}" stroke="#10b981" stroke-width="2"/>
        <text x="${myX + 4}" y="${M.top + 12}" fill="#10b981" font-size="10">This: ${myIRR.toFixed(1)}%</text>
      ` : ''}

      <text x="${M.left}" y="${H - 8}" fill="#6b7280" font-size="10">${minIRR.toFixed(1)}%</text>
      <text x="${M.left + w}" y="${H - 8}" fill="#6b7280" font-size="10" text-anchor="end">${maxIRR.toFixed(1)}%</text>
      <text x="${M.left + w / 2}" y="${H - 8}" fill="#a8acb3" font-size="10" text-anchor="middle">N=${irrs.length} peer projects</text>
    </svg>
  `;
  wrap.innerHTML = svg;
}

function hvRenderLevelTen() {
  const lt = HV.benchmark.levelten;
  const meta = el('hv-bm-lt-meta');
  if (meta) meta.textContent = lt && lt.period ? `${lt.period} · uploaded ${fmtDate(lt.uploaded_at)}` : 'No data uploaded';

  // ISO table
  const isoTable = el('hv-bm-lt-iso');
  if (isoTable) {
    const tbody = isoTable.querySelector('tbody');
    const isoData = lt && lt.solar_iso;
    if (!isoData || !Array.isArray(isoData) || !isoData.length) {
      tbody.innerHTML = `<tr><td colspan="5" class="hv-empty-inline">No data</td></tr>`;
    } else {
      const myPpa = HV.inputs && HV.inputs.ppa_price;
      const myIso = HV.project && HV.project.iso;
      tbody.innerHTML = isoData.map(row => {
        const isMine = myIso && row.iso === myIso;
        return `
          <tr>
            <td>${row.iso || '—'}</td>
            <td>${fmtMoney(row.p25 || 0, 1, '')}</td>
            <td>${row.qoq_pct != null ? `${row.qoq_pct >= 0 ? '+' : ''}${row.qoq_pct.toFixed(1)}%` : '—'}</td>
            <td>${row.yoy_pct != null ? `${row.yoy_pct >= 0 ? '+' : ''}${row.yoy_pct.toFixed(1)}%` : '—'}</td>
            <td class="${isMine ? 'hv-bm-this' : ''}">${isMine && myPpa ? fmtMoney(myPpa, 1, '') : '—'}</td>
          </tr>
        `;
      }).join('');
    }
  }

  // Continental P10-P90 percentile bar
  const cont = el('hv-bm-lt-continental');
  if (cont) {
    const c = lt && lt.solar_continental;
    if (!c || c.p10 == null) {
      cont.innerHTML = `<div class="hv-empty-inline">No data</div>`;
    } else {
      const myPpa = HV.inputs && HV.inputs.ppa_price;
      const lo = c.p10, hi = c.p90;
      const range = hi - lo || 1;
      const p25Pct = ((c.p25 - lo) / range) * 100;
      const p75Pct = ((c.p75 - lo) / range) * 100;
      const myPct = myPpa != null ? clamp(((myPpa - lo) / range) * 100, 0, 100) : null;
      cont.innerHTML = `
        <div class="hv-bm-pct-track">
          <div class="hv-bm-pct-band" style="left:${p25Pct}%;width:${p75Pct - p25Pct}%"></div>
          ${myPct != null ? `<div class="hv-bm-pct-marker" style="left:${myPct}%"></div>` : ''}
        </div>
        <div class="hv-bm-pct-labels">
          <span>P10: $${lo.toFixed(1)}</span>
          <span>P25: $${c.p25.toFixed(1)}</span>
          <span>P50: $${c.p50 != null ? c.p50.toFixed(1) : '—'}</span>
          <span>P75: $${c.p75.toFixed(1)}</span>
          <span>P90: $${hi.toFixed(1)}</span>
        </div>
        ${myPpa != null ? `<div style="margin-top:8px;font-size:12px;color:#a8acb3">This project PPA: <span style="color:#4a8eff;font-weight:600">$${myPpa.toFixed(1)}/MWh</span></div>` : ''}
      `;
    }
  }

  // Hub-level table (filtered by project ISO)
  const hubName = el('hv-bm-lt-iso-name');
  const hubTable = el('hv-bm-lt-hub');
  if (hubName && hubTable) {
    const projIso = HV.project && HV.project.iso;
    hubName.textContent = projIso || '—';
    const tbody = hubTable.querySelector('tbody');
    const hubs = lt && lt.solar_hub;
    if (!hubs || !Array.isArray(hubs) || !projIso) {
      tbody.innerHTML = `<tr><td colspan="3" class="hv-empty-inline">${projIso ? 'No hub data' : 'Select project ISO'}</td></tr>`;
    } else {
      const filtered = hubs.filter(h => h.iso === projIso);
      if (!filtered.length) {
        tbody.innerHTML = `<tr><td colspan="3" class="hv-empty-inline">No hubs in ${projIso}</td></tr>`;
      } else {
        const myPpa = HV.inputs && HV.inputs.ppa_price;
        tbody.innerHTML = filtered.map(h => `
          <tr>
            <td>${h.hub || '—'}</td>
            <td>${fmtMoney(h.p25 || 0, 1, '')}</td>
            <td class="hv-bm-this">${myPpa ? fmtMoney(myPpa, 1, '') : '—'}</td>
          </tr>
        `).join('');
      }
    }
  }

  // Avg PPA term
  const term = el('hv-bm-lt-term');
  const termThis = el('hv-bm-lt-term-this');
  if (term) term.textContent = lt && lt.avg_solar_term_yrs ? `${lt.avg_solar_term_yrs.toFixed(1)} yr` : '—';
  if (termThis) termThis.textContent = HV.inputs && HV.inputs.ppa_term ? `${HV.inputs.ppa_term} yr` : '—';

  // Insights
  const ins = el('hv-bm-lt-insights');
  if (ins) {
    const insights = (lt && lt.key_insights) || [];
    if (!insights.length) {
      ins.innerHTML = `<li style="background:transparent;border:none">No market insights uploaded</li>`;
    } else {
      ins.innerHTML = insights.slice(0, 5).map(i => `<li>${typeof i === 'string' ? i : (i.text || JSON.stringify(i))}</li>`).join('');
    }
  }
}

function hvRenderBnef() {
  const meta = el('hv-bm-bnef-meta');
  const content = el('hv-bm-bnef-content');
  if (!content) return;

  const bnef = HV.benchmark.bnef;
  if (!bnef) {
    if (meta) meta.textContent = 'No report uploaded';
    content.innerHTML = `
      <div class="hv-empty">
        <div class="hv-empty-icon">📥</div>
        <div class="hv-empty-title">No BNEF report uploaded yet</div>
        <div class="hv-empty-sub">Admin can upload BNEF Renewable Outlook / NA Power Outlook / LCOE PDF<br>via Reference Data Module</div>
      </div>`;
    return;
  }

  if (meta) meta.textContent = `${bnef.period || ''} · ${bnef.report_type || 'renewable_outlook'} · ${fmtDate(bnef.uploaded_at)}`;
  // Generic key→value list (BNEF schema는 report_type별로 다름 — 일단 모든 키 표시)
  const data = bnef.data || bnef;
  const items = [];
  for (const [k, v] of Object.entries(data || {})) {
    if (['period', 'report_type', 'uploaded_at', 'uploaded_by', 'filename'].includes(k)) continue;
    if (v == null) continue;
    items.push({ k, v });
  }
  if (!items.length) {
    content.innerHTML = `<div class="hv-empty-inline">BNEF report uploaded but no data fields</div>`;
    return;
  }
  content.innerHTML = `
    <ul class="hv-bm-insights">
      ${items.slice(0, 8).map(i => `<li><b>${i.k}:</b> ${typeof i.v === 'object' ? JSON.stringify(i.v) : i.v}</li>`).join('')}
    </ul>
  `;
}


/* ╔═══════════════════════════════════════════════════════════
   ║  §12  EVENT HANDLERS (toggle / tab / slider)
   ╚═══════════════════════════════════════════════════════════ */

// Section collapse toggle
function hvToggleSection(headerNode) {
  const section = headerNode.parentElement;
  const body = section.querySelector('.hv-section-body');
  const caret = headerNode.querySelector('.hv-section-caret');
  if (!body) return;
  if (body.hasAttribute('hidden')) {
    body.removeAttribute('hidden');
    caret && caret.classList.add('open');
  } else {
    body.setAttribute('hidden', '');
    caret && caret.classList.remove('open');
  }
}

// Show Breakdown / Show Advanced toggles inside a section
function hvToggleBreakdown(kind, btn) {
  const target = el(`hv-${kind}-breakdown`);
  if (!target) return;
  if (target.hasAttribute('hidden')) {
    target.removeAttribute('hidden');
    btn.classList.add('open');
    btn.querySelector('.hv-adv-label').textContent = 'Hide Breakdown';
  } else {
    target.setAttribute('hidden', '');
    btn.classList.remove('open');
    btn.querySelector('.hv-adv-label').textContent = 'Show Breakdown';
  }
}
function hvToggleAdvanced(kind, btn) {
  // Single-arg form (Returns Detail) → no kind, target = hv-returns-advanced
  if (kind === undefined && btn === undefined) {
    const target = el('hv-returns-advanced');
    const link = el('hv-adv-toggle');
    if (!target) return;
    if (target.hasAttribute('hidden')) {
      target.removeAttribute('hidden');
      if (link) link.textContent = 'Hide Advanced ▴';
    } else {
      target.setAttribute('hidden', '');
      if (link) link.textContent = 'Show Advanced ▾';
    }
    return;
  }

  const target = el(`hv-${kind}-advanced`);
  if (!target) return;
  if (target.hasAttribute('hidden')) {
    target.removeAttribute('hidden');
    btn.classList.add('open');
    btn.querySelector('.hv-adv-label').textContent = 'Hide Advanced';
  } else {
    target.setAttribute('hidden', '');
    btn.classList.remove('open');
    btn.querySelector('.hv-adv-label').textContent = 'Show Advanced';
  }
}

// ITC / PTC toggle
function hvSetCredit(kind) {
  const itcBtn = el('hv-credit-itc');
  const ptcBtn = el('hv-credit-ptc');
  const itcFields = el('hv-itc-fields');
  const ptcFields = el('hv-ptc-fields');

  if (kind === 'PTC') {
    itcBtn && itcBtn.classList.remove('on');
    ptcBtn && ptcBtn.classList.add('on');
    itcFields && itcFields.setAttribute('hidden', '');
    ptcFields && ptcFields.removeAttribute('hidden');
  } else {
    itcBtn && itcBtn.classList.add('on');
    ptcBtn && ptcBtn.classList.remove('on');
    itcFields && itcFields.removeAttribute('hidden');
    ptcFields && ptcFields.setAttribute('hidden', '');
  }
}

// Tab switch
function hvSwitchTab(tabId, btn) {
  $$('.hv-tab').forEach(t => t.classList.remove('active'));
  $$('.hv-tab-panel').forEach(p => p.classList.remove('active'));
  btn && btn.classList.add('active');
  const panel = document.querySelector(`.hv-tab-panel[data-panel="${tabId}"]`);
  if (panel) panel.classList.add('active');

  // Re-render charts on tab switch (SVG sometimes needs fresh sizing)
  if (HV.result) {
    if (tabId === 'cf')         hvRenderCashFlow();
    if (tabId === 'sensitivity')hvRenderSensitivity();
    if (tabId === 'benchmark')  hvRenderBenchmark();
  }
}

// Cash Flow yearly table show/hide
function hvToggleCFTable(btn) {
  const wrap = el('hv-cf-table');
  if (!wrap) return;
  if (wrap.hasAttribute('hidden')) {
    wrap.removeAttribute('hidden');
    btn.textContent = 'Hide Table ▴';
  } else {
    wrap.setAttribute('hidden', '');
    btn.textContent = 'Show Table ▾';
  }
}

// Slider live update
function hvOnSliderChange(id) {
  const slider = el(`hv-slider-${id}`);
  if (!slider) return;
  const pct = Number(slider.value) || 0;
  setText(`hv-slider-${id}-pct`, `${pct >= 0 ? '+' : ''}${pct}%`);
  hvUpdateSliderResults();
}

// Audit (model audit button — backend stub for now)
async function hvAuditModel() {
  if (!HV.uploadedFile) { hvToast('Upload a PF model first', 'warn'); return; }
  setStatus('Auditing model...', 'loading');
  try {
    const resp = await hvUpload('/valuation/audit-pf', HV.uploadedFile);
    setStatus(`Audit: ${resp.warnings ? resp.warnings.length : 0} warnings`, 'ok');
    if (resp.warnings && resp.warnings.length) {
      hvToast(`Audit warnings:\n${resp.warnings.join('\n')}`, 'warn');
    }
  } catch (e) {
    setStatus('Audit failed', 'err');
    console.warn('[HV] Audit failed:', e.message);
  }
}

function hvBack() {
  // Existing dashboard navigation pattern — try common helpers
  if (typeof window.showPage === 'function') {
    window.showPage('home');
  } else if (typeof window.navigateTo === 'function') {
    window.navigateTo('home');
  } else {
    // Fallback: hide self
    const page = el('page-valuation');
    if (page) page.style.display = 'none';
    history.back();
  }
}


/* ╔═══════════════════════════════════════════════════════════
   ║  §13  INIT & LIFECYCLE
   ╚═══════════════════════════════════════════════════════════ */

async function hvLoadProject() {
  const sel = el('hv-project-select');
  if (!sel) return;
  const id = sel.value;
  if (!id) {
    HV.project = null;
    setStatus('No project selected', 'idle');
    return;
  }
  try {
    HV.project = await apiGetProject(id);
    setStatus(`Loaded: ${HV.project.name || id}`, 'ok');
    // Pre-fill from project meta if available
    if (HV.project.iso) console.log(`[HV] Project ISO: ${HV.project.iso}`);
    // Refresh history for this project
    await hvRefreshHistory();
  } catch (e) {
    console.error('[HV] Load project failed:', e);
    setStatus('Project load failed', 'err');
  }
}

async function hvLoadProjectList() {
  try {
    const projects = await apiGetProjects();
    const sel = el('hv-project-select');
    if (!sel) return;
    // Clear existing options except first
    while (sel.options.length > 1) sel.remove(1);
    if (Array.isArray(projects)) {
      projects.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.name || p.id;
        sel.appendChild(opt);
      });
    }
  } catch (e) {
    console.warn('[HV] Project list fetch failed:', e.message);
  }
}

// Slider input listeners
function hvBindSliders() {
  ['ppa', 'capex', 'devfee', 'int'].forEach(id => {
    const slider = el(`hv-slider-${id}`);
    if (slider) {
      slider.addEventListener('input', () => hvOnSliderChange(id));
    }
  });
}

// Page enter — call this from existing dashboard's page nav
async function hvOnEnter() {
  const page = el('page-valuation');
  if (page) page.style.display = '';
  await hvLoadProjectList();
  hvBindSliders();
  setStatus('Ready', 'idle');
}

// SPA router integration — called by L6673 addEventListener('click', openValuationPage)
function openValuationPage() {
  // 1) close other pages (existing dashboard router)
  if (typeof closeAllPages === 'function') {
    try { closeAllPages(); } catch (e) { console.warn('[HV] closeAllPages error:', e); }
  }

  // 2) show this page — explicitly 'flex' to match .hv-page CSS
  const page = el('page-valuation');
  if (page) page.style.display = 'flex';

  // 3) update nav button active state (match existing pattern)
  ['btn-issues','btn-finance','btn-report','btn-ppv','btn-kpi','btn-retail','btn-valuation'].forEach(id => {
    const b = document.getElementById(id);
    if (b) b.classList.toggle('active', id === 'btn-valuation');
  });

  // 4) hide AI FAB if exists (match closeAllPages pattern)
  const fab = document.querySelector('.ai-fab');
  if (fab) fab.style.display = 'none';

  // 5) init valuation module (best-effort, async)
  hvOnEnter().catch(e => console.warn('[HV] hvOnEnter error:', e));
}

// Auto-init on DOM ready (if page already visible)
function hvAutoInit() {
  const page = el('page-valuation');
  if (!page) return;
  hvBindSliders();
  // Load project list lazily — only if user navigates to this page
  if (page.style.display !== 'none' && page.offsetParent !== null) {
    hvLoadProjectList();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', hvAutoInit);
} else {
  hvAutoInit();
}

// Expose to window (for inline onclick handlers in HTML)
window.hvBack = hvBack;
window.hvLoadProject = hvLoadProject;
window.hvOnFilePick = hvOnFilePick;
window.hvParseModel = hvParseModel;
window.hvAuditModel = hvAuditModel;
window.hvCalculate = hvCalculate;
window.hvToggleSection = hvToggleSection;
window.hvToggleBreakdown = hvToggleBreakdown;
window.hvToggleAdvanced = hvToggleAdvanced;
window.hvSetCredit = hvSetCredit;
window.hvSwitchTab = hvSwitchTab;
window.hvToggleCFTable = hvToggleCFTable;
window.hvOnEnter = hvOnEnter;
window.openValuationPage = openValuationPage;
