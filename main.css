/* ============================================================
   js/pages/valuation/calculate.js
   ============================================================
   Valuation page — Calculate/Scenarios/Sensitivity/Break-even/CF
   
   Functions:
     - valRunScenarios: Base/Upside/Downside scenario execution
     - valRunSensitivity: Sensitivity table (PPA/CAPEX/Debt)
     - valRunBreakEven + valRenderBreakEven: Newton-Raphson PPA solver
     - valRunCFAnalysis + valRenderCFAnalysis: AI cash flow analysis
     - valRunCFInterp: Cash flow pattern interpretation
     - valCFLang: IC Opinion language toggle (KR/EN)
     - valDrawChart: EBITDA bar chart (Canvas)
   
   Extracted from index.html (Phase 3 Step 3-B refactoring)
   Generated: Apr 19, 2026
   ============================================================ */

// ═══════════════════════════════════════════════════════════════
async function valRunBreakEven() {
  var btn = document.getElementById('be-run-btn');
  var resultEl = document.getElementById('be-result');
  var emptyEl = document.getElementById('be-empty');
  var baseInputs = window._valBaseInputs || {};

  if (!baseInputs.ppa_price) {
    alert(currentLang==='en'?'Please run Calculate first.':'Please run Calculate first.');
    return;
  }

  var targetIrr = parseFloat((document.getElementById('be-target-irr')||{}).value) || 11.0;
  if (targetIrr <= 0 || targetIrr > 30) { alert('Target IRR은 0~30% 범위여야 합니다.'); return; }

  if (btn) { btn.textContent = '⏳ Newton-Raphson 역산 중... (최대 15초)'; btn.style.opacity='.6'; btn.style.pointerEvents='none'; }
  if (emptyEl) emptyEl.style.display = 'none';

  try {
    var projectIdBE = (document.getElementById('val-proj-select')||{}).value || '';
    var data = await apiCall('POST', '/valuation/breakeven', {
      project_id: projectIdBE,
      inputs: baseInputs,
      target_irr_pct: targetIrr,
      target_var: 'ppa_price'
    });

    if (!data || !data.ok) throw new Error('API 오류 또는 응답 없음');
    console.log('[BreakEven] Response:', data);

    valRenderBreakEven(data, targetIrr);

  } catch(e) {
    console.error('[BreakEven] Error:', e);
    if (resultEl) {
      resultEl.style.display = 'block';
      resultEl.innerHTML = '<div style="padding:16px;background:rgba(239,68,68,.1);border:1px solid var(--red);border-radius:8px;color:var(--red);font-size:11px">⚠️ Analysis failed: ' + (e.message || e) + '</div>';
    }
  } finally {
    if (btn) { btn.textContent = '▶ Run Analysis'; btn.style.opacity='1'; btn.style.pointerEvents='auto'; }
  }
}

function valRenderBreakEven(data, targetIrr) {
  var resultEl = document.getElementById('be-result');
  if (!resultEl) return;
  resultEl.style.display = 'block';

  var sens = data.sensitivity || [];
  var iters = data.iterations || [];
  var sol = data.solution || {};
  var basePPA = data.base_ppa;
  var status = data.status;
  var converged = sol.converged;

  // 상태 → 색상/아이콘
  var statusMap = {
    'converged':          {color:'var(--green)', icon:'✓', label:'Converged'},
    'max_iter_reached':   {color:'var(--red)',   icon:'⚠', label:'No solution found'},
    'target_below_range': {color:'var(--amber)', icon:'⚠', label:'Target below ±25% range'},
    'target_above_range': {color:'var(--amber)', icon:'⚠', label:'Target above ±25% range'},
    'flat_derivative':    {color:'var(--red)',   icon:'⚠', label:'Flat slope — no solution'},
    'iterating':          {color:'var(--blue-h)',icon:'…', label:'In progress'}
  };
  var sInfo = statusMap[status] || {color:'var(--t3)', icon:'?', label:status};

  var html = '';

  // ═══ 솔루션 카드 ═══
  // 헤더 색조: 수렴 실패면 경고 톤
  var headerGrad = converged
    ? 'linear-gradient(135deg,rgba(37,99,235,.08) 0%,rgba(139,92,246,.05) 100%)'
    : 'linear-gradient(135deg,rgba(239,68,68,.08) 0%,rgba(245,158,11,.05) 100%)';
  var headerBorder = converged ? 'var(--blue-h)' : 'var(--red)';
  html += '<div style="padding:16px 18px;background:'+headerGrad+';border:2px solid '+headerBorder+';border-radius:12px;margin-bottom:14px">';
  html += '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">';
  html += '<div><div style="font-size:9px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:'+headerBorder+';margin-bottom:4px">🎯 Break-Even Solver Result</div>';
  html += '<div style="font-size:9.5px;color:var(--t2)">Target Sponsor IRR <strong style="color:var(--t1)">' + targetIrr.toFixed(2) + '%</strong></div></div>';
  html += '<div style="padding:3px 10px;background:' + sInfo.color + ';color:#fff;border-radius:10px;font-size:9px;font-weight:800;letter-spacing:.04em">' + sInfo.icon + ' ' + sInfo.label.toUpperCase() + '</div>';
  html += '</div>';

  if (sol.ppa) {
    var diffVsBase = sol.ppa - basePPA;
    var diffPct = (diffVsBase / basePPA) * 100;
    var diffColor = diffVsBase >= 0 ? 'var(--red)' : 'var(--green)';
    var finalIrrColor = converged ? 'var(--green)' : 'var(--amber)';
    
    // 수렴 실패 시 레이블 변경 — "Target 달성 PPA" → "Best-fit PPA"
    var ppaLabel = converged ? 'PPA at Target' : 'Closest PPA';
    var irrLabel = converged ? 'Final IRR' : 'Achieved IRR';

    html += '<div style="display:grid;grid-template-columns:1.6fr 1fr 1fr 1fr;gap:10px">';
    html += '<div style="padding:10px;background:var(--surface);border-radius:6px">';
    html += '<div style="font-size:8.5px;color:var(--t3);letter-spacing:.08em;font-weight:700;text-transform:uppercase">'+ppaLabel+'</div>';
    html += '<div style="font-size:22px;font-weight:900;color:'+(converged?'var(--blue-h)':'var(--amber)')+';font-variant-numeric:tabular-nums;margin-top:2px">$' + sol.ppa.toFixed(2) + '</div>';
    html += '<div style="font-size:9px;color:var(--t3);margin-top:1px">/MWh</div></div>';

    html += '<div style="padding:10px;background:var(--surface);border-radius:6px">';
    html += '<div style="font-size:8.5px;color:var(--t3);letter-spacing:.08em;font-weight:700;text-transform:uppercase">vs Current</div>';
    html += '<div style="font-size:16px;font-weight:800;color:' + diffColor + ';font-variant-numeric:tabular-nums;margin-top:2px">' + (diffVsBase >= 0 ? '+' : '') + '$' + diffVsBase.toFixed(2) + '</div>';
    html += '<div style="font-size:9px;color:' + diffColor + ';margin-top:1px">' + (diffPct >= 0 ? '+' : '') + diffPct.toFixed(2) + '%</div></div>';

    html += '<div style="padding:10px;background:var(--surface);border-radius:6px">';
    html += '<div style="font-size:8.5px;color:var(--t3);letter-spacing:.08em;font-weight:700;text-transform:uppercase">'+irrLabel+'</div>';
    html += '<div style="font-size:16px;font-weight:800;color:'+finalIrrColor+';font-variant-numeric:tabular-nums;margin-top:2px">' + sol.irr_pct.toFixed(2) + '%</div>';
    html += '<div style="font-size:9px;color:var(--t3);margin-top:1px">Error ±' + Math.abs(sol.error_pct).toFixed(2) + '%p</div></div>';

    html += '<div style="padding:10px;background:var(--surface);border-radius:6px">';
    html += '<div style="font-size:8.5px;color:var(--t3);letter-spacing:.08em;font-weight:700;text-transform:uppercase">Iterations</div>';
    html += '<div style="font-size:16px;font-weight:800;color:var(--t1);font-variant-numeric:tabular-nums;margin-top:2px">' + sol.iterations + '</div>';
    html += '<div style="font-size:9px;color:var(--t3);margin-top:1px">steps</div></div>';

    html += '</div>';

    // 상태별 경고
    if (!converged) {
      // 수렴 실패 — 명확한 메시지
      html += '<div style="margin-top:10px;padding:10px 14px;background:rgba(239,68,68,.12);border-left:3px solid var(--red);border-radius:4px;font-size:11px;color:var(--t2);line-height:1.5">';
      html += '<strong style="color:var(--red)">⚠ No valid solution</strong>. Newton-Raphson did not converge to the target IRR within ' + sol.iterations + ' iterations. The best approximation achieves <strong>' + sol.irr_pct.toFixed(2) + '%</strong> vs target <strong>' + targetIrr.toFixed(2) + '%</strong> (gap <strong>' + Math.abs(sol.error_pct).toFixed(2) + '%p</strong>). ';
      html += 'This typically indicates that PPA price alone cannot reach the target — consider adjusting CAPEX, Debt structure, or Tax Equity terms.';
      html += '</div>';
    } else if (status === 'target_above_range' || status === 'target_below_range') {
      html += '<div style="margin-top:10px;padding:8px 12px;background:rgba(245,158,11,.1);border-left:3px solid var(--amber);border-radius:4px;font-size:10px;color:var(--t2)">⚠ Target IRR is outside the ±25% PPA range. Solution found by Newton-Raphson but verify feasibility in real deal context.</div>';
    }

    // Newton-Raphson 수렴 요약 (converged일 때만)
    if (converged && iters.length > 0) {
      var finalIter = iters[iters.length - 1];
      var iterCount = finalIter.iter || (iters.length - 1);
      html += '<div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,.04);font-size:9.5px;color:var(--t3);font-style:italic">Newton-Raphson converged in ' + iterCount + ' iterations · error ' + Math.abs(finalIter.error_pct).toFixed(4) + '% (tolerance ' + (data.tolerance_pct || 0.01).toFixed(2) + '%)</div>';
    }
  }
  html += '</div>';

  // ═══ Phase 1: Sensitivity Scan ═══
  html += '<details style="padding:10px 14px;background:var(--surface);border:1px solid var(--border);border-radius:10px"><summary style="cursor:pointer;font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--t2)">📊 Phase 1 — Sensitivity Scan (±25%, 11 points)</summary>';
  html += '<table style="width:100%;border-collapse:collapse;font-size:11px;font-variant-numeric:tabular-nums;margin-top:10px">';
  html += '<thead><tr style="background:var(--surface2);border-bottom:1px solid var(--border)">';
  html += '<th style="padding:6px 10px;text-align:left;font-size:9px;color:var(--t3);font-weight:700">PPA Shift</th>';
  html += '<th style="padding:6px 10px;text-align:right;font-size:9px;color:var(--t3);font-weight:700">PPA ($/MWh)</th>';
  html += '<th style="padding:6px 10px;text-align:right;font-size:9px;color:var(--t3);font-weight:700">Sponsor IRR</th>';
  html += '<th style="padding:6px 10px;text-align:right;font-size:9px;color:var(--t3);font-weight:700">vs Target</th>';
  html += '</tr></thead><tbody>';
  sens.forEach(function(s) {
    var isBase = s.pct === 0;
    var diff = s.irr_pct - targetIrr;
    var diffColor = Math.abs(diff) < 0.5 ? 'var(--green)' : (diff > 0 ? 'var(--blue-h)' : 'var(--amber)');
    html += '<tr style="border-bottom:1px solid rgba(255,255,255,.04);' + (isBase?'background:rgba(37,99,235,.08)':'') + '">';
    html += '<td style="padding:5px 10px;color:' + (isBase?'var(--blue-h)':'var(--t2)') + ';font-weight:' + (isBase?'800':'600') + '">' + (s.pct>=0?'+':'') + s.pct + '%' + (isBase?' (current)':'') + '</td>';
    html += '<td style="padding:5px 10px;text-align:right;color:var(--t1);font-weight:600">$' + s.ppa.toFixed(2) + '</td>';
    html += '<td style="padding:5px 10px;text-align:right;color:var(--amber);font-weight:700">' + s.irr_pct.toFixed(2) + '%</td>';
    html += '<td style="padding:5px 10px;text-align:right;color:' + diffColor + ';font-weight:600">' + (diff>=0?'+':'') + diff.toFixed(2) + '%</td>';
    html += '</tr>';
  });
  html += '</tbody></table>';
  html += '</details>';

  resultEl.innerHTML = html;
}

async function valRunScenarios() {
  var btn = document.getElementById('val-run-scenarios-btn');
  if (btn) { btn.textContent='⏳ Calculating...'; btn.style.opacity='.6'; btn.style.pointerEvents='none'; }

  var token = window._authToken || localStorage.getItem('hwr_token');
  var projectId = document.getElementById('val-proj-select') ? document.getElementById('val-proj-select').value : '';
  var baseInputs = window._valBaseInputs || {};

  var scenarios = ['base','upside','stress'];
  var promises = scenarios.map(function(sc) {
    var card = document.getElementById('val-sc-'+sc);
    var inps = card ? card.querySelectorAll('.val-sc-inp') : [];
    var override = {};
    inps.forEach(function(inp) {
      var v = parseFloat(inp.value);
      if (!isNaN(v)) override[inp.dataset.field] = v;
    });
    var inputs = Object.assign({}, baseInputs, override);
    inputs.calibration_mode = window._calibrationMode || 'calibration';
    return fetch('https://hwr-api-production.up.railway.app/valuation/calculate', {
      method:'POST',
      headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},
      body: JSON.stringify({project_id: projectId, inputs: inputs})
    }).then(function(r){ return r.json(); }).catch(function(){ return {ok:false}; });
  });

  var results = await Promise.all(promises);
  var rObjs = results.map(function(res){ return (res.ok && res.result) ? res.result : null; });

  // Show per-card mini results
  scenarios.forEach(function(sc, i) {
    var r = rObjs[i]; if (!r) return;
    var el = document.getElementById('val-sc-result-'+sc);
    if (!el) return;
    var sirr = (r.sponsor_irr||r.sponsor_irr_contract||0)*100;
    var sirrColor = sirr>=10?'var(--green)':sirr>=7?'var(--amber)':'var(--red)';
    var mwac = (window._valBaseInputs||{}).pv_mwac || 199;
    var cwp = mwac > 0 ? ((r.dev_margin||0)*1000) / (mwac*1000) * 100 : 0;
    el.style.display = 'block';
    el.innerHTML =
      '<div class="val-sc-kpi-row"><span class="val-sc-kpi-lbl">Sponsor IRR</span><span class="val-sc-kpi-val" style="color:'+sirrColor+'">'+sirr.toFixed(2)+'%</span></div>'+
      '<div class="val-sc-kpi-row"><span class="val-sc-kpi-lbl">Total CAPEX</span><span class="val-sc-kpi-val" style="color:var(--amber)">$'+(r.capex_total/1000).toFixed(1)+'M</span></div>'+
      '<div class="val-sc-kpi-row"><span class="val-sc-kpi-lbl">EBITDA Yield</span><span class="val-sc-kpi-val">'+r.ebitda_yield.toFixed(1)+'%</span></div>'+
      '<div class="val-sc-kpi-row"><span class="val-sc-kpi-lbl">Sponsor Equity</span><span class="val-sc-kpi-val">$'+(r.sponsor_equity/1000).toFixed(1)+'M</span></div>';
  });

  // Show comparison table
  var tbody = document.getElementById('val-sc-compare-body');
  var compareDiv = document.getElementById('val-sc-compare');
  if (tbody && rObjs.some(Boolean)) {
    var metrics = [
      {lbl:'Sponsor IRR', fn:function(r){ var v=(r.sponsor_irr||r.sponsor_irr_contract||0)*100; return {txt:v.toFixed(2)+'%', val:v, color:v>=10?'var(--green)':v>=7?'var(--amber)':'var(--red)'}; }},
      {lbl:'Levered IRR',  fn:function(r){ var v=(r.levered_irr||0)*100; return {txt:v.toFixed(2)+'%',val:v}; }},
      {lbl:'Unlevered IRR',fn:function(r){ var v=(r.unlevered_irr||0)*100; return {txt:v.toFixed(2)+'%',val:v}; }},
      {lbl:'EBITDA Yield', fn:function(r){ return {txt:r.ebitda_yield.toFixed(1)+'%',val:r.ebitda_yield}; }},
      {lbl:'Margin c/Wp',  fn:function(r){
        // Dev Margin을 프로젝트 규모(MWac)로 나눈 정규화 지표
        var mwac = (window._valBaseInputs||{}).pv_mwac || 199;
        var cwp = mwac > 0 ? ((r.dev_margin||0)*1000) / (mwac*1000) * 100 : 0;
        return {txt: cwp.toFixed(2)+' c/Wp', val: cwp};
      }},
      {lbl:'Total CAPEX',  fn:function(r){ return {txt:'$'+(r.capex_total/1000).toFixed(1)+'M',val:r.capex_total}; }},
      {lbl:'Debt',         fn:function(r){ return {txt:'$'+(r.debt/1000).toFixed(1)+'M',val:r.debt}; }},
      {lbl:'Tax Equity',   fn:function(r){ return {txt:'$'+((r.te_invest||0)/1000).toFixed(1)+'M',val:r.te_invest||0}; }},
      {lbl:'Sponsor Equity',fn:function(r){ return {txt:'$'+(r.sponsor_equity/1000).toFixed(1)+'M',val:r.sponsor_equity}; }},
    ];
    tbody.innerHTML = metrics.map(function(m) {
      var cells = rObjs.map(function(r){ return r ? m.fn(r) : {txt:'—',val:0}; });
      var vals = cells.map(function(c){return c.val||0;});
      var maxV = Math.max.apply(null,vals); var minV = Math.min.apply(null,vals);
      var isHigherBetter = ['Sponsor IRR','Levered IRR','Unlevered IRR','EBITDA Yield','Margin c/Wp'].indexOf(m.lbl)>=0;
      return '<tr style="border-bottom:1px solid rgba(255,255,255,.04)">' +
        '<td style="padding:8px 14px;font-size:10px;color:var(--t3);font-weight:600">'+m.lbl+'</td>' +
        cells.map(function(cell,i){
          var highlight='';
          if(rObjs[i]&&vals[i]===maxV&&maxV!==minV) highlight=isHigherBetter?'font-weight:800;':'';
          if(rObjs[i]&&vals[i]===minV&&maxV!==minV) highlight=isHigherBetter?'':'font-weight:800;';
          var color = cell.color||'var(--t1)';
          return '<td style="padding:8px 14px;text-align:right;'+highlight+'color:'+color+'">'+cell.txt+'</td>';
        }).join('') +
      '</tr>';
    }).join('');
    compareDiv.style.display = 'block';
  }

  if (btn) { btn.textContent='▶ Run Scenarios'; btn.style.opacity='1'; btn.style.pointerEvents='auto'; }
}

// ── Valuation: Sensitivity Table
async function valRunSensitivity(projectId, baseInputs, baseResult) {
  var sensEl = document.getElementById('vo-sens-table');
  if (!sensEl) return;

  var token = window._authToken || localStorage.getItem('hwr_token');
  var baseMargin = baseResult.total_margin;
  var basePPA = baseInputs.ppa_price;
  var rows = [];

  // PPA sensitivity: -$5 to +$5 in $1 steps
  var promises = [];
  var ppas = [];
  for (var delta = -5; delta <= 5; delta++) {
    var ppa = Math.round((basePPA + delta) * 100) / 100;
    ppas.push(ppa);
    var inp = Object.assign({}, baseInputs, { ppa_price: ppa });
    inp.calibration_mode = window._calibrationMode || 'calibration';
    promises.push(
      fetch('https://hwr-api-production.up.railway.app/valuation/calculate', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer '+token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, inputs: inp })
      }).then(function(r){ return r.json(); })
    );
  }

  try {
    var results = await Promise.all(promises);
    var html = '<table style="width:100%;border-collapse:collapse;font-size:11px">';
    html += '<thead><tr style="border-bottom:1px solid var(--border)">';
    html += '<th style="text-align:left;padding:6px 8px;color:var(--t3);font-weight:700">PPA ($/MWh)</th>';
    html += '<th style="text-align:right;padding:6px 8px;color:var(--t3);font-weight:700">Dev Margin</th>';
    html += '<th style="text-align:right;padding:6px 8px;color:var(--t3);font-weight:700">Sponsor IRR</th>';
    html += '<th style="text-align:right;padding:6px 8px;color:var(--t3);font-weight:700">EBITDA Yield</th>';
    html += '</tr></thead><tbody>';

    results.forEach(function(res, i) {
      if (!res.ok || !res.result) return;
      var r = res.result;
      var ppa = ppas[i];
      var isBase = Math.abs(ppa - basePPA) < 0.01;
      var bg = isBase ? 'background:var(--surface3);' : '';
      var marginDelta = r.total_margin - baseMargin;
      var deltaStr = marginDelta >= 0 ? '+$'+(marginDelta/1000).toFixed(1)+'M' : '-$'+(Math.abs(marginDelta)/1000).toFixed(1)+'M';
      var deltaColor = marginDelta > 0 ? 'var(--green)' : marginDelta < 0 ? 'var(--red,#e55)' : 'var(--t3)';

      html += '<tr style="border-bottom:1px solid var(--border);'+bg+'">';
      html += '<td style="padding:6px 8px;font-weight:'+(isBase?'700':'400')+';color:var(--t1)">$'+ppa.toFixed(2)+(isBase?' ← base':'')+'</td>';
      var sirr = r.sponsor_irr||r.sponsor_irr_contract||0;
      var sirrColor = sirr>=0.10?'var(--green)':sirr>=0.07?'var(--amber)':'var(--red)';
      html += '<td style="text-align:right;padding:6px 8px;font-weight:700;color:'+deltaColor+'">$'+(r.dev_margin/1000).toFixed(1)+'M <span style="font-size:10px">'+deltaStr+'</span></td>';
      html += '<td style="text-align:right;padding:6px 8px;font-weight:700;color:'+sirrColor+'">'+(sirr*100).toFixed(2)+'%</td>';
      html += '<td style="text-align:right;padding:6px 8px;color:var(--t2)">'+r.ebitda_yield.toFixed(2)+'%</td>';
      html += '</tr>';
    });

    html += '</tbody></table>';
    sensEl.innerHTML = html;
    document.getElementById('vo-sensitivity').style.display = 'block';
  } catch(e) {
    sensEl.innerHTML = '<div style="font-size:11px;color:var(--t3)">Sensitivity calc failed: '+e.message+'</div>';
  }
}

// ── Valuation: EBITDA Bar Chart (Canvas)
function valDrawChart(detail) {
  if (!detail || detail.length === 0) return;
  var chartSec = document.getElementById('vo-chart-section');
  if (!chartSec) return;

  // Sponsor CF (s_cf) 우선, 없으면 ebitda 사용
  var vals = detail.map(function(d){ return d.s_cf !== undefined ? d.s_cf : d.ebitda; });
  var maxV = Math.max.apply(null, vals.map(Math.abs)) || 1;

  var html = '<div style="font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--t3);margin-bottom:10px">Annual Sponsor CF (Y1–Y10, $M)</div>';
  html += '<div style="display:flex;flex-direction:column;gap:4px">';

  vals.forEach(function(v, i) {
    var d = detail[i];
    var pct = Math.abs(v) / maxV * 100;
    var isNeg = v < 0;
    var isAug = d.aug > 0;
    var col = isNeg ? 'var(--red)' : isAug ? 'var(--amber)' : 'var(--green)';
    var vM = (v/1000).toFixed(1);

    html += '<div style="display:flex;align-items:center;gap:8px">';
    html += '<div style="width:24px;font-size:9px;color:var(--t3);text-align:right;flex-shrink:0">Y'+d.yr+'</div>';
    html += '<div style="flex:1;height:16px;background:rgba(255,255,255,.04);border-radius:3px;overflow:hidden;position:relative">';
    if (!isNeg) {
      html += '<div style="width:'+pct+'%;height:100%;background:'+col+';border-radius:3px;opacity:.85"></div>';
    } else {
      html += '<div style="width:'+pct+'%;height:100%;background:'+col+';border-radius:3px;opacity:.85;margin-left:auto"></div>';
    }
    html += '</div>';
    html += '<div style="width:44px;font-size:10px;font-weight:700;color:'+col+';text-align:right;font-variant-numeric:tabular-nums">$'+vM+'M</div>';
    if (isAug) html += '<div style="font-size:8px;color:var(--amber);width:20px">Aug</div>';
    else html += '<div style="width:20px"></div>';
    html += '</div>';
  });

  html += '</div>';

  // ── CF 자동 해석
  chartSec.innerHTML = html;

  // 현재 CF 데이터를 전역에 보관 (버튼 클릭 시 사용)
  window._cfDetail = detail;
  window._cfVals   = vals;
}

function valCFLang(lang) {
  window._cfLang = lang;
  var enBtn = document.getElementById('cf-lang-en');
  var krBtn = document.getElementById('cf-lang-kr');
  // 새 segmented control 스타일 — 활성 버튼만 blue 배경 + 그림자
  function setBtn(btn, active) {
    if (!btn) return;
    if (active) {
      btn.style.background = 'var(--blue-d)';
      btn.style.color = '#fff';
      btn.style.fontWeight = '700';
      btn.style.boxShadow = '0 1px 3px rgba(0,0,0,.25)';
    } else {
      btn.style.background = 'transparent';
      btn.style.color = 'var(--t3)';
      btn.style.fontWeight = '600';
      btn.style.boxShadow = 'none';
    }
  }
  setBtn(enBtn, lang === 'en');
  setBtn(krBtn, lang === 'kr');

  // 해당 언어 캐시가 있으면 즉시 표시, 없으면 재실행 버튼 안내
  var cached = lang==='en' ? window._cfAnalysisEn : window._cfAnalysisKr;
  if (cached) {
    valRenderCFAnalysis(cached, lang);
  } else {
    var res = document.getElementById('cf-ai-result');
    if (res) {
      var msg = lang==='en'
        ? 'English analysis not yet generated. Click <strong style="color:var(--blue-h)">Run AI Analysis</strong> to generate.'
        : '한국어 분석이 아직 생성되지 않았습니다. 우측 <strong style="color:var(--blue-h)">Run AI Analysis</strong> 버튼을 눌러 실행하세요.';
      res.innerHTML = '<div style="padding:32px;text-align:center;color:var(--t3);font-size:11px;background:var(--surface2);border:1px dashed var(--border2);border-radius:var(--r-lg)">'+msg+'</div>';
    }
  }
}

function valRenderCFAnalysis(p, lang) {
  var res = document.getElementById('cf-ai-result');
  if (!res) return;

  var isEn = lang === 'en';
  var vc = p.verdict_color === 'green' ? 'var(--green)' : p.verdict_color === 'red' ? 'var(--red)' : 'var(--amber)';
  var verdict   = p.verdict || 'NEUTRAL';
  var thesis    = p.thesis    || (isEn ? (p.thesis_en||'')    : (p.thesis_kr||''));
  var risks     = p.risks     || (isEn ? (p.risks_en||[])     : (p.risks_kr||[]));
  var rec       = p.rec       || (isEn ? (p.rec_en||'')       : (p.rec_kr||''));
  var sens      = p.sensitivity || (isEn ? (p.sensitivity_en||'') : (p.sensitivity_kr||''));
  var thr       = p.threshold_status || {};
  var complianceCount = p.compliance_count || 0;  // 고정 체크리스트 개수

  var L = {
    verdict:       isEn ? 'ECONOMIC VERDICT' : '경제성 판정',
    verdict_sub:   isEn ? 'Based on pure economic criteria (Dev Margin, Sponsor IRR, Unlev vs WACC)'
                         : '순수 경제성 기준 (Dev Margin · Sponsor IRR · Unlev IRR vs WACC)',
    metrics:       isEn ? 'KEY METRICS'      : '핵심 지표',
    thresholds:    isEn ? 'THRESHOLD CHECK'  : '투자 기준 달성 여부',
    sens:          isEn ? 'DEV MARGIN SENSITIVITY' : 'Dev Margin 민감도',
    thesis:        isEn ? 'INVESTMENT RATIONALE (ECONOMIC)': '투자 근거 (경제성)',
    compliance:    isEn ? 'REGULATORY COMPLIANCE CHECKLIST' : '규정 준수 체크 (IC 승인 전 확인)',
    compliance_sub:isEn ? 'Fixed checklist — verify with execution team before IC approval'
                         : '고정 체크리스트 · 의사결정에 반영되지 않음',
    risks:         isEn ? 'PROJECT-SPECIFIC RISKS (MONITORING)'  : '프로젝트별 리스크 (모니터링)',
    risks_sub:     isEn ? 'AI-identified risks — informational only, does NOT drive verdict'
                         : 'AI 분석 리스크 · 의사결정에 반영되지 않음, 개발팀이 별도 관리',
    rec:           'RECOMMENDATION',
  };

  var sevColor = function(s) {
    return s==='Critical' ? 'var(--red)'
         : s==='Watch' ? 'var(--amber)'
         : 'var(--green)';
  };

  function section(label, content, subLabel) {
    var sub = subLabel ? '<div style="font-size:9px;color:var(--t3);margin-top:-2px;margin-bottom:8px;font-style:italic">'+subLabel+'</div>' : '';
    return '<div style="margin-bottom:18px">'
      + '<div style="font-size:9px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--t3);margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid var(--border)">'
      +   label
      + '</div>'
      + sub
      + content
      + '</div>';
  }

  // 컴플라이언스 체크리스트와 AI 리스크 분리
  var complianceItems = risks.slice(0, complianceCount);
  var aiRisks = risks.slice(complianceCount);

  var html = '';

  // ══════════════════════════════════════════════
  // SECTION A — 경제성 판정 (Economic Verdict)
  // ══════════════════════════════════════════════
  html += '<div style="margin-bottom:24px;padding:14px 16px;background:rgba(255,255,255,.02);border-radius:var(--r-lg);border-left:3px solid '+vc+'">'
    + '<div style="font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:'+vc+';margin-bottom:14px">📊 A. '+L.verdict+'</div>';

  // ① Verdict 배지 (상단) + 핵심 지표 (하단 전체 폭)
  html += '<div style="padding:16px 18px;border-radius:var(--r-md);border:1.5px solid '+vc+';margin-bottom:16px;background:var(--surface)">'
    // 상단: verdict + sub
    + '<div style="display:flex;align-items:baseline;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:10px">'
    +   '<div>'
    +     '<div style="font-size:9px;font-weight:700;letter-spacing:.16em;color:var(--t3);margin-bottom:4px">'+L.verdict+'</div>'
    +     '<div style="font-size:22px;font-weight:800;letter-spacing:.1em;color:'+vc+'">'+verdict+'</div>'
    +   '</div>'
    +   '<div style="font-size:9px;color:var(--t3);text-align:right;flex:1;min-width:0">'+L.verdict_sub+'</div>'
    + '</div>'
    // 하단: 핵심 지표 (전체 폭 사용, 줄바꿈 허용)
    + '<div style="border-top:1px solid var(--border);padding-top:10px">'
    +   '<div style="font-size:9px;color:var(--t3);margin-bottom:6px;font-weight:700;letter-spacing:.06em">'+L.metrics+'</div>'
    +   '<div style="font-size:11px;font-weight:600;color:var(--t2);font-variant-numeric:tabular-nums;line-height:1.6;word-break:break-word">'+(p.metrics||'—')+'</div>'
    + '</div>'
    + '</div>';

  // ② Threshold Check (3칸 — Dev Margin, Sponsor IRR, Unlev vs WACC)
  var thrHtml = '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">';
  var checks = [
    { label:'Dev Margin',                ok: thr.margin_ok,       gap: thr.margin_gap||'',       sub: isEn?'c/Wp':'마진' },
    { label:'Sponsor IRR (Lev Pre-Tax)', ok: thr.irr_ok,          gap: thr.irr_gap||'',          sub: isEn?'leveraged return':'레버리지 수익률' },
    { label:'Unlev IRR vs WACC',         ok: thr.wacc_spread_ok,  gap: thr.wacc_spread||'',      sub: isEn?'value creation':'가치 창출' },
  ];
  checks.forEach(function(ch) {
    var ok = ch.ok === true || ch.ok === 'true';
    var col = ok ? 'var(--green)' : 'var(--red)';
    var badge = ok ? (isEn?'✓ PASS':'✓ 통과') : (isEn?'✗ FAIL':'✗ 미달');
    thrHtml += '<div style="padding:10px 12px;background:var(--surface2);border:1px solid var(--border);border-radius:var(--r-md)">'
      + '<div style="font-size:9px;color:var(--t3);margin-bottom:1px;font-weight:600">'+ch.label+'</div>'
      + '<div style="font-size:8px;color:var(--t3);margin-bottom:5px">'+ch.sub+'</div>'
      + '<div style="font-size:12px;font-weight:800;color:'+col+'">'+badge+'</div>'
      + (ch.gap ? '<div style="font-size:10px;color:var(--t2);margin-top:3px;font-variant-numeric:tabular-nums">'+ch.gap+'</div>' : '')
      + '</div>';
  });
  thrHtml += '</div>';
  html += section(L.thresholds, thrHtml);

  // ③ Dev Margin Sensitivity
  if (sens) {
    html += section(L.sens,
      '<div style="font-size:11.5px;color:var(--t1);line-height:1.85;padding:12px 14px;background:var(--surface2);border:1px solid var(--border);border-radius:var(--r-md)">'+sens+'</div>'
    );
  }

  // ④ Investment Thesis
  html += section(L.thesis,
    '<div style="font-size:11.5px;color:var(--t1);line-height:1.85">'+thesis+'</div>'
  );

  // ④-B Market Context Card (LevelTen 기반 시장 포지셔닝)
  //     옵션 B: 경제성 다음, 리스크 전 → 판정 근거의 자연스러운 흐름
  try {
    var mcHtml = valBuildMarketContextCard(isEn);
    if (mcHtml) {
      html += section(isEn ? 'MARKET CONTEXT (LEVELTEN)' : '시장 포지셔닝 (LevelTen 기반)', mcHtml,
        isEn ? 'Positioning vs LevelTen quarterly benchmark' : 'LevelTen 분기별 벤치마크 기반 우리 프로젝트 위치 해석');
    }
  } catch(e) { console.warn('[MarketContext] render failed', e); }

  html += '</div>';  // SECTION A 닫기

  // ══════════════════════════════════════════════
  // SECTION B — 리스크 모니터링 (Risk Monitoring)
  // ══════════════════════════════════════════════
  html += '<div style="margin-bottom:24px;padding:14px 16px;background:rgba(255,255,255,.02);border-radius:var(--r-lg);border-left:3px solid var(--t3)">'
    + '<div style="font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--t2);margin-bottom:4px">🔍 B. '+(isEn?'RISK MONITORING':'리스크 모니터링')+'</div>'
    + '<div style="font-size:9px;color:var(--t3);font-style:italic;margin-bottom:14px">'+(isEn?'Does NOT affect economic verdict above' : '위 경제성 판정에 영향 없음')+'</div>';

  // ⑤ Compliance Checklist (고정 2개 항목)
  if (complianceItems.length > 0) {
    var compHtml = '';
    complianceItems.forEach(function(r) {
      compHtml += '<div style="display:flex;gap:10px;padding:10px 12px;background:var(--surface2);border:1px solid rgba(255,255,255,.05);border-radius:var(--r-md);margin-bottom:6px">'
        + '<div style="flex-shrink:0;width:22px;height:22px;display:flex;align-items:center;justify-content:center;background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.35);border-radius:50%;margin-top:1px;font-size:11px">🔍</div>'
        + '<div style="flex:1">'
        +   '<div style="display:flex;align-items:center;gap:8px;margin-bottom:3px">'
        +     '<span style="font-size:11px;font-weight:700;color:var(--t1)">'+(r.title||'')+'</span>'
        +     '<span style="font-size:8px;font-weight:700;color:var(--amber);letter-spacing:.06em;padding:1px 6px;border:1px solid var(--amber);border-radius:10px">'+(r.severity||'WATCH').toUpperCase()+'</span>'
        +     '<span style="font-size:8px;color:var(--t3);margin-left:auto">컴플라이언스팀 관리</span>'
        +   '</div>'
        +   '<div style="font-size:10.5px;color:var(--t3);line-height:1.65">'+(r.detail||'')+'</div>'
        + '</div></div>';
    });
    html += section(L.compliance, compHtml, L.compliance_sub);
  }

  // ⑥ AI Risks (프로젝트별 동적)
  if (aiRisks.length > 0) {
    var riskHtml = '';
    aiRisks.forEach(function(r, i) {
      var title  = typeof r === 'object' ? (r.title||'') : r;
      var detail = typeof r === 'object' ? (r.detail||'') : '';
      var sev    = typeof r === 'object' ? (r.severity||'') : '';
      var sc = sevColor(sev);
      var num = String(i+1).padStart(2,'0');
      riskHtml += '<div style="display:flex;gap:14px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.05)">'
        + '<div style="font-size:10px;font-weight:800;color:var(--t3);flex-shrink:0;margin-top:2px;font-variant-numeric:tabular-nums">'+num+'</div>'
        + '<div style="flex:1">'
        +   '<div style="display:flex;align-items:center;gap:8px;margin-bottom:3px">'
        +     '<span style="font-size:11.5px;font-weight:700;color:var(--t1)">'+title+'</span>'
        +     (sev ? '<span style="font-size:9px;font-weight:700;color:'+sc+';letter-spacing:.06em">'+sev.toUpperCase()+'</span>' : '')
        +   '</div>'
        +   (detail ? '<div style="font-size:11px;color:var(--t3);line-height:1.7">'+detail+'</div>' : '')
        + '</div></div>';
    });
    html += section(L.risks, riskHtml, L.risks_sub);
  }

  html += '</div>';  // SECTION B 닫기

  // ══════════════════════════════════════════════
  // SECTION C — Recommendation
  // ══════════════════════════════════════════════
  html += '<div style="padding:16px 18px;background:linear-gradient(135deg,rgba(37,99,235,.08) 0%,rgba(139,92,246,.05) 100%);border:1px solid rgba(37,99,235,.2);border-radius:var(--r-lg)">'
    + '<div style="font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--blue-h);margin-bottom:10px">💡 C. '+L.rec+'</div>'
    + '<div style="font-size:12px;color:var(--t1);line-height:1.9">'+rec+'</div>'
    + '</div>';

  res.innerHTML = html;
}

// ── CF 패턴 해석 (Cash Flow 탭 전용, 간단한 인사이트)
async function valRunCFInterp() {
  var detail = window._cfDetail;
  var vals   = window._cfVals;
  var btn    = document.getElementById('cf-interp-btn');
  var resEl  = document.getElementById('cf-interp-result');
  var body   = document.getElementById('cf-interp-body');
  if (!detail || !vals || !vals.length) {
    if (body) body.innerHTML = '<span style="color:var(--t3)">'+(currentLang==='en'?'Please run Calculate first.':'Please run Calculate first.')+'</span>';
    if (resEl) resEl.style.display = 'block';
    return;
  }
  if (btn) { btn.textContent = '⏳ 해석 중...'; btn.disabled = true; btn.style.opacity = '.6'; }
  if (resEl) resEl.style.display = 'block';
  if (body) body.innerHTML = '<span style="color:var(--t3)">Claude가 CF 패턴을 분석 중입니다...</span>';

  var cfText = detail.slice(0, 10).map(function(d, i) {
    return 'Y' + d.yr + ' $' + (vals[i]/1000).toFixed(1) + 'M';
  }).join(', ');
  var projName = (document.getElementById('val-proj-select')||{}).value || '프로젝트';

  try {
    var data = await apiCall('POST', '/valuation/analyze-cf', {
      cf_text: cfText,
      project_name: projName,
      mode: 'interp',
      lang: (window._cfLang || 'kr')
    });
    if (!data || !data.ok) throw new Error('Analysis failed');
    // 응답 파싱
    var raw = data.result || '';
    var parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch(e) {
      // 코드블록 제거 후 재시도
      var m = raw.match(/\{[\s\S]*\}/);
      if (m) try { parsed = JSON.parse(m[0]); } catch(e2) {}
    }
    if (!parsed || !parsed.insights) {
      if (body) body.innerHTML = '<span style="color:var(--red)">AI 응답 파싱 실패. 재시도해주세요.</span>';
      return;
    }
    // 렌더링
    function esc(s) { return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
    var html = parsed.insights.map(function(ins, i) {
      var dot = ['🔹','🔸','🔺','🔻'][i % 4];
      return '<div style="display:flex;gap:8px;margin-bottom:6px"><span style="flex-shrink:0">'+dot+'</span><div><strong style="color:var(--t1)">'+esc(ins.title||'')+'</strong> — <span style="color:var(--t2)">'+esc(ins.detail||'')+'</span></div></div>';
    }).join('');
    if (body) body.innerHTML = html;
  } catch(e) {
    var safe = String(e.message||'').replace(/</g,'&lt;');
    if (body) body.innerHTML = '<span style="color:var(--red)">⚠️ 실패: '+safe+'</span>';
  } finally {
    if (btn) { btn.textContent = '✨ AI 해석'; btn.disabled = false; btn.style.opacity = '1'; }
  }
}

async function valRunCFAnalysis(lang) {
  var detail = window._cfDetail;
  var vals   = window._cfVals;
  if (!detail || !vals) return;
  if (!lang) lang = window._cfLang || 'kr';

  var btn = document.getElementById('cf-ai-btn');
  var res = document.getElementById('cf-ai-result');
  if (btn) { btn.textContent = '⏳ Analyzing...'; btn.disabled = true; btn.style.opacity = '.6'; }
  if (res) res.innerHTML = '<span style="color:var(--t3)">Claude is analyzing...</span>';

  var cfText = detail.map(function(d, i) {
    return 'Y' + d.yr
      + ' | Sponsor CF $' + (vals[i]/1000).toFixed(1) + 'M'
      + ' | EBITDA $' + (d.ebitda/1000).toFixed(1) + 'M'
      + ' | DS $' + (d.ds/1000).toFixed(1) + 'M'
      + (d.aug > 0 ? ' | BESS증설 -$' + (d.aug/1000).toFixed(1) + 'M' : '');
  }).join(' / ');

  function tv(id){ var el=document.getElementById(id); return el?el.textContent.trim():''; }
  // 프로젝트 ID → 실제 이름 변환 (PROJECTS 배열 참조)
  var projId = (document.getElementById('val-proj-select')||{}).value || '';
  var projMeta = (typeof PROJECTS !== 'undefined') ? PROJECTS.find(function(p){ return p.id === projId; }) : null;
  var projName = projMeta ? projMeta.name : projId;
  var ctx = 'Sponsor IRR: '+tv('vo-sirr')+' | Dev Margin: '+tv('vo-dev-margin')
           +' | CAPEX: '+tv('vo-capex')+' | Debt: '+tv('vo-debt')
           +' | TE: '+tv('vo-te')+' | Sponsor Eq: '+tv('vo-eq')
           +' | PPA: '+tv('vo-ppa')+' | BESS Toll: '+tv('vo-toll');

  // 시장 데이터 컨텍스트 수집 (FRED + LevelTen + Peer IRR)
  var marketContext = {};
  try {
    var md = window._marketData;
    if (md && md.series) {
      var fmtRate = function(k){
        var s = md.series[k];
        if (!s || !s.ok || !s.data) return null;
        return s.label + ': ' + s.data.latest.toFixed(2) + (s.unit==='%'?'%':'');
      };
      var rateBits = ['us_10y','us_2y','fed_funds','bbb_spread'].map(fmtRate).filter(Boolean);
      if (rateBits.length) marketContext.rates_summary = rateBits.join(', ') + ' (as of ' + (md.fetched_at||'').slice(0,10) + ')';
    }
    var lt = window._levelTenData;
    if (lt && Object.keys(lt).length) {
      var latestQ = Object.keys(lt).sort().reverse()[0];
      var ltData = lt[latestQ] || {};

      // 프로젝트 ISO 추출
      var projIdLt = document.getElementById('val-proj-select');
      projIdLt = projIdLt ? projIdLt.value : '';
      var projMetaLt = (window.PROJECTS||[]).find(function(p){return p.id===projIdLt;}) || {};
      var projISO = (projMetaLt.iso||'').toUpperCase();

      // 지역 해석 (WECC sub-region, SERC, LevelTen 커버 여부)
      var regionInfo = (typeof valResolveProjectRegion === 'function')
        ? valResolveProjectRegion(projMetaLt)
        : { levelten_covered: true, levelten_region: projISO, sub_region: projISO, display: projISO };
      marketContext.levelten_covered = regionInfo.levelten_covered;
      marketContext.region_display = regionInfo.display;
      marketContext.sub_region = regionInfo.sub_region || '';
      // LevelTen 매칭용 ISO (CAISO/ERCOT/... 또는 null for WECC/SERC)
      var ltMatchISO = regionInfo.levelten_region;

      // 새 스키마 우선, legacy fallback
      var solarISOArr = ltData.solar_iso || [];
      var storageISOArr = ltData.storage_iso || [];
      if (!solarISOArr.length && ltData.entries) {
        solarISOArr = ltData.entries.filter(function(e){return e.tech==='solar';});
      }
      if (!storageISOArr.length && ltData.entries) {
        storageISOArr = ltData.entries.filter(function(e){return e.tech==='storage';});
      }

      var parts = [];
      // 우리 ISO의 Solar P25 (LevelTen 커버일 때만 직접 매칭)
      var ourISORow = ltMatchISO ? solarISOArr.find(function(e){return (e.region||'').toUpperCase()===ltMatchISO;}) : null;
      if (ourISORow && ourISORow.p25) {
        var qoqTxt = ourISORow.qoq_pct!=null ? ' (QoQ '+(ourISORow.qoq_pct>=0?'+':'')+ourISORow.qoq_pct.toFixed(1)+'%)' : '';
        parts.push('Our ISO ('+ltMatchISO+') Solar P25: $'+Number(ourISORow.p25).toFixed(2)+'/MWh'+qoqTxt);
      }
      // 전 대륙 Solar Continental (참고)
      var cont = ltData.solar_continental || {};
      if (cont.p25) {
        parts.push('Solar Continental P25: $'+Number(cont.p25).toFixed(2)+'/MWh');
      }
      // Market-Averaged Continental (대용 비교용 — 특히 LevelTen 미커버 지역에 중요)
      var contAvg = ltData.solar_continental_avg || {};
      if (contAvg.p25) {
        var avgParts = ['Market-Avg Continental P25: $'+Number(contAvg.p25).toFixed(2)+'/MWh'];
        if (contAvg.qoq_pct != null) avgParts.push('QoQ '+(contAvg.qoq_pct>=0?'+':'')+contAvg.qoq_pct.toFixed(1)+'%');
        if (contAvg.yoy_pct != null) avgParts.push('YoY '+(contAvg.yoy_pct>=0?'+':'')+contAvg.yoy_pct.toFixed(1)+'%');
        marketContext.continental_avg_summary = avgParts.join(' · ');
      }
      // 우리 ISO의 BESS Storage (LevelTen Storage Index - 공식 데이터, 커버 ISO만)
      var ourISOStorage = ltMatchISO ? storageISOArr.find(function(e){return (e.region||'').toUpperCase()===ltMatchISO;}) : null;
      if (ourISOStorage) {
        // 새 스키마: median/min/max 활용
        var medVal = ourISOStorage.median != null ? ourISOStorage.median : ourISOStorage.p50;
        var rangeTxt = '';
        if (ourISOStorage.min != null && ourISOStorage.max != null) {
          rangeTxt = ' range $'+Number(ourISOStorage.min).toFixed(1)+'-$'+Number(ourISOStorage.max).toFixed(1);
        }
        // 별도 키로 주입: levelten_storage_summary (공식 데이터 강조)
        var stParts = [ltMatchISO+' Storage Index ($/kW-mo):'];
        if (ourISOStorage.p25 != null) stParts.push('P25 $'+Number(ourISOStorage.p25).toFixed(1));
        if (medVal != null) stParts.push('Median $'+Number(medVal).toFixed(1));
        if (ourISOStorage.p75 != null) stParts.push('P75 $'+Number(ourISOStorage.p75).toFixed(1));
        marketContext.levelten_storage_summary = stParts.join(' ') + rangeTxt;
      } else if (ltData.storage_available === false) {
        parts.push('BESS 가격 데이터 미제공 (본 리포트에 포함되지 않음)');
      }
      // 다른 주요 ISO Solar P25 (비교용)
      var otherSolar = solarISOArr.filter(function(e){return (e.region||'').toUpperCase()!==(ltMatchISO||'');})
                                   .slice(0,3).map(function(e){return e.region+' $'+Number(e.p25).toFixed(0);});
      if (otherSolar.length) {
        parts.push('Other ISO Solar P25: '+otherSolar.join(', '));
      }

      if (parts.length) {
        marketContext.levelten_summary = '[' + latestQ + '] ' + parts.join(' | ');
      }
    }

    // ── BESS Tolling AI Research 주입 (프로젝트 ISO + duration 기준) ──
    var bessR = window._bessResearch;
    if (bessR && bessR.iso_data && bessR.iso_data.length) {
      var projIdBess = document.getElementById('val-proj-select');
      projIdBess = projIdBess ? projIdBess.value : '';
      var projMetaBess = (window.PROJECTS||[]).find(function(p){return p.id===projIdBess;}) || {};
      var projISOBess = (projMetaBess.iso||'').toUpperCase();

      // 지역 해석으로 sub_region 계산 (WECC_RM 등)
      var regionInfoBess = (typeof valResolveProjectRegion === 'function')
        ? valResolveProjectRegion(projMetaBess)
        : { levelten_region: projISOBess, sub_region: projISOBess };
      var bessMatchKey = (regionInfoBess.levelten_region || regionInfoBess.sub_region || projISOBess).toUpperCase();

      // 우리 BESS duration 추정 (시간 단위; bess_mw·h / bess_mw)
      var ourLastData = window._lastValData || {};
      var ourAssum = ourLastData.assumptions || {};
      var bessMW = ourAssum.bess_mw || 0;
      var bessMWh = ourAssum.bess_mwh || 0;
      var ourDuration = bessMW > 0 ? Math.round(bessMWh / bessMW) : 4;  // 기본 4h
      if (ourDuration < 2) ourDuration = 2;
      if (ourDuration > 8) ourDuration = 8;

      // 매칭: ISO 우선 (CAISO/ERCOT 등), 실패 시 sub_region (WECC_RM 등)
      var ourIsoBess = bessR.iso_data.find(function(i){return (i.region||'').toUpperCase()===bessMatchKey;});
      var bessBits = [];
      if (ourIsoBess) {
        // 우리 duration과 가장 가까운 것 선택
        var ourDurData = (ourIsoBess.durations||[]).reduce(function(best, cur){
          if (!best) return cur;
          return Math.abs(cur.hours - ourDuration) < Math.abs(best.hours - ourDuration) ? cur : best;
        }, null);
        if (ourDurData) {
          bessBits.push(bessMatchKey+' BESS '+ourDurData.hours+'h market: $'+ourDurData.p25+'-$'+ourDurData.p75+'/kW-mo (AI research, '+ourDurData.confidence+' confidence)');
        }
        if (ourIsoBess.market_note) {
          bessBits.push('Market note: '+ourIsoBess.market_note);
        }
      }
      // 다른 지역 2-3개 (비교용, 4h 기준)
      var otherISOBess = bessR.iso_data.filter(function(i){return (i.region||'').toUpperCase()!==bessMatchKey;}).slice(0,3);
      if (otherISOBess.length) {
        var other4h = otherISOBess.map(function(i){
          var d4 = (i.durations||[]).find(function(x){return x.hours===4;}) || (i.durations||[])[0];
          return d4 ? i.region+' '+d4.hours+'h $'+d4.p25+'-$'+d4.p75 : null;
        }).filter(Boolean);
        if (other4h.length) bessBits.push('Other regions: '+other4h.join(', '));
      }
      if (bessBits.length) {
        marketContext.bess_tolling_summary = bessBits.join(' | ');
        marketContext.our_bess_duration = ourDuration;
      }
    }
  } catch(e) {}

  try {
    var thr = valGetThresholds();
    // Dev Margin c/Wp 계산
    var devM_raw = 0;
    var devMStr = tv('vo-dev-margin'); // e.g. "$39.8M"
    var mwac = parseFloat((document.getElementById('vi-pv-mwac')||{}).value)||199;
    var devMval = parseFloat(devMStr.replace(/[^0-9.]/g,''))||0;
    var devM_cwp = mwac > 0 ? (devMval*1000/(mwac*1000)*100).toFixed(1) : '—';

    var data = await apiCall('POST', '/valuation/analyze-cf', {
      cf_text: cfText,
      project_name: projName,
      context: ctx,
      market_context: marketContext,
      lang: lang,
      thresholds: {
        dev_margin_cwp: thr.dev_margin_cwp,
        sponsor_irr_pct: thr.sponsor_irr_pct,
        itc_min_pct: thr.itc_min_pct
      },
      current_metrics: {
        dev_margin_cwp: devM_cwp,
        sponsor_irr_pct: tv('vo-sirr').replace('%','').trim(),
        sponsor_irr_basis: 'After-TE-Flip, Full Life (useful life)',  // IC가 오해 없이 인용하도록
        unlevered_irr_pct: (function(){
          // Unlevered Pre-Tax IRR 추출 — outputs에서 직접
          var d = window._lastValData||{}, o = d.outputs||{};
          var v = o.sponsor_irr_unlevered_pretax || o.unlevered_irr;
          return (v!=null) ? (v*100).toFixed(2) : null;
        })(),
        wacc_pct: (function(){
          var d = window._lastValData||{}, o = d.outputs||{};
          return (o.wacc!=null) ? (o.wacc*100).toFixed(2) : null;
        })(),
        sponsor_npv_m: (function(){
          var d = window._lastValData||{}, o = d.outputs||{};
          return (o.sponsor_npv!=null) ? (o.sponsor_npv/1000).toFixed(1) : null;  // $K → $M
        })(),
        project_npv_m: (function(){
          var d = window._lastValData||{}, o = d.outputs||{};
          return (o.project_npv!=null) ? (o.project_npv/1000).toFixed(1) : null;
        })(),
        itc_rate_pct: (document.getElementById('vi-credit-val')||{}).value||'30',
        ppa_term: (document.getElementById('vi-ppa-t')||{}).value||'25',
        toll_term: (document.getElementById('vi-toll-t')||{}).value||'20',
        bess_toll: parseFloat((document.getElementById('vi-toll-p')||{}).value) || null,
        pv_mwac: mwac
      }
    });
    if (!data || !data.ok) throw new Error('API 오류');

    var parsed = JSON.parse(data.result);
    // 단일 언어 캐싱
    if (lang === 'en') window._cfAnalysisEn = parsed;
    else               window._cfAnalysisKr = parsed;
    window._cfLang = lang;

    valRenderCFAnalysis(parsed, lang);
    if (btn) { btn.textContent = '↻ Refresh'; btn.disabled = false; btn.style.opacity = '1'; btn.style.cursor = 'pointer'; }
  } catch(e) {
    if (res) res.innerHTML = '<span style="color:var(--red)">⚠️ Analysis failed: ' + e.message + '</span>';
    if (btn) { btn.textContent = '↻ 재시도'; btn.disabled = false; btn.style.opacity = '1'; btn.style.cursor = 'pointer'; }
  }
}

// window 전역 노출 (HTML onclick 등 인라인 이벤트에서 호출)
window.valRunScenarios = valRunScenarios;
window.valRunBreakEven = valRunBreakEven;
window.valRunCFAnalysis = valRunCFAnalysis;
window.valRunCFInterp = valRunCFInterp;
window.valCFLang = valCFLang;
