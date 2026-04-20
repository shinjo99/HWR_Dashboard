/* ============================================================
   js/pages/valuation/benchmark.js
   ============================================================
   Valuation page — Benchmark tab (LevelTen, BESS, Market, Peers)
   
   Functions:
     Internal (our projects):
       - valLoadBenchmark: 전체 프로젝트 비교 테이블
       - valLoadBenchmarkProject: 특정 프로젝트 로드
       - valSwitchBmSub: Internal/External 탭 전환
       - valOnBenchmarkOpen: Benchmark 탭 진입 훅
       - valLoadPeerIRR: Peer IRR 비교
     
     External (LevelTen Solar PPA market):
       - valLoadLevelTen, valOpenLevelTenModal, valToggleLevelTen
       - valRenderLevelTenQuarter: Quarter 기준 렌더
       - valUploadLevelTen: 관리자 업로드
     
     Market (LevelTen 파생 데이터):
       - valLoadMarketBenchmark: 시장 벤치마크 로드
       - valRenderVsMarket: Current project vs market 렌더
       - valBuildMarketContextCard: IC Opinion용 시장 포지셔닝 카드
       - valResolveProjectRegion: 지역 해석 helper
     
     BESS Research (AI 기반):
       - valRunBessResearch, valLoadBessResearch
       - valRenderBessResearch, valToggleBessResearch
   
   Extracted from index.html (Phase 3 Step 3-C refactoring)
   Generated: Apr 19, 2026
   ============================================================ */

async function valLoadBenchmark() {
  _bmLoaded = false;
  var loadEl = document.getElementById('val-bm-loading');
  var tableEl = document.getElementById('val-bm-table');
  var statsEl = document.getElementById('val-bm-stats');
  var chartEl = document.getElementById('val-bm-chart');
  if(loadEl) loadEl.style.display='flex';
  if(tableEl) tableEl.style.display='none';

  var token = window._authToken || localStorage.getItem('hwr_token');
  var currentProjId = (document.getElementById('val-proj-select')||{}).value||'';

  try {
    var allData = await apiCall('GET', '/valuation');
    if (!allData) throw new Error('No data');

    var rowsRaw = [];
    Object.keys(allData).forEach(function(pid) {
      var d = allData[pid];
      if (!d || !d.outputs) return;
      var o = d.outputs; var a = d.assumptions||{};
      // Match project name + ISO from PROJECTS array
      var projName = pid;
      var projISO = '';
      if (typeof PROJECTS !== 'undefined') {
        var found = PROJECTS.find(function(p){ return p.id===pid||(p.id||'').replace(/[/.]/g,'_')===pid; });
        if (found) { projName = found.name || pid; projISO = (found.iso||'').toUpperCase(); }
      }
      rowsRaw.push({
        pid: pid,
        name: projName,
        iso: projISO || '—',
        ppa: o.ppa_price||a.ppa_price||0,
        ppa_term: o.ppa_term||a.ppa_term||0,
        bess_toll: o.bess_toll||a.bess_toll||0,
        capex: (o.capex_total||0)/1000,
        dev_margin: (o.dev_margin||0)/1000,
        sponsor_irr: o.sponsor_irr||0,
        ebitda_yield: o.ebitda_yield||0,
        sponsor_eq: (o.sponsor_equity||0)/1000,
        pv_mwac: a.pv_mwac||0,
        uploaded_at: (d.uploaded_at||'').substring(0,10),
        filename: d.filename||'',
        isCurrent: pid === currentProjId || pid === currentProjId.replace(/[/.]/g,'_')
      });
    });

    // 중복 제거: 같은 이름의 프로젝트는 가장 최신 업로드 1개만 유지
    var dedupMap = {};
    rowsRaw.forEach(function(r) {
      var key = r.name.toLowerCase().trim();
      if (!dedupMap[key] || r.uploaded_at > dedupMap[key].uploaded_at) {
        dedupMap[key] = r;
      }
    });
    var rows = Object.values(dedupMap);

    // 현재 선택된 ISO 필터 적용
    var isoFilter = window._bmIsoFilter || 'ALL';
    if (isoFilter !== 'ALL') {
      rows = rows.filter(function(r){ return r.iso === isoFilter; });
    }

    // ISO별 그룹 카운트 (탭 표시용)
    var isoCounts = { ALL: Object.values(dedupMap).length };
    Object.values(dedupMap).forEach(function(r) {
      isoCounts[r.iso] = (isoCounts[r.iso] || 0) + 1;
    });
    window._bmIsoCounts = isoCounts;

    if (!rows.length) {
      if(loadEl) loadEl.innerHTML='<div class="val-empty-icon">📭</div><div class="val-empty-title">'+(currentLang==='en'?'No Valuation data uploaded yet':'No Valuation data uploaded yet')+'</div>';
      return;
    }

    // Sort by sponsor IRR desc
    rows.sort(function(a,b){ return b.sponsor_irr - a.sponsor_irr; });

    // Stats
    var irrs = rows.filter(function(r){return r.sponsor_irr>0;}).map(function(r){return r.sponsor_irr;});
    var avgIRR = irrs.length ? irrs.reduce(function(a,b){return a+b;},0)/irrs.length : 0;
    var maxIRR = irrs.length ? Math.max.apply(null,irrs) : 0;
    var avgPPA = rows.filter(function(r){return r.ppa>0;}).reduce(function(s,r){return s+r.ppa;},0) / (rows.filter(function(r){return r.ppa>0;}).length||1);
    var avgMargin = rows.filter(function(r){return r.dev_margin>0;}).reduce(function(s,r){return s+r.dev_margin;},0) / (rows.filter(function(r){return r.dev_margin>0;}).length||1);

    if(statsEl) statsEl.innerHTML = [
      {lbl:'Projects', val:rows.length, c:'var(--blue-h)'},
      {lbl:'Avg Sponsor IRR', val:(avgIRR*100).toFixed(2)+'%', c:'var(--green)'},
      {lbl:'Avg PPA', val:'$'+avgPPA.toFixed(2)+'/MWh', c:'var(--amber)'},
      {lbl:'Avg Dev Margin', val:'$'+avgMargin.toFixed(1)+'M', c:'var(--purple)'},
    ].map(function(s){
      return '<div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--r-lg);padding:12px 14px">' +
        '<div style="font-size:9px;color:var(--t3);font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin-bottom:6px">'+s.lbl+'</div>'+
        '<div style="font-size:18px;font-weight:800;color:'+s.c+';font-variant-numeric:tabular-nums">'+s.val+'</div>'+
      '</div>';
    }).join('');

    // Mini IRR bar chart
    if(chartEl && irrs.length) {
      var maxVal = Math.max(maxIRR*100, 15);
      chartEl.innerHTML = '<div style="font-size:9px;color:var(--t3);font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin-bottom:8px">Sponsor IRR Distribution</div>' +
        rows.filter(function(r){return r.sponsor_irr>0;}).map(function(r){
          var pct = (r.sponsor_irr*100/maxVal*100).toFixed(1);
          var col = r.sponsor_irr>=0.10?'var(--green)':r.sponsor_irr>=0.07?'var(--amber)':'var(--red)';
          var isCur = r.isCurrent;
          return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:3px;cursor:pointer" onclick="valLoadBenchmarkProject(this.dataset.pid)" data-pid="'+r.pid+'" title="'+r.name+'">' +
            '<div style="width:100px;font-size:9px;color:'+(isCur?'var(--t1)':'var(--t3)')+';font-weight:'+(isCur?'700':'400')+';overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+r.name+'</div>'+
            '<div style="flex:1;height:14px;background:rgba(255,255,255,.04);border-radius:3px;overflow:hidden">'+
              '<div style="width:'+pct+'%;height:100%;background:'+col+';border-radius:3px;opacity:'+(isCur?'1':'0.7')+';transition:width .4s ease"></div>'+
            '</div>'+
            '<div style="width:44px;text-align:right;font-size:10px;font-weight:700;color:'+col+'">'+( r.sponsor_irr*100).toFixed(2)+'%</div>'+
          '</div>';
        }).join('');
    }

    // Table
    // ISO 필터 탭 먼저 렌더
    var isoTabsHtml = '<div style="display:flex;gap:4px;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid var(--border);flex-wrap:wrap">';
    var isoOrder = ['ALL','ERCOT','CAISO','PJM','MISO','SPP','ISO-NE','NYISO','AESO','—'];
    isoOrder.forEach(function(iso) {
      var cnt = isoCounts[iso] || 0;
      if (iso !== 'ALL' && !cnt) return;
      var isActive = iso === isoFilter;
      var lbl = iso === 'ALL' ? 'All' : iso === '—' ? 'No ISO' : iso;
      isoTabsHtml += '<button onclick="valFilterByISO(\''+iso+'\')" style="padding:4px 10px;background:'+(isActive?'var(--blue-d)':'transparent')+';border:1px solid '+(isActive?'var(--blue-d)':'var(--border2)')+';border-radius:14px;font-size:10px;color:'+(isActive?'#fff':'var(--t2)')+';cursor:pointer;font-family:var(--font);font-weight:'+(isActive?'700':'500')+'">'+lbl+' ('+cnt+')</button>';
    });
    isoTabsHtml += '</div>';

    var cols = ['Project','ISO','PPA ($/MWh)','PPA Term','BESS Toll','CAPEX ($M)','Dev Margin','Sponsor IRR','EBITDA Yield','Upload Date'];
    var html = isoTabsHtml + '<table style="width:100%;border-collapse:collapse;font-size:11px;font-variant-numeric:tabular-nums">';
    html += '<thead><tr style="border-bottom:1px solid var(--border)">';
    cols.forEach(function(col,i){
      html += '<th style="padding:9px 12px;text-align:'+(i===0||i===1?'left':'right')+';font-size:9px;color:var(--t3);font-weight:700;letter-spacing:.06em;background:var(--surface2);white-space:nowrap">'+col+'</th>';
    });
    html += '</tr></thead><tbody>';

    // 상위 20개 제한 (IRR 내림차순 정렬 기반)
    var displayRows = rows.slice(0, 20);
    displayRows.forEach(function(r) {
      var isCur = r.isCurrent;
      var bg = isCur ? 'background:rgba(37,99,235,.08);' : '';
      var sirrColor = r.sponsor_irr>=0.10?'var(--green)':r.sponsor_irr>=0.07?'var(--amber)':'var(--red)';
      html += '<tr style="border-bottom:1px solid rgba(255,255,255,.04);'+bg+'cursor:pointer" onclick="valLoadBenchmarkProject(this.dataset.pid)" data-pid="'+r.pid+'" title="Click to load">';
      html += '<td style="padding:8px 12px;font-weight:'+(isCur?'700':'400')+';color:var(--t1)">'+r.name+(isCur?' ◀':'')+'</td>';
      html += '<td style="padding:8px 12px;color:var(--t3);font-size:10px;font-weight:600">'+r.iso+'</td>';
      html += '<td style="padding:8px 12px;text-align:right;color:var(--t2)">'+(r.ppa?'$'+r.ppa.toFixed(2):'—')+'</td>';
      html += '<td style="padding:8px 12px;text-align:right;color:var(--t2)">'+(r.ppa_term?r.ppa_term+'yr':'—')+'</td>';
      html += '<td style="padding:8px 12px;text-align:right;color:var(--t2)">'+(r.bess_toll?'$'+r.bess_toll.toFixed(2):'—')+'</td>';
      html += '<td style="padding:8px 12px;text-align:right;color:var(--t2)">'+(r.capex?'$'+r.capex.toFixed(0)+'M':'—')+'</td>';
      html += '<td style="padding:8px 12px;text-align:right;font-weight:700;color:var(--amber)">'+(r.dev_margin?'$'+r.dev_margin.toFixed(1)+'M':'—')+'</td>';
      html += '<td style="padding:8px 12px;text-align:right;font-weight:700;color:'+sirrColor+'">'+(r.sponsor_irr?(r.sponsor_irr*100).toFixed(2)+'%':'—')+'</td>';
      html += '<td style="padding:8px 12px;text-align:right;color:var(--t2)">'+(r.ebitda_yield?r.ebitda_yield.toFixed(1)+'%':'—')+'</td>';
      html += '<td style="padding:8px 12px;text-align:right;font-size:10px;color:var(--t3)">'+r.uploaded_at+'</td>';
      html += '</tr>';
    });

    // Average row
    html += '<tr style="border-top:1px solid var(--border2);background:var(--surface2)">';
    html += '<td style="padding:8px 12px;font-size:9px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.06em">Average ('+displayRows.length+')</td>';
    html += '<td style="padding:8px 12px"></td>';
    html += '<td style="padding:8px 12px;text-align:right;font-weight:600;color:var(--t2)">$'+avgPPA.toFixed(2)+'</td>';
    html += '<td colspan="3" style="padding:8px 12px"></td>';
    html += '<td style="padding:8px 12px;text-align:right;font-weight:700;color:var(--amber)">$'+avgMargin.toFixed(1)+'M</td>';
    html += '<td style="padding:8px 12px;text-align:right;font-weight:700;color:var(--green)">'+(avgIRR*100).toFixed(2)+'%</td>';
    html += '<td colspan="2"></td></tr>';
    html += '</tbody></table>';

    // 20개 초과 시 힌트
    if (rows.length > 20) {
      html += '<div style="font-size:9px;color:var(--t3);margin-top:6px;text-align:center;font-style:italic">Total '+rows.length+' · Top 20 by IRR shown (refine via ISO filter or search)</div>';
    }

    tableEl.innerHTML = html;
    if(loadEl) loadEl.style.display='none';
    if(tableEl) tableEl.style.display='block';
    _bmLoaded = true;
  } catch(e) {
    if(loadEl) loadEl.innerHTML='<div class="val-empty-icon">⚠️</div><div class="val-empty-title">'+(currentLang==='en'?'Load failed: ':'Load failed: ')+e.message+'</div>';
  }
}

async function valLoadBenchmarkProject(pid) {
  var safeId = pid.replace(/[/.]/g,'_');
  // 프로젝트 드롭다운 변경
  var sel = document.getElementById('val-proj-select');
  if (sel) {
    // Find matching option
    for(var i=0;i<sel.options.length;i++){
      if(sel.options[i].value===pid||sel.options[i].value.replace(/[/.]/g,'_')===safeId){
        sel.value=sel.options[i].value; break;
      }
    }
  }
  // Load latest valuation data
  try {
    var data = await apiCall('GET', '/valuation/'+safeId+'/latest');
    if(data) {
      valDisplayData(data, safeId);
      // Switch to overview
      var overviewBtn = document.querySelector('.val-tab');
      if(overviewBtn) valSwitchTab('overview', overviewBtn);
    }
  } catch(e) { console.error(e); }
}

// 탭 진입 시 — 기본은 Internal 로드
function valOnBenchmarkOpen() {
  if (!_bmLoaded) valLoadBenchmark();
  // 이전에 External 상태였으면 External로 복귀
  var extActive = document.getElementById('bm-sub-external');
  if (extActive && extActive.classList.contains('active')) {
    valSwitchBmSub('external');
  }
}

async function valLoadPeerIRR() {
  var displayEl = document.getElementById('bm-peer-display');
  if (!displayEl) return;
  var peer = _defaultPeerIRR;
  try {
    var data = await apiCall('GET', '/benchmark/peer-irr');
    if (data && data.solar_min != null) {
      peer = data;
    }
  } catch(e) {}
  window._peerIRR = peer;

  function card(title, min, max, color) {
    return '<div style="background:var(--surface);border:1px solid var(--border);border-left:3px solid '+color+';border-radius:8px;padding:8px 10px">' +
      '<div style="font-size:8.5px;color:var(--t3);font-weight:700;letter-spacing:.06em;text-transform:uppercase;margin-bottom:4px">'+title+'</div>' +
      '<div style="font-size:14px;font-weight:800;color:var(--t1);font-variant-numeric:tabular-nums">'+min.toFixed(1)+'% ~ '+max.toFixed(1)+'%</div>' +
      '<div style="font-size:9px;color:var(--t3);margin-top:2px">Levered · Pre-Tax (IRR)</div>' +
      '</div>';
  }
  displayEl.innerHTML =
    card('Solar', peer.solar_min, peer.solar_max, 'var(--amber)') +
    card('Solar + BESS', peer.hybrid_min, peer.hybrid_max, 'var(--green)') +
    card('Wind', peer.wind_min, peer.wind_max, 'var(--blue-h)');

  if (peer.note) {
    displayEl.innerHTML += '<div style="grid-column:span 3;font-size:9px;color:var(--t3);margin-top:2px;padding:4px 2px;text-align:right;font-style:italic">'+peer.note.replace(/</g,'&lt;')+'</div>';
  }

  // vs 시장 비교 재렌더
  if (typeof valRenderVsMarket === 'function') valRenderVsMarket();
}

// ── LevelTen 섹션 접기/펴기 ──────────────────────────
function valToggleLevelTen() {
  var content = document.getElementById('bm-lt-content');
  var chev = document.getElementById('bm-lt-chevron');
  if (!content) return;
  var isOpen = content.style.display !== 'none';
  content.style.display = isOpen ? 'none' : 'block';
  if (chev) chev.style.transform = isOpen ? 'rotate(-90deg)' : 'rotate(0deg)';
}

// ── LevelTen 업로드 모달 열기 + 분기 옵션 생성 ──────
function valOpenLevelTenModal() {
  var modal = document.getElementById('bm-lt-modal');
  if (!modal) return;

  // 최근 12분기 자동 생성 (가장 최근 분기가 기본값)
  var qSel = document.getElementById('bm-lt-quarter');
  if (qSel && qSel.tagName === 'SELECT') {
    var now = new Date();
    var curQ = Math.floor(now.getMonth() / 3) + 1;
    var curY = now.getFullYear();
    var quarters = [];
    for (var i = 0; i < 12; i++) {
      quarters.push(curY + '-Q' + curQ);
      curQ--;
      if (curQ < 1) { curQ = 4; curY--; }
    }
    // 업로드된 분기는 제외 (이미 있는 것 → '(업로드됨)' 마크)
    var existing = window._levelTenData || {};
    qSel.innerHTML = '<option value="">— Select Quarter —</option>' +
      quarters.map(function(q) {
        var already = existing[q] ? ' ✓ Uploaded' : '';
        return '<option value="'+q+'">'+q+already+'</option>';
      }).join('');
  }

  // 파일 입력 리셋
  var fileIn = document.getElementById('bm-lt-file');
  if (fileIn) fileIn.value = '';
  var status = document.getElementById('bm-lt-upload-status');
  if (status) status.innerHTML = '';

  modal.style.display = 'flex';
}

// ── BESS Tolling AI Research 섹션 접기/펴기 ──────────
function valToggleBessResearch() {
  var content = document.getElementById('bm-bess-content');
  var chev = document.getElementById('bm-bess-chevron');
  if (!content) return;
  var isOpen = content.style.display !== 'none';
  content.style.display = isOpen ? 'none' : 'block';
  if (chev) chev.style.transform = isOpen ? 'rotate(-90deg)' : 'rotate(0deg)';
}

// ── BESS Tolling 리서치 실행 (Claude + web_search) ──
async function valRunBessResearch() {
  var btn = document.getElementById('bm-bess-research-btn');
  var content = document.getElementById('bm-bess-content');
  if (!btn || !content) return;

  if (!confirm('AI will research BESS tolling prices by ISO via web search. (30-60s, Claude API call)\n\nProceed?')) return;

  btn.textContent = '⏳ Researching...';
  btn.disabled = true;
  btn.style.opacity = '.6';

  content.style.display = 'block';
  content.innerHTML = '<div style="padding:40px 20px;text-align:center;color:var(--t3);font-size:11px">' +
    '<div style="font-size:28px;margin-bottom:10px">🔍</div>' +
    '<div style="font-weight:700;color:var(--t2);margin-bottom:4px">AI web search in progress</div>' +
    '<div>Researching Wood Mackenzie, BloombergNEF, ERCOT/CAISO reports, industry news...</div>' +
    '<div style="margin-top:8px;font-size:10px">Takes up to 3 minutes · Saved automatically when complete</div>' +
  '</div>';

  try {
    var data = await apiCall('POST', '/benchmark/bess-tolling/research', {});
    if (!data || !data.ok) throw new Error('API error');
    window._bessResearch = data.data;
    valRenderBessResearch(data.data);
  } catch(e) {
    content.innerHTML = '<div style="padding:20px;text-align:center;color:var(--red);font-size:11px">' +
      '⚠️ Research failed: ' + (e.message || 'Unknown error') +
    '</div>';
  } finally {
    btn.textContent = '🔍 AI Research';
    btn.disabled = false;
    btn.style.opacity = '1';
  }
}

// ── 저장된 BESS 리서치 결과 로드 ──
async function valLoadBessResearch() {
  try {
    var data = await apiCall('GET', '/benchmark/bess-tolling');
    if (data && data.iso_data) {
      window._bessResearch = data;
      valRenderBessResearch(data);
    }
  } catch(e) {}
}

// ── BESS 리서치 결과 렌더링 ──
function valRenderBessResearch(data) {
  var content = document.getElementById('bm-bess-content');
  var metaEl = document.getElementById('bm-bess-meta');
  if (!content || !data) return;

  function esc(s) {
    return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function fmt$(v) { return v==null ? '—' : '$' + Number(v).toFixed(2); }
  function confColor(c) { return c==='high' ? 'var(--green)' : c==='low' ? 'var(--red)' : 'var(--amber)'; }

  // 메타 정보 Updated
  if (metaEl) {
    var genDate = data.generated_at ? data.generated_at.slice(0,10) : '—';
    var iso_count = (data.iso_data || []).length;
    var confOverall = data.confidence_overall || 'medium';
    metaEl.innerHTML = 'Research ' + genDate + ' · ' + iso_count + ' ISOs · Overall confidence: <span style="color:' + confColor(confOverall) + ';font-weight:700">' + confOverall.toUpperCase() + '</span>';
  }

  var isoData = data.iso_data || [];
  if (!isoData.length) {
    content.innerHTML = '<div style="padding:20px;text-align:center;color:var(--t3);font-size:11px">' +
      '📭 No data. ' + (data.caveats || 'Research results are empty.') +
    '</div>';
    return;
  }

  // 프로젝트 지역 해석 (WECC sub-region 등)
  var projId = document.getElementById('val-proj-select');
  projId = projId ? projId.value : '';
  var projMeta = (window.PROJECTS||[]).find(function(p){return p.id===projId;}) || {};
  var regionInfo = (typeof valResolveProjectRegion === 'function')
    ? valResolveProjectRegion(projMeta)
    : { sub_region: (projMeta.iso||'').toUpperCase(), display: (projMeta.iso||'').toUpperCase(), levelten_region: (projMeta.iso||'').toUpperCase() };
  var ourISO = (projMeta.iso||'').toUpperCase();
  var ourMatchKey = (regionInfo.levelten_region || regionInfo.sub_region || ourISO).toUpperCase();

  // Our Project Toll + duration 추정
  var ourToll = parseFloat((document.getElementById('vi-toll-p')||{}).value) || null;
  var bessMW = parseFloat((document.getElementById('vi-ess-p')||{}).value) || 0;
  var bessMWh = parseFloat((document.getElementById('vi-ess-eq')||{}).value) || 0;
  var ourDur = bessMW > 0 && bessMWh > 0 ? Math.round(bessMWh / bessMW) : 4;
  if (ourDur < 2) ourDur = 2;
  if (ourDur > 8) ourDur = 8;

  var html = '';

  // ── A. 핵심 요약 + P25/P75 설명 ──
  html += '<div style="padding:10px 12px;background:linear-gradient(135deg,rgba(217,119,6,.08) 0%,rgba(245,158,11,.04) 100%);border:1px solid rgba(217,119,6,.2);border-radius:8px;margin-bottom:14px">';
  html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">';
  html += '<div style="font-size:10px;font-weight:700;color:var(--amber);letter-spacing:.04em">🔋 BESS Tolling Market Overview</div>';
  html += '<div style="font-size:9px;color:var(--t3)">Generated: '+esc((data.generated_at||'').slice(0,10))+'</div>';
  html += '</div>';
  if (data.methodology_note) {
    html += '<div style="font-size:10px;color:var(--t2);line-height:1.6;margin-top:4px">'+esc(data.methodology_note)+'</div>';
  }
  if (data.caveats) {
    html += '<div style="font-size:9.5px;color:var(--t3);font-style:italic;margin-top:6px;padding-top:6px;border-top:1px solid rgba(217,119,6,.15)">⚠️ '+esc(data.caveats)+'</div>';
  }
  // P25/P75 설명 (교육용)
  html += '<div style="margin-top:8px;padding:6px 10px;background:rgba(37,99,235,.06);border-left:2px solid var(--blue-h);border-radius:4px;font-size:9.5px;color:var(--t2);line-height:1.6">';
  html += '<b style="color:var(--blue-h)">📊 P25 / P75 How to read:</b> LevelTen Offer Percentile. ';
  html += '<b>P25</b> is the Bottom 25%ile of market offers (<span style="color:var(--green)">aggressive / low-priced offer</span>), ';
  html += '<b>P75</b> is the Top 25%ile (<span style="color:var(--red)">conservative / high-priced offer</span>). ';
  html += 'Near P25 is <b style="color:var(--green)">competitive pricing</b>; above P75 signals <b style="color:var(--red)">overpriced</b>.';
  html += '</div>';
  html += '</div>';

  // ── B-1. 우리 지역 대형 카드 (중앙) ──
  var ourIsoData = isoData.find(function(iso){return (iso.region||'').toUpperCase() === ourMatchKey;});
  if (ourIsoData) {
    var durs = ourIsoData.durations || [];
    var ourDurData = durs.reduce(function(best, cur){
      if (!best) return cur;
      return Math.abs(cur.hours - ourDur) < Math.abs(best.hours - ourDur) ? cur : best;
    }, null);

    html += '<div style="border:2px solid var(--blue-h);box-shadow:0 0 0 4px rgba(37,99,235,.08);border-radius:10px;padding:14px 16px;margin-bottom:14px;background:linear-gradient(135deg,var(--surface2) 0%,rgba(37,99,235,.04) 100%)">';

    // 헤더
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">';
    html += '<div>';
    html += '<div style="font-size:9px;font-weight:700;color:var(--blue-h);letter-spacing:.08em;margin-bottom:2px">📍 OUR REGION</div>';
    html += '<div style="font-size:16px;font-weight:800;color:var(--t1)">'+esc(ourIsoData.region)+'</div>';
    html += '<div style="font-size:10px;color:var(--t3);margin-top:2px">'+esc(regionInfo.display||ourIsoData.region)+'</div>';
    html += '</div>';
    html += '<div style="text-align:right">';
    html += '<div style="font-size:9px;color:var(--t3)">Our Project</div>';
    if (ourToll) {
      html += '<div style="font-size:18px;font-weight:800;color:var(--amber);font-variant-numeric:tabular-nums">$'+ourToll.toFixed(2)+'</div>';
      html += '<div style="font-size:9.5px;color:var(--t3)">/kW-mo · '+ourDur+'h</div>';
    } else {
      html += '<div style="font-size:13px;color:var(--t3);font-style:italic">No Toll input</div>';
    }
    html += '</div>';
    html += '</div>';

    // 우리 duration 기준 비교 하이라이트
    if (ourDurData && ourToll) {
      var cmp, cmpCol, cmpIcon;
      if (ourToll < ourDurData.p25) {
        cmpCol = 'var(--green)'; cmpIcon = '✓';
        cmp = '<b>Market Bottom</b> (below 25%ile) · Conservative / underpriced';
      } else if (ourToll > ourDurData.p75) {
        cmpCol = 'var(--red)'; cmpIcon = '⚠️';
        cmp = '<b>Above Market Top</b> (above 75%ile) · Room to renegotiate';
      } else {
        cmpCol = 'var(--amber)'; cmpIcon = '·';
        var pos = ((ourToll - ourDurData.p25) / (ourDurData.p75 - ourDurData.p25) * 100);
        cmp = '<b>Within Market Range</b> P25-P75 · Top ' + pos.toFixed(0) + '%ile position';
      }
      html += '<div style="padding:10px 14px;background:rgba(255,255,255,.04);border-left:3px solid '+cmpCol+';border-radius:0 6px 6px 0;margin-bottom:10px">';
      html += '<div style="font-size:9px;color:var(--t3);font-weight:700;letter-spacing:.06em;margin-bottom:2px">💡 Comparison Result ('+ourIsoData.region+' '+ourDurData.hours+'h basis)</div>';
      html += '<div style="font-size:11.5px;color:'+cmpCol+'">'+cmpIcon+' '+cmp+'</div>';
      // 수치 상세
      var diff = ourToll - ((ourDurData.p25 + ourDurData.p75) / 2);
      var diffPct = (diff / ((ourDurData.p25 + ourDurData.p75) / 2)) * 100;
      html += '<div style="font-size:10px;color:var(--t2);margin-top:4px;font-variant-numeric:tabular-nums">Ours <b>$'+ourToll.toFixed(2)+'</b> vs Median <b>$'+((ourDurData.p25+ourDurData.p75)/2).toFixed(2)+'</b> → '+(diff>=0?'+':'')+'$'+diff.toFixed(2)+' ('+(diffPct>=0?'+':'')+diffPct.toFixed(1)+'%)</div>';
      html += '</div>';
    }

    // Duration별 가격 테이블 (우리 duration 행 강조)
    if (durs.length) {
      html += '<table style="width:100%;border-collapse:collapse;font-size:11px;font-variant-numeric:tabular-nums">';
      html += '<thead><tr style="background:var(--surface3)">' +
        '<th style="padding:6px 10px;text-align:left;font-size:9px;color:var(--t3);font-weight:700">Duration</th>' +
        '<th style="padding:6px 10px;text-align:right;font-size:9px;color:var(--t3);font-weight:700">P25 (Low)</th>' +
        '<th style="padding:6px 10px;text-align:right;font-size:9px;color:var(--t3);font-weight:700">P75 (High)</th>' +
        '<th style="padding:6px 10px;text-align:center;font-size:9px;color:var(--t3);font-weight:700">Confidence</th>' +
        '<th style="padding:6px 10px;text-align:right;font-size:9px;color:var(--t3);font-weight:700">vs Our Toll</th>' +
      '</tr></thead><tbody>';
      durs.forEach(function(d) {
        var isOurDur = ourDurData && d.hours === ourDurData.hours;
        var rowBg = isOurDur ? 'background:rgba(37,99,235,.08)' : '';
        html += '<tr style="border-bottom:1px solid rgba(255,255,255,.04);'+rowBg+'">';
        html += '<td style="padding:7px 10px;color:'+(isOurDur?'var(--blue-h)':'var(--t1)')+';font-weight:'+(isOurDur?'800':'700')+'">'+d.hours+'h'+(isOurDur?' ← Ours':'')+'</td>';
        html += '<td style="padding:7px 10px;text-align:right;color:var(--green);font-weight:700">$'+Number(d.p25).toFixed(2)+'</td>';
        html += '<td style="padding:7px 10px;text-align:right;color:var(--amber);font-weight:700">$'+Number(d.p75).toFixed(2)+'</td>';
        html += '<td style="padding:7px 10px;text-align:center"><span style="font-size:8px;font-weight:700;color:'+confColor(d.confidence)+';padding:2px 6px;border:1px solid '+confColor(d.confidence)+';border-radius:8px">'+(d.confidence||'med').toUpperCase()+'</span></td>';

        // 우리 toll 대비
        var cmpCell = '—', cmpCellCol = 'var(--t3)';
        if (ourToll && d.p25 && d.p75) {
          if (ourToll < d.p25) {
            cmpCellCol = 'var(--green)'; cmpCell = 'Market Bottom (Low)';
          } else if (ourToll > d.p75) {
            cmpCellCol = 'var(--red)'; cmpCell = '⚠️ Above Market Top';
          } else {
            cmpCellCol = 'var(--amber)';
            var posT = ((ourToll - d.p25) / (d.p75 - d.p25) * 100);
            cmpCell = 'Within range (' + posT.toFixed(0) + '%ile)';
          }
        }
        html += '<td style="padding:7px 10px;text-align:right;color:'+cmpCellCol+';font-weight:'+(isOurDur?'700':'400')+'">'+cmpCell+'</td>';
        html += '</tr>';
      });
      html += '</tbody></table>';
    }

    // 시장 노트
    if (ourIsoData.market_note) {
      html += '<div style="font-size:10.5px;color:var(--t2);font-style:italic;margin-top:10px;padding:8px 10px;background:rgba(255,255,255,.03);border-radius:6px;line-height:1.6">📝 '+esc(ourIsoData.market_note)+'</div>';
    }

    // 출처
    if ((ourIsoData.sources||[]).length) {
      html += '<details style="margin-top:8px"><summary style="font-size:10px;color:var(--blue-h);cursor:pointer;font-weight:600">📚 View Sources ('+ourIsoData.sources.length+')</summary>';
      html += '<div style="margin-top:4px;padding:8px 10px;background:var(--surface);border-radius:4px">';
      ourIsoData.sources.forEach(function(s) {
        html += '<div style="font-size:10px;color:var(--t3);line-height:1.5;margin-bottom:4px">';
        html += '<a href="'+esc(s.url)+'" target="_blank" style="color:var(--blue-h);text-decoration:none">'+esc(s.title||s.url)+'</a>';
        if (s.date) html += ' <span style="color:var(--t3)">('+esc(s.date)+')</span>';
        if (s.key_data) html += '<div style="padding-left:12px;color:var(--t3);font-size:9.5px;margin-top:2px">▸ '+esc(s.key_data)+'</div>';
        html += '</div>';
      });
      html += '</div></details>';
    }

    html += '</div>';
  } else {
    // 우리 지역 No data
    html += '<div style="border:1px dashed var(--amber);border-radius:8px;padding:14px 16px;margin-bottom:14px;background:rgba(245,158,11,.04)">';
    html += '<div style="font-size:11px;color:var(--amber);font-weight:700">⚠️ '+esc(regionInfo.display||ourISO)+' No data</div>';
    html += '<div style="font-size:10px;color:var(--t3);margin-top:4px">No data for this region in AI research result. 🔄 Re-run AI Research button.</div>';
    html += '</div>';
  }

  // ── B-2. 기타 지역 (접기) ──
  var otherIsos = isoData.filter(function(iso){return (iso.region||'').toUpperCase() !== ourMatchKey;});
  if (otherIsos.length) {
    html += '<details style="border:1px solid var(--border);border-radius:8px;background:var(--surface2);margin-bottom:10px">';
    html += '<summary style="padding:10px 14px;cursor:pointer;font-size:11px;font-weight:700;color:var(--t2);user-select:none">▶ Compare Other Regions ('+otherIsos.length+')</summary>';
    html += '<div style="padding:4px 14px 14px">';

    otherIsos.forEach(function(iso) {
      html += '<div style="border:1px solid var(--border);border-radius:6px;padding:8px 10px;margin-top:8px;background:var(--surface)">';

      // 헤더 (컴팩트)
      html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px">';
      html += '<div style="font-size:11px;font-weight:700;color:var(--t1)">'+esc(iso.region)+'</div>';
      html += '<div style="font-size:8.5px;color:var(--t3)">'+(iso.sources||[]).length+' sources</div>';
      html += '</div>';

      // 간단 테이블 (P25/P75만)
      var durs = iso.durations || [];
      if (durs.length) {
        html += '<table style="width:100%;border-collapse:collapse;font-size:10px;font-variant-numeric:tabular-nums">';
        html += '<thead><tr style="background:var(--surface3)">' +
          '<th style="padding:3px 6px;text-align:left;font-size:8.5px;color:var(--t3);font-weight:700">Dur</th>' +
          '<th style="padding:3px 6px;text-align:right;font-size:8.5px;color:var(--t3);font-weight:700">P25</th>' +
          '<th style="padding:3px 6px;text-align:right;font-size:8.5px;color:var(--t3);font-weight:700">P75</th>' +
          '<th style="padding:3px 6px;text-align:center;font-size:8.5px;color:var(--t3);font-weight:700">Conf</th>' +
        '</tr></thead><tbody>';
        durs.forEach(function(d) {
          html += '<tr>';
          html += '<td style="padding:4px 6px;color:var(--t2);font-weight:600">'+d.hours+'h</td>';
          html += '<td style="padding:4px 6px;text-align:right;color:var(--green)">$'+Number(d.p25).toFixed(2)+'</td>';
          html += '<td style="padding:4px 6px;text-align:right;color:var(--amber)">$'+Number(d.p75).toFixed(2)+'</td>';
          html += '<td style="padding:4px 6px;text-align:center;font-size:8px;color:'+confColor(d.confidence)+'">'+(d.confidence||'med').toUpperCase().charAt(0)+'</td>';
          html += '</tr>';
        });
        html += '</tbody></table>';
      }
      if (iso.market_note) {
        html += '<div style="font-size:9.5px;color:var(--t3);font-style:italic;margin-top:5px;line-height:1.5">📝 '+esc(iso.market_note)+'</div>';
      }

      html += '</div>';
    });

    html += '</div></details>';
  }

  content.innerHTML = html;
}

function valSwitchBmSub(sub) {
  var btnInt = document.getElementById('bm-sub-internal');
  var btnExt = document.getElementById('bm-sub-external');
  var panInt = document.getElementById('bm-panel-internal');
  var panExt = document.getElementById('bm-panel-external');
  if (!btnInt || !btnExt) return;

  function setActive(btn, on) {
    if (on) {
      btn.classList.add('active');
      btn.style.color = 'var(--t1)';
      btn.style.borderBottomColor = 'var(--blue)';
      btn.style.fontWeight = '700';
    } else {
      btn.classList.remove('active');
      btn.style.color = 'var(--t3)';
      btn.style.borderBottomColor = 'transparent';
      btn.style.fontWeight = '600';
    }
  }

  if (sub === 'internal') {
    setActive(btnInt, true); setActive(btnExt, false);
    panInt.style.display = 'block';
    panExt.style.display = 'none';
    if (!_bmLoaded) valLoadBenchmark();
  } else {
    setActive(btnInt, false); setActive(btnExt, true);
    panInt.style.display = 'none';
    panExt.style.display = 'block';
    // External 최초 진입 시 데이터 로드
    if (!window._bmExtLoaded) {
      valLoadMarketBenchmark(false);
      valLoadLevelTen();
      valLoadBessResearch();
      window._bmExtLoaded = true;
    }
  }
}

// ── 시장 벤치마크 로드 (FRED + Stooq) ────────────────
async function valLoadMarketBenchmark(force) {
  var ratesEl = document.getElementById('bm-ext-rates');
  var othersEl = document.getElementById('bm-ext-others');
  var fetchedEl = document.getElementById('bm-ext-fetched');
  if (ratesEl) ratesEl.innerHTML = '<div style="grid-column:span 4;color:var(--t3);font-size:11px;padding:16px;text-align:center">📡 Loading market data...</div>';
  if (othersEl) othersEl.innerHTML = '';

  try {
    var qs = force ? '?force=1' : '';
    var data = await apiCall('GET', '/benchmark/market' + qs);
    if (!data || !data.series) throw new Error('No response');

    if (fetchedEl) {
      var fd = data.fetched_at ? new Date(data.fetched_at + 'Z') : null;
      // 오늘 날짜 기준으로 "데이터 기준 4/15 · 오늘 4/17" 형식
      var today = new Date();
      var todayStr = (today.getMonth()+1)+'/'+today.getDate();
      fetchedEl.textContent = fd ? ('Updated ' + fd.toLocaleDateString('en-US', {year:'numeric',month:'short',day:'numeric'})) : '';
    }

    // 컴팩트 카드 빌더 (세로 높이 축소)
    function buildCard(key, meta) {
      var d = meta.data;
      var label = meta.label || key;
      var unit = meta.unit || '';
      if (!meta.ok || !d) {
        return '<div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:8px 10px;opacity:.5;min-height:72px">' +
          '<div style="font-size:8.5px;color:var(--t3);font-weight:700;letter-spacing:.05em;text-transform:uppercase;margin-bottom:4px">'+label+'</div>' +
          '<div style="font-size:10px;color:var(--t3)">No data</div>' +
          '</div>';
      }
      var val = d.latest;
      var disp = unit === '%' ? val.toFixed(2) + '%'
               : unit === 'Index' && key === 'cpi' && meta.yoy_pct != null ? (meta.yoy_pct >= 0 ? '+' : '') + meta.yoy_pct.toFixed(2) + '%'
               : unit === '$' ? '$' + val.toFixed(2)
               : unit === '$/MMBtu' ? '$' + val.toFixed(2)
               : unit === 'KRW' ? val.toFixed(1)
               : val.toFixed(2);
      var d1m = d.d_1m || 0;
      var d1y = d.d_1y || 0;  // 1년 변화
      var spark = d.spark || [];  // ★ 사용 전에 선언 (호이스팅 버그 수정)

      var chgColor = d1y > 0 ? 'var(--green)' : d1y < 0 ? 'var(--red)' : 'var(--t3)';
      var chgSign = d1y > 0 ? '▲' : d1y < 0 ? '▼' : '·';

      // 상단 우측에 1년 변화 (절대값 + YoY %)
      var chgTxt = '';
      if (spark.length > 1) {
        var valYAgo = spark[0];
        var valNow = spark[spark.length - 1];
        var absChg = valNow - valYAgo;
        var pctChg = valYAgo !== 0 ? (absChg / Math.abs(valYAgo)) * 100 : 0;
        chgSign = absChg > 0 ? '▲' : absChg < 0 ? '▼' : '·';
        chgColor = absChg > 0 ? 'var(--green)' : absChg < 0 ? 'var(--red)' : 'var(--t3)';
        chgTxt = chgSign + ' ' + Math.abs(absChg).toFixed(2) + ' (' + (pctChg>=0?'+':'') + pctChg.toFixed(1) + '% YoY)';
      } else {
        // fallback: 1년치 데이터 없으면 월간 변화
        chgTxt = Math.abs(d1m) >= 0.01 ? chgSign + ' ' + Math.abs(d1m).toFixed(2) : '±0.00';
      }

      // 스파크라인 — 미니멀 스타일 (선 + 시작/현재 날짜만, 값은 카드 헤더에)
      var sparkSvg = '';
      if (spark.length > 1) {
        var sparkDates = d.spark_dates || [];
        var mn = Math.min.apply(null, spark), mx = Math.max.apply(null, spark);
        var range = mx - mn || 1;

        // SVG: 그래프 영역 거의 전체, 아래 날짜 소량 공간
        var svgW = 280, svgH = 42;
        var plotL = 2, plotR = svgW - 2;
        var plotT = 4, plotB = svgH - 12;
        var plotW = plotR - plotL, plotH = plotB - plotT;

        var pts = spark.map(function(v, i) {
          var x = plotL + (i / (spark.length - 1)) * plotW;
          var y = plotT + (1 - (v - mn) / range) * plotH;
          return { x: x, y: y, v: v, idx: i };
        });
        var polyPts = pts.map(function(p){ return p.x.toFixed(1)+','+p.y.toFixed(1); }).join(' ');
        var lineColor = (d1y !== 0 ? d1y : d1m) > 0 ? 'var(--green)' : (d1y !== 0 ? d1y : d1m) < 0 ? 'var(--red)' : 'var(--t3)';

        var pad = function(n){return n<10?'0'+n:n;};
        var fmtDate = function(dateStr) {
          if (!dateStr) return '';
          var parts = dateStr.split('-');
          if (parts.length < 2) return dateStr;
          return "'" + parts[0].slice(2) + '.' + parts[1];
        };
        var fmtVal = function(v) {
          if (unit==='%') return v.toFixed(2)+'%';
          if (unit==='$') return '$'+v.toFixed(2);
          if (unit==='$/MMBtu') return '$'+v.toFixed(2);
          if (unit==='KRW') return Math.round(v).toString();
          return v.toFixed(2);
        };

        var firstIdx = 0, lastIdx = spark.length - 1;
        var firstP = pts[firstIdx], lastP = pts[lastIdx];

        // X축 날짜: 시작 / 현재
        var startDate = fmtDate(sparkDates[firstIdx] || '');
        var endDate = fmtDate(sparkDates[lastIdx] || '');
        var xLabels = '';
        if (startDate) xLabels += '<text x="'+plotL+'" y="'+(svgH-2)+'" font-size="7.5" font-family="var(--font)" fill="var(--t3)" font-variant-numeric="tabular-nums">'+startDate+'</text>';
        if (endDate) xLabels += '<text x="'+plotR+'" y="'+(svgH-2)+'" text-anchor="end" font-size="7.5" font-family="var(--font)" fill="var(--t3)" font-variant-numeric="tabular-nums">'+endDate+'</text>';

        // 현재값 포인트만 작게 표시 (끝점 강조)
        var endDot = '<circle cx="'+lastP.x.toFixed(1)+'" cy="'+lastP.y.toFixed(1)+'" r="2.5" fill="'+lineColor+'" stroke="var(--surface)" stroke-width="1"/>';

        // Hover 포인트 (전체)
        var hitDots = pts.map(function(p) {
          var dateStr = sparkDates[p.idx] || '';
          if (!dateStr) {
            var totalPts = pts.length;
            var daysAgo = (totalPts - 1 - p.idx) * 5;
            var dt = new Date();
            dt.setDate(dt.getDate() - daysAgo);
            dateStr = dt.getFullYear() + '-' + pad(dt.getMonth()+1) + '-' + pad(dt.getDate());
          }
          var fmtv = fmtVal(p.v);
          return '<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="4" fill="'+lineColor+'" fill-opacity="0" stroke="'+lineColor+'" stroke-width="0" class="spark-dot" '+
            'data-label="'+dateStr+'" data-value="'+fmtv+'" '+
            'onmouseover="valShowSparkTip(event, this)" onmouseout="valHideSparkTip()"/>';
        }).join('');

        sparkSvg = '<svg width="100%" height="'+svgH+'" viewBox="0 0 '+svgW+' '+svgH+'" preserveAspectRatio="none" style="margin-top:6px;display:block;overflow:visible">' +
          '<polyline points="'+polyPts+'" fill="none" stroke="'+lineColor+'" stroke-width="1.5" opacity="0.85" vector-effect="non-scaling-stroke"/>' +
          endDot +
          xLabels +
          hitDots +
        '</svg>';
      }

      return '<div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:8px 10px;position:relative">' +
        '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:3px">' +
          '<div style="font-size:8.5px;color:var(--t3);font-weight:700;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:75%" title="'+label+'">'+label+'</div>' +
          '<div style="font-size:8.5px;color:'+chgColor+';font-weight:700;white-space:nowrap">'+chgTxt+'</div>' +
        '</div>' +
        '<div style="font-size:14px;font-weight:800;color:var(--t1);font-variant-numeric:tabular-nums;line-height:1.1">'+disp+'</div>' +
        sparkSvg +
      '</div>';
    }

    // 금리 그룹
    var rateKeys = ['us_10y','us_2y','fed_funds','bbb_spread'];
    if (ratesEl) {
      ratesEl.innerHTML = rateKeys.map(function(k){
        return buildCard(k, data.series[k] || {});
      }).join('');
    }

    // 기타 그룹 (TAN/ICLN 제거 — Stooq 불안정 + HEUH 사업과 무관)
    var otherKeys = ['cpi','henry_hub','krw_usd'];
    if (othersEl) {
      othersEl.innerHTML = otherKeys.map(function(k){
        return buildCard(k, data.series[k] || {});
      }).join('');
    }

    // 저장 (vs 비교에 사용)
    window._marketData = data;
    valRenderVsMarket();

  } catch(e) {
    var safeMsg = String(e.message||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    if (ratesEl) ratesEl.innerHTML = '<div style="grid-column:span 4;color:var(--red);font-size:11px;padding:20px;text-align:center">⚠️ Load failed: '+safeMsg+'</div>';
  }
}

// ── LevelTen 데이터 로드 ────────────────────────────
async function valLoadLevelTen() {
  var contentEl = document.getElementById('bm-lt-content');
  var metaEl = document.getElementById('bm-lt-meta');
  if (!contentEl) return;

  // XSS 방어용 escape
  function esc(s) {
    return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  try {
    var data = await apiCall('GET', '/benchmark/levelten');
    if (!data || !Object.keys(data).length) {
      contentEl.innerHTML = '<div class="val-empty" style="padding:16px"><div class="val-empty-icon" style="font-size:24px">📈</div><div class="val-empty-title" style="font-size:11px">'+(currentLang==='en'?'LevelTen report will appear here after upload':'LevelTen report will appear here after upload')+'</div></div>';
      if (metaEl) metaEl.textContent = 'No data';
      return;
    }

    var quarters = Object.keys(data).sort().reverse();
    var latest = data[quarters[0]];
    if (metaEl) {
      metaEl.textContent = quarters.length + ' quarters · Latest: ' + (latest.quarter||'—') + ' (uploaded ' + (latest.uploaded_at||'').substring(0,10) + ')';
    }

    // 최신 분기 엔트리 테이블
    var html = '';

    // ═══ A. 시장 핵심 메시지 배너 (Executive Summary 자동 요약) ═══
    if (latest.notes) {
      html += '<div style="margin-bottom:14px;padding:10px 12px;background:linear-gradient(135deg,rgba(37,99,235,.08) 0%,rgba(139,92,246,.04) 100%);border:1px solid rgba(37,99,235,.2);border-radius:var(--r-md)">' +
        '<div style="font-size:9px;color:var(--blue-h);font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin-bottom:6px">📰 '+esc(latest.quarter||quarters[0])+' Key Market Messages</div>' +
        '<div style="font-size:10.5px;color:var(--t1);line-height:1.7">' + esc(latest.notes) + '</div>' +
      '</div>';
    }

    // ═══ B. Our PPA vs 시장 비교 카드 (이번 프로젝트 데이터 있을 때만) ═══
    var ourPPA = null;
    try {
      var o = (window._lastValData||{}).outputs || {};
      var a = (window._lastValData||{}).assumptions || {};
      ourPPA = o.ppa_price || a.ppa_price || null;
    } catch(e){}

    var entries = latest.entries || [];
    if (ourPPA && entries.length) {
      // 프로젝트 ISO 추정 (metadata에서 가져오기)
      var projId = (document.getElementById('val-proj-select')||{}).value || '';
      var projMeta = (typeof PROJECTS !== 'undefined') ? PROJECTS.find(function(p){return p.id===projId;}) : null;
      var ourIso = projMeta && projMeta.iso ? projMeta.iso.toUpperCase() : null;

      // ISO 매칭 시도
      var iosMatch = null;
      if (ourIso) {
        iosMatch = entries.find(function(e){
          return e.tech==='solar' && e.region && e.region.toUpperCase().indexOf(ourIso) >= 0;
        });
      }
      // fallback: ERCOT or avg of all solar P25
      var solarEntries = entries.filter(function(e){return e.tech==='solar' && e.p25;});
      var avgP25 = solarEntries.length ? solarEntries.reduce(function(s,e){return s+Number(e.p25);},0)/solarEntries.length : null;

      if (iosMatch || avgP25) {
        var benchP25 = iosMatch ? Number(iosMatch.p25) : avgP25;
        var benchP50 = iosMatch ? Number(iosMatch.p50) : null;
        var benchLabel = iosMatch ? iosMatch.region : 'Market Avg';
        var diff = ourPPA - benchP25;
        var diffPct = (diff / benchP25 * 100);
        var posStatus, posColor;
        if (diffPct >= 15) { posStatus = 'Top of market'; posColor = 'var(--green)'; }
        else if (diffPct >= 5) { posStatus = 'Upper market'; posColor = 'var(--green)'; }
        else if (diffPct >= -5) { posStatus = 'market P25 level'; posColor = 'var(--amber)'; }
        else if (diffPct >= -15) { posStatus = 'Lower market'; posColor = 'var(--red)'; }
        else { posStatus = 'Bottom of market'; posColor = 'var(--red)'; }

        html += '<div style="margin-bottom:14px;padding:12px 14px;background:var(--surface2);border:1px solid var(--border);border-left:3px solid '+posColor+';border-radius:var(--r-md)">' +
          '<div style="font-size:9px;color:var(--t3);font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin-bottom:8px">🎯 Current Project PPA vs LevelTen Benchmark</div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">' +
            '<div>' +
              '<div style="font-size:8.5px;color:var(--t3);margin-bottom:2px">Our PPA</div>' +
              '<div style="font-size:16px;font-weight:800;color:var(--t1);font-variant-numeric:tabular-nums">$'+Number(ourPPA).toFixed(2)+'</div>' +
              '<div style="font-size:8.5px;color:var(--t3);margin-top:2px">$/MWh</div>' +
            '</div>' +
            '<div>' +
              '<div style="font-size:8.5px;color:var(--t3);margin-bottom:2px">'+esc(benchLabel)+' P25'+(benchP50?' / P50':'')+'</div>' +
              '<div style="font-size:16px;font-weight:800;color:var(--t2);font-variant-numeric:tabular-nums">$'+benchP25.toFixed(2)+ (benchP50?' / $'+benchP50.toFixed(2):'')+'</div>' +
              '<div style="font-size:8.5px;color:var(--t3);margin-top:2px">LevelTen '+esc(latest.quarter||'')+'</div>' +
            '</div>' +
            '<div>' +
              '<div style="font-size:8.5px;color:var(--t3);margin-bottom:2px">Gap vs P25</div>' +
              '<div style="font-size:16px;font-weight:800;color:'+posColor+';font-variant-numeric:tabular-nums">'+(diff>=0?'+':'')+diff.toFixed(2)+' ('+(diffPct>=0?'+':'')+diffPct.toFixed(1)+'%)</div>' +
              '<div style="font-size:8.5px;color:'+posColor+';margin-top:2px;font-weight:600">'+posStatus+'</div>' +
            '</div>' +
          '</div>' +
        '</div>';
      }
    }

    // ═══ C. 분기 / 기술 선택 컨트롤 ═══
    html += '<div style="display:flex;gap:8px;align-items:center;margin-bottom:10px;flex-wrap:wrap">';
    html += '<label style="font-size:10px;color:var(--t3);font-weight:600">Quarter:</label>';
    html += '<select id="bm-lt-q-sel" onchange="valRenderLevelTenQuarter(this.value)" style="padding:4px 10px;background:var(--surface3);border:1px solid var(--border2);border-radius:var(--r-md);color:var(--t1);font-size:11px;font-family:var(--font)">';
    quarters.forEach(function(q){
      html += '<option value="'+esc(q)+'">'+esc(data[q].quarter||q)+'</option>';
    });
    html += '</select>';
    html += '<span style="flex:1"></span>';
    html += '<span style="font-size:9px;color:var(--t3)">$/MWh · P25 (Low 25%) / P50 (Median) / P75 (Top 25%)</span>';
    html += '</div>';

    html += '<div id="bm-lt-table-wrap"></div>';

    contentEl.innerHTML = html;
    window._levelTenData = data;
    valRenderLevelTenQuarter(quarters[0]);
    valRenderVsMarket();

  } catch(e) {
    contentEl.innerHTML = '<div style="color:var(--red);font-size:11px;padding:20px;text-align:center">⚠️ Load failed: '+esc(e.message)+'</div>';
  }
}

function valRenderLevelTenQuarter(q) {
  var wrap = document.getElementById('bm-lt-table-wrap');
  if (!wrap || !window._levelTenData) return;
  var data = window._levelTenData[q] || {};

  function esc(s) {
    return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function fmt$(v, dec) { return v==null ? '—' : '$' + Number(v).toFixed(dec==null?2:dec); }
  function fmtPct(v) { return v==null ? '' : (v>=0?'+':'') + Number(v).toFixed(1) + '%'; }
  function pctColor(v) { return v==null ? 'var(--t3)' : v>0 ? 'var(--green)' : v<0 ? 'var(--red)' : 'var(--t3)'; }

  // Our Project의 현재 PPA + ISO 추출 (비교용)
  var ourData = window._lastValData || {};
  var ourOut = ourData.outputs || {};
  var ourAssum = ourData.assumptions || {};
  var ourPPA = ourOut.ppa_price || ourAssum.ppa_price;
  var ourBessToll = ourOut.bess_toll || ourAssum.bess_toll;
  var projId = document.getElementById('val-proj-select');
  projId = projId ? projId.value : '';
  var projMeta = (window.PROJECTS||[]).find(function(p){return p.id===projId;}) || {};
  var ourISO = (projMeta.iso||'').toUpperCase();
  var ourHub = (projMeta.hub || '').toUpperCase();

  // 스키마 (Solar 우선, Storage는 box plot 5개 통계치)
  var solarISO = data.solar_iso || [];
  var solarHub = data.solar_hub || [];
  var storageISO = data.storage_iso || [];
  var durationMix = data.storage_duration_mix || [];
  var solarPSV = data.solar_psv || [];
  var pipeline = data.pipeline_breakdown || [];
  var cont = data.solar_continental || {};
  var insights = data.key_insights || [];
  var notes = data.notes || '';

  // Legacy fallback (구형 데이터)
  if (!solarISO.length && data.entries) {
    solarISO = data.entries.filter(function(e){return e.tech==='solar';}).map(function(e){
      return {region:e.region, p25:e.p25, qoq_pct:null, yoy_pct:null};
    });
  }
  if (!storageISO.length && data.entries) {
    storageISO = data.entries.filter(function(e){return e.tech==='storage';}).map(function(e){
      return {region:e.region, p25:e.p25, median:e.p50, p75:e.p75};
    });
  }

  if (!solarISO.length && !storageISO.length) {
    wrap.innerHTML = '<div style="color:var(--t3);font-size:11px;padding:12px;text-align:center">No data for this quarter</div>';
    return;
  }

  var html = '';

  // ══════════════════════════════════════════════════
  //  ① Hero Card — 우리 포지션 (percentile 바)
  // ══════════════════════════════════════════════════
  var ourISOSolarP25 = null, ourISOSolarQoQ = null, ourISOSolarYoY = null;
  solarISO.forEach(function(e){
    if (e.region && ourISO && e.region.toUpperCase() === ourISO) {
      ourISOSolarP25 = e.p25;
      ourISOSolarQoQ = e.qoq_pct;
      ourISOSolarYoY = e.yoy_pct;
    }
  });

  if (ourPPA && ourISO) {
    html += '<div style="padding:14px 16px;background:linear-gradient(135deg,rgba(37,99,235,.08) 0%,rgba(139,92,246,.05) 100%);border:1px solid rgba(37,99,235,.2);border-radius:10px;margin-bottom:14px">';
    html += '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px">';
    html += '<div style="font-size:11px;font-weight:800;color:var(--blue-h);letter-spacing:.04em">🎯 ' + esc(projMeta.name||'Project') + ' — Market Position in ' + esc(ourISO) + '</div>';
    html += '<div style="font-size:9px;color:var(--t3)">' + esc(q) + '</div>';
    html += '</div>';

    // Percentile bar (Continental P10-P90 기준)
    if (cont.p10 && cont.p90) {
      var p10 = cont.p10, p25 = cont.p25, p50 = cont.p50, p75 = cont.p75, p90 = cont.p90;
      var range = p90 - p10;
      var ourPos = Math.max(0, Math.min(100, ((ourPPA - p10) / range) * 100));
      html += '<div style="margin-bottom:12px">';
      html += '<div style="position:relative;height:42px;background:var(--surface2);border-radius:6px;padding:4px 6px">';
      // Background gradient marking percentile zones
      html += '<div style="position:absolute;top:4px;left:6px;right:6px;bottom:4px;background:linear-gradient(90deg,rgba(16,185,129,.15) 0%,rgba(37,99,235,.1) 50%,rgba(217,119,6,.15) 100%);border-radius:4px"></div>';
      // Percentile ticks
      ['P10','P25','P50','P75','P90'].forEach(function(lbl, i){
        var pct = i * 25;
        html += '<div style="position:absolute;top:4px;bottom:4px;left:calc(6px + (100% - 12px) * ' + pct + '/100);width:1px;background:rgba(255,255,255,.15)"></div>';
        html += '<div style="position:absolute;top:18px;left:calc(6px + (100% - 12px) * ' + pct + '/100);transform:translateX(-50%);font-size:8px;color:var(--t3);font-weight:700">'+lbl+'</div>';
        html += '<div style="position:absolute;top:28px;left:calc(6px + (100% - 12px) * ' + pct + '/100);transform:translateX(-50%);font-size:8.5px;color:var(--t2);font-weight:600">$'+Number([p10,p25,p50,p75,p90][i]||0).toFixed(0)+'</div>';
      });
      // Our position marker
      html += '<div style="position:absolute;top:2px;bottom:14px;left:calc(6px + (100% - 12px) * ' + ourPos.toFixed(1) + '/100);transform:translateX(-50%);z-index:2">';
      html += '<div style="width:3px;height:100%;background:var(--blue-h);box-shadow:0 0 8px var(--blue-h);border-radius:2px"></div>';
      html += '<div style="position:absolute;bottom:100%;left:50%;transform:translateX(-50%);background:var(--blue-h);color:#fff;font-size:9px;font-weight:800;padding:2px 6px;border-radius:3px;white-space:nowrap;margin-bottom:2px">Ours $'+ourPPA.toFixed(2)+'</div>';
      html += '</div>';
      html += '</div>';
      // Position interpretation
      var percentileDesc = '';
      if (ourPos <= 25) percentileDesc = 'Lower 25%ile (competitive pricing)';
      else if (ourPos <= 50) percentileDesc = 'Middle-Lower (below avg)';
      else if (ourPos <= 75) percentileDesc = 'Middle-Upper (above avg, premium)';
      else percentileDesc = 'Top 25%ile (highest price range)';
      html += '<div style="font-size:10px;color:var(--t2);margin-top:6px;text-align:center">📊 <b style="color:var(--blue-h)">'+percentileDesc+'</b> · based on continental Solar PPA offer distribution</div>';
      html += '</div>';
    }

    // ISO별 비교 요약
    if (ourISOSolarP25) {
      var diff = ourPPA - ourISOSolarP25;
      var diffPct = (diff / ourISOSolarP25) * 100;
      var diffCol = diff >= 0 ? 'var(--green)' : 'var(--red)';
      html += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;padding:10px;background:var(--surface);border-radius:6px">';
      html += '<div><div style="font-size:8px;color:var(--t3);font-weight:700;letter-spacing:.06em;margin-bottom:3px">'+esc(ourISO)+' SOLAR P25</div><div style="font-size:14px;font-weight:800;color:var(--amber)">$'+ourISOSolarP25.toFixed(2)+'</div></div>';
      html += '<div><div style="font-size:8px;color:var(--t3);font-weight:700;letter-spacing:.06em;margin-bottom:3px">Our PPA</div><div style="font-size:14px;font-weight:800;color:var(--blue-h)">$'+ourPPA.toFixed(2)+'</div></div>';
      html += '<div><div style="font-size:8px;color:var(--t3);font-weight:700;letter-spacing:.06em;margin-bottom:3px">vs Market</div><div style="font-size:14px;font-weight:800;color:'+diffCol+'">'+(diff>=0?'+':'')+'$'+diff.toFixed(2)+' <span style="font-size:10px;font-weight:600">('+(diffPct>=0?'+':'')+diffPct.toFixed(1)+'%)</span></div></div>';
      html += '</div>';
      if (ourISOSolarQoQ != null || ourISOSolarYoY != null) {
        var trendLine = [];
        if (ourISOSolarQoQ != null) trendLine.push(esc(ourISO)+' Market QoQ <span style="color:'+pctColor(ourISOSolarQoQ)+';font-weight:700">'+fmtPct(ourISOSolarQoQ)+'</span>');
        if (ourISOSolarYoY != null) trendLine.push('YoY <span style="color:'+pctColor(ourISOSolarYoY)+';font-weight:700">'+fmtPct(ourISOSolarYoY)+'</span>');
        html += '<div style="font-size:9.5px;color:var(--t3);margin-top:8px;text-align:center">'+trendLine.join(' · ')+'</div>';
      }
    }

    html += '<div style="font-size:8.5px;color:var(--t3);margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,.06);line-height:1.5">💡 P25 = Low 25%ile offers (developer ask price) · All prices in LevelTen reports are <b>offer prices</b>, not actual contract prices</div>';
    html += '</div>';
  }

  // ══════════════════════════════════════════════════
  //  ② Solar P25 by ISO 표
  // ══════════════════════════════════════════════════
  if (solarISO.length) {
    html += '<div style="margin-bottom:14px">';
    html += '<div style="font-size:10px;font-weight:700;color:var(--t2);margin-bottom:6px">☀️ Solar PPA P25 by ISO</div>';
    html += '<table style="width:100%;border-collapse:collapse;font-size:11px;font-variant-numeric:tabular-nums">';
    html += '<thead><tr style="border-bottom:1px solid var(--border);background:var(--surface2)">' +
      '<th style="padding:6px 10px;text-align:left;font-size:9px;color:var(--t3);font-weight:700">ISO</th>' +
      '<th style="padding:6px 10px;text-align:right;font-size:9px;color:var(--t3);font-weight:700">P25 ($/MWh)</th>' +
      '<th style="padding:6px 10px;text-align:right;font-size:9px;color:var(--t3);font-weight:700">QoQ</th>' +
      '<th style="padding:6px 10px;text-align:right;font-size:9px;color:var(--t3);font-weight:700">YoY</th>' +
      '<th style="padding:6px 10px;text-align:right;font-size:9px;color:var(--t3);font-weight:700">Our PPA</th>' +
      '</tr></thead><tbody>';
    solarISO.slice().sort(function(a,b){return (a.p25||999)-(b.p25||999);}).forEach(function(e){
      var isOurISO = e.region && ourISO && e.region.toUpperCase() === ourISO;
      var rowBg = isOurISO ? 'background:rgba(37,99,235,.08)' : '';
      html += '<tr style="border-bottom:1px solid rgba(255,255,255,.04);'+rowBg+'">';
      html += '<td style="padding:6px 10px;color:'+(isOurISO?'var(--blue-h)':'var(--t1)')+';font-weight:'+(isOurISO?'800':'600')+'">'+
              esc(e.region||'—') + (isOurISO ? ' <span style="font-size:8px;color:var(--blue-h);font-weight:700;margin-left:4px;padding:1px 5px;border:1px solid var(--blue-h);border-radius:8px">OUR</span>' : '') + '</td>';
      html += '<td style="padding:6px 10px;text-align:right;color:var(--amber);font-weight:700">'+fmt$(e.p25)+'</td>';
      html += '<td style="padding:6px 10px;text-align:right;color:'+pctColor(e.qoq_pct)+'">'+fmtPct(e.qoq_pct)+'</td>';
      html += '<td style="padding:6px 10px;text-align:right;color:'+pctColor(e.yoy_pct)+'">'+fmtPct(e.yoy_pct)+'</td>';
      var cmpTxt = '—', cmpCol = 'var(--t3)';
      if (isOurISO && ourPPA && e.p25) {
        var diff = ourPPA - e.p25;
        var pct = (diff / e.p25) * 100;
        cmpCol = diff >= 0 ? 'var(--green)' : 'var(--red)';
        cmpTxt = (diff>=0?'+':'') + '$' + diff.toFixed(2) + ' (' + (pct>=0?'+':'') + pct.toFixed(1) + '%)';
      }
      html += '<td style="padding:6px 10px;text-align:right;color:'+cmpCol+';font-weight:'+(isOurISO?'700':'400')+'">'+cmpTxt+'</td>';
      html += '</tr>';
    });
    html += '</tbody></table></div>';
  }

  // ══════════════════════════════════════════════════
  //  ③ Hub-level 상세 (우리 ISO만 자동 확장)
  // ══════════════════════════════════════════════════
  if (solarHub.length && ourISO) {
    var ourHubs = solarHub.filter(function(h){ return h.region && h.region.toUpperCase() === ourISO; });
    if (ourHubs.length) {
      html += '<div style="margin-bottom:14px;padding:10px 12px;background:var(--surface2);border:1px solid var(--border);border-left:3px solid var(--blue-h);border-radius:6px">';
      html += '<div style="font-size:10px;font-weight:700;color:var(--blue-h);margin-bottom:8px">📍 '+esc(ourISO)+' Hub-level Solar P25 (Project region detail)</div>';
      html += '<table style="width:100%;border-collapse:collapse;font-size:10.5px;font-variant-numeric:tabular-nums">';
      html += '<tbody>';
      ourHubs.slice().sort(function(a,b){return (a.p25||0)-(b.p25||0);}).forEach(function(h){
        var isOurHub = ourHub && h.hub && h.hub.toUpperCase().replace(/[_\s]/g,'') === ourHub.toUpperCase().replace(/[_\s]/g,'');
        var rowBg = isOurHub ? 'background:rgba(37,99,235,.10)' : '';
        html += '<tr style="'+rowBg+'">';
        html += '<td style="padding:4px 10px;color:'+(isOurHub?'var(--blue-h)':'var(--t2)')+';font-weight:'+(isOurHub?'700':'500')+';font-size:10.5px">'+esc(h.hub||'—') + (isOurHub?' ◀':'') +'</td>';
        html += '<td style="padding:4px 10px;text-align:right;color:var(--amber);font-weight:700">'+fmt$(h.p25)+'</td>';
        html += '</tr>';
      });
      html += '</tbody></table>';
      if (ourHubs.length >= 2) {
        var prices = ourHubs.map(function(h){return h.p25||0;}).filter(function(v){return v>0;});
        if (prices.length >= 2) {
          var spread = Math.max.apply(null, prices) - Math.min.apply(null, prices);
          html += '<div style="font-size:9px;color:var(--t3);margin-top:6px">💡 Hub spread $'+spread.toFixed(2)+' · effective profitability varies by interconnection point</div>';
        }
      }
      html += '</div>';
    }
  }

  // ══════════════════════════════════════════════════
  //  ④ BESS Tolling (LevelTen Storage 공식 데이터)
  // ══════════════════════════════════════════════════
  if (storageISO.length) {
    var bessResearch = window._bessTollingData || null;
    html += '<div style="margin-bottom:14px">';
    html += '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">';
    html += '<div style="font-size:10px;font-weight:700;color:var(--t2)">🔋 BESS Tolling Market (LevelTen Storage Index — Official)</div>';
    html += '<div style="font-size:8.5px;color:var(--green);background:rgba(16,185,129,.1);padding:1px 6px;border-radius:8px;font-weight:700">📋 LEVELTEN OFFICIAL</div>';
    html += '</div>';
    html += '<table style="width:100%;border-collapse:collapse;font-size:11px;font-variant-numeric:tabular-nums">';
    html += '<thead><tr style="border-bottom:1px solid var(--border);background:var(--surface2)">' +
      '<th style="padding:6px 10px;text-align:left;font-size:9px;color:var(--t3);font-weight:700">ISO</th>' +
      '<th style="padding:6px 10px;text-align:right;font-size:9px;color:var(--t3);font-weight:700">P25</th>' +
      '<th style="padding:6px 10px;text-align:right;font-size:9px;color:var(--t3);font-weight:700">Median</th>' +
      '<th style="padding:6px 10px;text-align:right;font-size:9px;color:var(--t3);font-weight:700">P75</th>' +
      '<th style="padding:6px 10px;text-align:right;font-size:9px;color:var(--t3);font-weight:700">Range</th>' +
      '<th style="padding:6px 10px;text-align:right;font-size:9px;color:var(--t3);font-weight:700">Our Toll</th>' +
      '</tr></thead><tbody>';
    storageISO.slice().sort(function(a,b){return (a.median||a.p25||999)-(b.median||b.p25||999);}).forEach(function(e){
      var isOurISO = e.region && ourISO && e.region.toUpperCase() === ourISO;
      var rowBg = isOurISO ? 'background:rgba(37,99,235,.08)' : '';
      var med = e.median || e.p50;
      var rangeTxt = (e.min!=null && e.max!=null) ? ('$'+Number(e.min).toFixed(0)+'-$'+Number(e.max).toFixed(0)) : '—';
      html += '<tr style="border-bottom:1px solid rgba(255,255,255,.04);'+rowBg+'">';
      html += '<td style="padding:6px 10px;color:'+(isOurISO?'var(--blue-h)':'var(--t1)')+';font-weight:'+(isOurISO?'800':'600')+'">'+
              esc(e.region||'—') + (isOurISO ? ' <span style="font-size:8px;color:var(--blue-h);font-weight:700;margin-left:4px;padding:1px 5px;border:1px solid var(--blue-h);border-radius:8px">OUR</span>' : '') + '</td>';
      html += '<td style="padding:6px 10px;text-align:right;color:var(--t2)">'+fmt$(e.p25,1)+'</td>';
      html += '<td style="padding:6px 10px;text-align:right;color:var(--amber);font-weight:700">'+fmt$(med,1)+'</td>';
      html += '<td style="padding:6px 10px;text-align:right;color:var(--t2)">'+fmt$(e.p75,1)+'</td>';
      html += '<td style="padding:6px 10px;text-align:right;color:var(--t3);font-size:10px">'+rangeTxt+'</td>';
      var tollTxt = '—', tollCol = 'var(--t3)';
      if (isOurISO && ourBessToll && med) {
        var tollDiff = ourBessToll - med;
        var tollPct = (tollDiff / med) * 100;
        var overP75 = e.p75 && ourBessToll > e.p75;
        tollCol = overP75 ? 'var(--red)' : (ourBessToll < e.p25 ? 'var(--green)' : 'var(--amber)');
        var flag = overP75 ? ' ⚠️' : (ourBessToll < e.p25 ? ' ✓' : '');
        tollTxt = '$'+ourBessToll.toFixed(2)+flag;
      }
      html += '<td style="padding:6px 10px;text-align:right;color:'+tollCol+';font-weight:'+(isOurISO?'700':'400')+'">'+tollTxt+'</td>';
      html += '</tr>';
    });
    html += '</tbody></table>';

    // Duration mix (프로젝트 ISO만)
    var ourDurMix = durationMix.find(function(d){return d.region && ourISO && d.region.toUpperCase()===ourISO;});
    if (ourDurMix) {
      var durations = [];
      ['2h','3h','4h','6h','8h','10h'].forEach(function(h){
        if (ourDurMix[h]) durations.push(h+': '+Math.round(ourDurMix[h])+'%');
      });
      if (durations.length) {
        html += '<div style="font-size:9.5px;color:var(--t3);margin-top:6px">💡 '+esc(ourISO)+' Duration Mix (2025 offers): '+durations.join(' · ')+'</div>';
      }
    }

    // AI Research 보완 버튼 (LevelTen 커버 ISO일 경우 duration 세부, 아닐 경우 fallback)
    var ourISOInLevelTen = storageISO.some(function(e){return e.region && ourISO && e.region.toUpperCase() === ourISO;});
    if (!ourISOInLevelTen && ourISO) {
      html += '<div style="padding:8px 10px;background:var(--surface2);border:1px dashed var(--border2);border-radius:4px;margin-top:8px;font-size:10px;color:var(--t2)">';
      html += '<b style="color:var(--amber)">⚠️ '+esc(ourISO)+'</b> is not covered by LevelTen Storage Index. ';
      if (bessResearch && bessResearch.iso_data) {
        var aiIso = (bessResearch.iso_data||[]).find(function(e){return e.region && e.region.toUpperCase()===ourISO;});
        if (aiIso) {
          html += 'AI Research estimate: ';
          var dur = (aiIso.durations||[]).find(function(d){return d.hours===4;});
          if (dur) html += '4h P25-P75 $'+Number(dur.p25).toFixed(1)+'-$'+Number(dur.p75).toFixed(1)+'/kW-mo';
        } else {
          html += 'Use AI Research button below to fetch complementary data.';
        }
      } else {
        html += 'Use AI Research button below to fetch complementary data.';
      }
      html += '</div>';
    }

    html += '<div style="font-size:8.5px;color:var(--t3);margin-top:4px;font-style:italic">※ LevelTen Storage Index: RFP/RFI tolling agreement offers, 2025 annual aggregation ($/kW-month levelized)</div>';
    html += '</div>';
  }

  // ══════════════════════════════════════════════════
  //  ⑤ Solar PSV (Projected Settlement Value) — 구매자 관점
  // ══════════════════════════════════════════════════
  if (solarPSV.length) {
    html += '<div style="margin-bottom:14px">';
    html += '<div style="font-size:10px;font-weight:700;color:var(--t2);margin-bottom:6px">💵 Solar Projected Settlement Value (PSV) by ISO — Buyer-perspective present value</div>';
    html += '<table style="width:100%;border-collapse:collapse;font-size:11px;font-variant-numeric:tabular-nums">';
    html += '<thead><tr style="border-bottom:1px solid var(--border);background:var(--surface2)">' +
      '<th style="padding:6px 10px;text-align:left;font-size:9px;color:var(--t3);font-weight:700">ISO</th>' +
      '<th style="padding:6px 10px;text-align:right;font-size:9px;color:var(--t3);font-weight:700">Median PSV</th>' +
      '<th style="padding:6px 10px;text-align:right;font-size:9px;color:var(--t3);font-weight:700">Range</th>' +
      '<th style="padding:6px 10px;text-align:left;font-size:9px;color:var(--t3);font-weight:700">Buyer Position</th>' +
      '</tr></thead><tbody>';
    solarPSV.slice().sort(function(a,b){return (b.psv_median||-999)-(a.psv_median||-999);}).forEach(function(e){
      var isOurISO = e.region && ourISO && e.region.toUpperCase() === ourISO;
      var rowBg = isOurISO ? 'background:rgba(37,99,235,.08)' : '';
      var med = e.psv_median;
      var medCol = med > 0 ? 'var(--green)' : med < -15 ? 'var(--red)' : 'var(--amber)';
      var interpret = med > 0 ? '✅ Net Profit (positive)' : med < -15 ? '❌ Large Net Loss' : '⚠️ Net Loss';
      var rng = (e.psv_min!=null && e.psv_max!=null) ? ('$'+Number(e.psv_min).toFixed(0)+' ~ $'+Number(e.psv_max).toFixed(0)) : '—';
      html += '<tr style="border-bottom:1px solid rgba(255,255,255,.04);'+rowBg+'">';
      html += '<td style="padding:6px 10px;color:'+(isOurISO?'var(--blue-h)':'var(--t1)')+';font-weight:'+(isOurISO?'800':'600')+'">'+esc(e.region||'—')+(isOurISO?' <span style="font-size:8px;color:var(--blue-h);font-weight:700;margin-left:4px;padding:1px 5px;border:1px solid var(--blue-h);border-radius:8px">OUR</span>':'')+'</td>';
      html += '<td style="padding:6px 10px;text-align:right;font-weight:700;color:'+medCol+'">'+(med>=0?'+':'')+'$'+Number(med||0).toFixed(0)+'</td>';
      html += '<td style="padding:6px 10px;text-align:right;color:var(--t3);font-size:10px">'+rng+'</td>';
      html += '<td style="padding:6px 10px;color:'+medCol+';font-size:10px">'+interpret+'</td>';
      html += '</tr>';
    });
    html += '</tbody></table>';
    html += '<div style="font-size:8.5px;color:var(--t3);margin-top:4px;font-style:italic">※ PSV = NPV of market price vs contract price (Hitachi Energy basis). Positive = buyer profit, negative = buyer loss. Long-term offtake stability indicator.</div>';
    html += '</div>';
  }

  // ══════════════════════════════════════════════════
  //  ⑥ Pipeline Trend — HEUH 사업 정체성 (Solar + Storage + Hybrid)
  // ══════════════════════════════════════════════════
  if (pipeline.length) {
    html += '<div style="margin-bottom:14px">';
    html += '<div style="font-size:10px;font-weight:700;color:var(--t2);margin-bottom:6px">📈 US Clean Energy Pipeline Trend (COD Year, MW)</div>';
    html += '<div style="padding:10px;background:var(--surface2);border:1px solid var(--border);border-radius:6px">';
    // Simple stacked bar chart (SVG)
    var maxTotal = 0;
    pipeline.forEach(function(p){
      var t = (p.solar_mw||0) + (p.standalone_storage_mw||0) + (p.hybrid_mw||0);
      if (t > maxTotal) maxTotal = t;
    });
    if (maxTotal > 0) {
      var barW = 80, gap = 16;
      var svgW = pipeline.length * (barW + gap);
      var svgH = 180;
      html += '<svg width="100%" height="'+svgH+'" viewBox="0 0 '+svgW+' '+svgH+'" style="max-width:700px;display:block;margin:0 auto">';
      pipeline.forEach(function(p, idx){
        var x = idx * (barW + gap) + gap/2;
        var sol = p.solar_mw || 0;
        var sto = p.standalone_storage_mw || 0;
        var hyb = p.hybrid_mw || 0;
        var total = sol + sto + hyb;
        var scale = (svgH - 40) / maxTotal;
        var yBase = svgH - 25;
        var hSol = sol * scale;
        var hSto = sto * scale;
        var hHyb = hyb * scale;
        // Hybrid (top)
        html += '<rect x="'+x+'" y="'+(yBase - hHyb - hSto - hSol)+'" width="'+barW+'" height="'+hHyb+'" fill="#ec4899" opacity="0.9"><title>Hybrid '+hyb.toLocaleString()+' MW</title></rect>';
        // Standalone Storage
        html += '<rect x="'+x+'" y="'+(yBase - hSto - hSol)+'" width="'+barW+'" height="'+hSto+'" fill="#dc2626" opacity="0.9"><title>Standalone '+sto.toLocaleString()+' MW</title></rect>';
        // Solar (bottom)
        html += '<rect x="'+x+'" y="'+(yBase - hSol)+'" width="'+barW+'" height="'+hSol+'" fill="#f59e0b" opacity="0.9"><title>Solar '+sol.toLocaleString()+' MW</title></rect>';
        // Year label
        html += '<text x="'+(x + barW/2)+'" y="'+(svgH-8)+'" text-anchor="middle" fill="#9AA8C8" font-size="11" font-weight="700">'+esc(p.cod_year||'')+'</text>';
        // Total label
        html += '<text x="'+(x + barW/2)+'" y="'+(yBase - hHyb - hSto - hSol - 6)+'" text-anchor="middle" fill="#DCE8FF" font-size="9.5" font-weight="700">'+(total/1000).toFixed(1)+'GW</text>';
      });
      html += '</svg>';
      // Legend
      html += '<div style="display:flex;justify-content:center;gap:16px;margin-top:8px;font-size:10px">';
      html += '<div><span style="display:inline-block;width:10px;height:10px;background:#f59e0b;margin-right:4px;vertical-align:middle"></span>Solar</div>';
      html += '<div><span style="display:inline-block;width:10px;height:10px;background:#dc2626;margin-right:4px;vertical-align:middle"></span>Standalone Storage</div>';
      html += '<div><span style="display:inline-block;width:10px;height:10px;background:#ec4899;margin-right:4px;vertical-align:middle"></span>Hybrid (Solar+BESS)</div>';
      html += '</div>';
    }
    html += '</div>';
    // HEUH 해석
    var p2025 = pipeline.find(function(p){return p.cod_year==='2025';}) || {};
    var p2030 = pipeline.find(function(p){return p.cod_year==='2030+'||p.cod_year==='2030';}) || {};
    if (p2025.hybrid_mw != null && p2030.hybrid_mw != null && p2025.hybrid_mw > 0) {
      var growth = (p2030.hybrid_mw / p2025.hybrid_mw).toFixed(0);
      html += '<div style="font-size:9.5px;color:var(--t3);margin-top:8px;text-align:center;line-height:1.5">💡 2030+ Hybrid ' + (p2030.hybrid_mw/1000).toFixed(0) + 'GW (vs 2025 <b style="color:var(--green)">'+growth+'×</b> growth) · <b>HEUH Solar+BESS business model aligns with market trends</b></div>';
    }
    html += '</div>';
  }

  // ══════════════════════════════════════════════════
  //  Key Insights + Notes
  // ══════════════════════════════════════════════════
  if (insights.length) {
    html += '<div style="padding:10px 12px;background:var(--surface2);border:1px solid var(--border);border-left:3px solid var(--amber);border-radius:6px;margin-bottom:10px">';
    html += '<div style="font-size:9px;font-weight:700;color:var(--amber);letter-spacing:.06em;text-transform:uppercase;margin-bottom:6px">💡 Key Insights</div>';
    insights.slice(0, 3).forEach(function(i){  // 최대 3개로 제한 (피로도)
      html += '<div style="font-size:10.5px;color:var(--t2);line-height:1.6;margin-bottom:3px">• '+esc(i)+'</div>';
    });
    html += '</div>';
  }

  if (notes) {
    html += '<div style="padding:8px 10px;background:var(--surface2);border:1px solid var(--border);border-radius:6px;font-size:10px;color:var(--t3);line-height:1.6">'+esc(notes)+'</div>';
  }

  wrap.innerHTML = html;
}

// ── LevelTen 업로드 ─────────────────────────────────
async function valUploadLevelTen() {
  var quarter = (document.getElementById('bm-lt-quarter')||{}).value || '';
  var fileInput = document.getElementById('bm-lt-file');
  var file = fileInput && fileInput.files[0];
  var statusEl = document.getElementById('bm-lt-upload-status');
  var submitBtn = document.getElementById('bm-lt-submit');

  if (!quarter.match(/^\d{4}-Q[1-4]$/i)) {
    statusEl.innerHTML = '<span style="color:var(--red)">⚠️ Quarter format: YYYY-Q1 ~ YYYY-Q4</span>';
    return;
  }
  if (!file) {
    statusEl.innerHTML = '<span style="color:var(--red)">⚠️ Select a file</span>';
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = '⏳ Parsing...';
  statusEl.innerHTML = '<span style="color:var(--t3)">📤 Uploading & AI Parsing (up to 90s)...</span>';

  var fd = new FormData();
  fd.append('file', file);
  fd.append('quarter', quarter.toUpperCase());

  var token = (window.HWR_AUTH && window.HWR_AUTH.token) || window._authToken || localStorage.getItem('hwr_token') || '';
  var apiBase = (typeof API_URL !== 'undefined' ? API_URL : (window.API_URL || ''));

  try {
    var res = await fetch(apiBase + '/benchmark/levelten/upload', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token },
      body: fd
    });
    var j = await res.json();
    if (!res.ok) throw new Error(j.detail || ('HTTP '+res.status));

    statusEl.innerHTML = '<span style="color:var(--green)">✓ '+j.entries_count+' entries parsed</span>';
    setTimeout(function(){
      document.getElementById('bm-lt-modal').style.display = 'none';
      statusEl.innerHTML = '';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Upload & Parse';
      if (fileInput) fileInput.value = '';
      valLoadLevelTen();
    }, 1200);
  } catch(e) {
    var safeMsg = String(e.message||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    statusEl.innerHTML = '<span style="color:var(--red)">⚠️ Failed: '+safeMsg+'</span>';
    submitBtn.disabled = false;
    submitBtn.textContent = 'Upload & Parse';
  }
}

// ── 내 프로젝트 vs 시장 비교 위젯 ────────────────────
function valRenderVsMarket() {
  var wrap = document.getElementById('bm-vs-market');
  var body = document.getElementById('bm-vs-market-body');
  if (!wrap || !body) return;

  // 현재 프로젝트 데이터
  var proj = window._lastValData;
  if (!proj || !proj.outputs) {
    wrap.style.display = 'none';
    return;
  }
  var o = proj.outputs || {}, a = proj.assumptions || {};
  // Levered Pre-Tax IRR 우선, 없으면 기존 sponsor_irr
  var sirr = o.sponsor_irr_levered_pretax || o.sponsor_irr || 0;
  var uirr = o.sponsor_irr_unlevered_pretax || o.unlevered_irr || 0;
  var wacc = o.wacc || 0;
  var ppa = o.ppa_price || a.ppa_price || 0;

  var lines = [];

  // 1. Unlevered IRR vs WACC — 가치 창출 여부 (가장 중요한 의사결정 지표)
  if (uirr > 0 && wacc > 0) {
    var spread = (uirr - wacc) * 100;
    var col = spread >= 1.0 ? 'var(--green)' : spread >= 0 ? 'var(--amber)' : 'var(--red)';
    var status = spread >= 1.0 ? 'Value Creation' : spread >= 0 ? 'Break-even' : 'Value Destruction';
    lines.push({
      label: '💰 Project Unlevered IRR vs WACC',
      val: (uirr*100).toFixed(2) + '%  vs  ' + (wacc*100).toFixed(2) + '% WACC',
      delta: (spread >= 0 ? '+' : '') + spread.toFixed(2) + '%p',
      col: col,
      hint: status + ' · regardless of capital structure'
    });
  }

  // 3. 10Y Treasury 스프레드 (참고)
  var md = window._marketData;
  if (md && md.series && md.series.us_10y && md.series.us_10y.ok && sirr > 0) {
    var tenY = md.series.us_10y.data.latest;
    var sprd = (sirr * 100 - tenY) * 100;
    var col = sprd >= 600 ? 'var(--green)' : sprd >= 400 ? 'var(--amber)' : 'var(--red)';
    lines.push({
      label: '📊 Sponsor IRR vs 10Y Treasury (Risk-Free)',
      val: (sirr*100).toFixed(2) + '%  vs  ' + tenY.toFixed(2) + '% 10Y',
      delta: '+' + sprd.toFixed(0) + ' bp',
      col: col,
      hint: sprd >= 600 ? 'Healthy risk premium' : sprd >= 400 ? 'fair' : 'Tight'
    });
  }

  // 4. LevelTen vs Our PPA
  var lt = window._levelTenData;
  if (lt && ppa > 0) {
    var quarters = Object.keys(lt).sort().reverse();
    if (quarters.length) {
      var latest = lt[quarters[0]];
      var solarP25s = (latest.entries||[]).filter(function(e){return e.tech==='solar' && e.p25!=null;}).map(function(e){return Number(e.p25);});
      if (solarP25s.length) {
        var avgP25 = solarP25s.reduce(function(a,b){return a+b;},0) / solarP25s.length;
        var diff = ppa - avgP25;
        var col = diff >= 5 ? 'var(--green)' : diff >= 0 ? 'var(--amber)' : 'var(--red)';
        lines.push({
          label: '⚡ PPA Price vs LevelTen Solar P25',
          val: '$' + ppa.toFixed(2) + '/MWh  vs  $' + avgP25.toFixed(2) + '/MWh',
          delta: (diff >= 0 ? '+' : '') + diff.toFixed(2) + ' $/MWh',
          col: col,
          hint: diff >= 5 ? 'Premium secured' : diff >= 0 ? 'market avg' : 'Below market'
        });
      }
    }
  }

  if (!lines.length) {
    wrap.style.display = 'none';
    return;
  }

  body.innerHTML = lines.map(function(ln, i){
    var border = i < lines.length - 1 ? 'border-bottom:1px solid var(--border);' : '';
    return '<div style="display:grid;grid-template-columns:1fr auto;gap:12px;padding:8px 0;'+border+'">' +
      '<div>' +
        '<div style="font-size:9px;color:var(--t3);font-weight:700;letter-spacing:.06em;margin-bottom:2px">'+ln.label+'</div>' +
        '<div style="font-size:11px;color:var(--t1);font-variant-numeric:tabular-nums">'+ln.val+'</div>' +
        '<div style="font-size:9px;color:var(--t3);margin-top:1px">'+ln.hint+'</div>' +
      '</div>' +
      '<div style="text-align:right"><div style="font-size:13px;font-weight:800;color:'+ln.col+';font-variant-numeric:tabular-nums">'+ln.delta+'</div></div>' +
    '</div>';
  }).join('');
  wrap.style.display = 'block';
}

// ═══════════════════════════════════════════════════════════
function valResolveProjectRegion(projMeta) {
  if (!projMeta) return { levelten_covered: false, levelten_region: null, sub_region: null, display: '—' };
  var iso = (projMeta.iso||'').toUpperCase();
  var state = (projMeta.state||'').toUpperCase();

  // LevelTen 직접 커버 ISO (6개)
  var LT_COVERED = ['ERCOT','CAISO','PJM','MISO','SPP','AESO'];
  if (LT_COVERED.indexOf(iso) >= 0) {
    return { levelten_covered: true, levelten_region: iso, sub_region: iso, display: iso, state: state };
  }

  // WECC: state → sub-region 매핑
  if (iso === 'WECC') {
    var wecc_sub = {
      // Desert Southwest
      'AZ':'WECC_DSW', 'NM':'WECC_DSW', 'NV':'WECC_DSW',
      // Rocky Mountain
      'UT':'WECC_RM', 'CO':'WECC_RM', 'WY':'WECC_RM', 'ID':'WECC_RM',
      // Northwest
      'OR':'WECC_NW', 'WA':'WECC_NW', 'MT':'WECC_NW',
    };
    var sub = wecc_sub[state] || 'WECC_OTHER';
    var subLabels = {
      'WECC_DSW': 'WECC Desert Southwest',
      'WECC_RM':  'WECC Rocky Mountain',
      'WECC_NW':  'WECC Northwest',
      'WECC_OTHER': 'WECC'
    };
    return {
      levelten_covered: false,
      levelten_region: null,
      sub_region: sub,
      display: subLabels[sub] + (state ? ' (' + state + ')' : ''),
      state: state
    };
  }

  // 기타: ISO-NE, NYISO, SERC, Non-ISO, Others
  return {
    levelten_covered: false,
    levelten_region: null,
    sub_region: iso,
    display: iso + (state ? ' (' + state + ')' : ''),
    state: state
  };
}

// ═══════════════════════════════════════════════════════════
function valBuildMarketContextCard(isEn) {
  var ltAll = window._levelTenData || {};
  var quarters = Object.keys(ltAll).sort().reverse();
  if (!quarters.length) return '';
  var q = quarters[0];
  var d = ltAll[q] || {};

  // 우리 프로젝트 컨텍스트
  var ourData = window._lastValData || {};
  var ourOut = ourData.outputs || {};
  var ourAssum = ourData.assumptions || {};
  var ourPPA = ourOut.ppa_price || ourAssum.ppa_price;
  var ourBessToll = ourOut.bess_toll || ourAssum.bess_toll;
  var projId = (document.getElementById('val-proj-select')||{}).value || '';
  var projMeta = (window.PROJECTS||[]).find(function(p){return p.id===projId;}) || {};
  var ourISO = (projMeta.iso||'').toUpperCase();
  var ourHub = (projMeta.hub||'').toUpperCase();

  if (!ourPPA || !ourISO) return '';

  // 지역 해석 (WECC → sub-region, LevelTen 커버 여부)
  var region = valResolveProjectRegion(projMeta);
  var ourMarket = region.levelten_region;  // CAISO/ERCOT/... 또는 null
  var isLTCovered = region.levelten_covered;
  var subRegion = region.sub_region;       // WECC_RM, WECC_DSW, WECC_NW, ISO-NE, NYISO, SERC 등
  var regionDisplay = region.display;       // "WECC Rocky Mountain (UT)" 등 표시용

  // LevelTen 데이터 추출
  var solarISO = d.solar_iso || [];
  var solarHub = d.solar_hub || [];
  var storageISO = d.storage_iso || [];
  var solarPSV = d.solar_psv || [];
  var pipeline = d.pipeline_breakdown || [];
  var cont = d.solar_continental || {};
  var contAvg = d.solar_continental_avg || {};  // Market-Averaged Continental Index (ISO 평균)

  // AI Research 데이터 (LevelTen 미커버 지역용)
  var bessResearch = window._bessTollingData || {};
  var aiRegionData = null;
  if (!isLTCovered && bessResearch.iso_data) {
    aiRegionData = (bessResearch.iso_data||[]).find(function(e){
      var eReg = (e.region||'').toUpperCase();
      return eReg === ourISO || eReg === subRegion;
    });
  }

  // LevelTen 커버면 직접, 아니면 null
  var ourSolarISO = isLTCovered ? (solarISO.find(function(e){return (e.region||'').toUpperCase() === ourMarket;}) || {}) : {};
  var ourHubData = (isLTCovered && ourHub) ? solarHub.find(function(h){
    return (h.region||'').toUpperCase() === ourMarket &&
           (h.hub||'').toUpperCase().replace(/[_\s]/g,'') === ourHub.replace(/[_\s]/g,'');
  }) : null;
  var ourStorageISO = isLTCovered ? (storageISO.find(function(e){return (e.region||'').toUpperCase() === ourMarket;}) || {}) : {};
  var ourPSV = isLTCovered ? (solarPSV.find(function(e){return (e.region||'').toUpperCase() === ourMarket;}) || {}) : {};

  var sections = [];

  // ───────── ① PPA 경쟁력 ─────────
  if (isLTCovered && ourSolarISO.p25) {
    // [Case 1] LevelTen 커버 ISO — 직접 비교
    var iosP25 = ourSolarISO.p25;
    var diff = ourPPA - iosP25;
    var diffPct = (diff / iosP25) * 100;
    var diffCol = diff >= 0 ? 'var(--green)' : 'var(--red)';
    var percentileDesc = '';
    if (cont.p10 && cont.p90) {
      var ourPos = ((ourPPA - cont.p10) / (cont.p90 - cont.p10)) * 100;
      if (ourPos <= 25) percentileDesc = '시장 하위 25%ile';
      else if (ourPos <= 50) percentileDesc = '시장 중간 하위';
      else if (ourPos <= 75) percentileDesc = '시장 중간 상위';
      else percentileDesc = '시장 상위 25%ile';
    }
    var line1 = '<b style="color:var(--blue-h)">$'+ourPPA.toFixed(2)+'/MWh</b> · '+ourISO+' P25 $'+iosP25.toFixed(2)+' 대비 <span style="color:'+diffCol+';font-weight:700">'+(diff>=0?'+':'')+'$'+diff.toFixed(2)+' ('+(diffPct>=0?'+':'')+diffPct.toFixed(1)+'%)</span>' + (percentileDesc ? ' · 전 대륙 분포 기준 '+percentileDesc : '');
    var line2 = '';
    if (ourHubData && ourHubData.p25) {
      var hubDiff = ourPPA - ourHubData.p25;
      var hubDiffCol = hubDiff >= 0 ? 'var(--green)' : 'var(--red)';
      line2 = 'Hub <b>'+ourHubData.hub+'</b> P25 $'+ourHubData.p25.toFixed(2)+' 기준 <span style="color:'+hubDiffCol+';font-weight:700">'+(hubDiff>=0?'+':'')+'$'+hubDiff.toFixed(2)+'</span>';
    }
    sections.push({
      icon: '💰',
      title: 'PPA 경쟁력',
      lines: [line1, line2].filter(Boolean)
    });
  }
  // [Case 2] LevelTen 미커버 지역 — Continental Index 대용 + AI Research 둘 다 표시
  else if (!isLTCovered && cont.p10 && cont.p90) {
    var fallbackLines = [];
    // 1차: LevelTen Continental Index (공식, 전 대륙 P10-P90)
    var ourPos = ((ourPPA - cont.p10) / (cont.p90 - cont.p10)) * 100;
    var percDesc = ourPos <= 25 ? '하위 25%ile' : ourPos <= 50 ? '중간 하위' : ourPos <= 75 ? '중간 상위' : '상위 25%ile';
    var contMid = cont.p50 || (cont.p25+cont.p75)/2;
    var diffVsCont = ourPPA - contMid;
    var diffPctVsCont = (diffVsCont / contMid) * 100;
    var diffContCol = diffVsCont >= 0 ? 'var(--green)' : 'var(--red)';
    fallbackLines.push('<b style="color:var(--blue-h)">$'+ourPPA.toFixed(2)+'/MWh</b> · 전 대륙 P50 $'+contMid.toFixed(2)+' 대비 <span style="color:'+diffContCol+';font-weight:700">'+(diffVsCont>=0?'+':'')+'$'+diffVsCont.toFixed(2)+' ('+(diffPctVsCont>=0?'+':'')+diffPctVsCont.toFixed(1)+'%)</span> · '+percDesc);

    // Market-Averaged Continental (ISO 평균) — 더 높은 대용치
    if (contAvg.p25) {
      var avgDiff = ourPPA - contAvg.p25;
      var avgDiffPct = (avgDiff / contAvg.p25) * 100;
      var avgCol = avgDiff >= 0 ? 'var(--green)' : 'var(--red)';
      fallbackLines.push('Market-Averaged P25 $'+contAvg.p25.toFixed(2)+' (ISO 평균) 대비 <span style="color:'+avgCol+';font-weight:700">'+(avgDiff>=0?'+':'')+'$'+avgDiff.toFixed(2)+' ('+(avgDiffPct>=0?'+':'')+avgDiffPct.toFixed(1)+'%)</span>');
    }

    // 2차: AI Research (WECC sub-region / ISO-NE / NYISO 등)
    if (aiRegionData && aiRegionData.durations && aiRegionData.durations.length) {
      var dur4h = aiRegionData.durations.find(function(d){return d.hours === 4;}) || aiRegionData.durations[0];
      if (dur4h && dur4h.p25) {
        // AI Research는 BESS 가격 위주라 PPA는 market_note 활용
        if (aiRegionData.market_note) {
          fallbackLines.push('🤖 AI 분석: '+aiRegionData.market_note);
        }
      }
    }

    // 경고 명시 — 대용치 성격
    fallbackLines.push('<span style="color:var(--amber);font-size:9.5px">⚠️ '+regionDisplay+'는 LevelTen ISO 직접 매칭 불가 — 대륙 평균 대용 비교</span>');

    sections.push({
      icon: '💰',
      title: 'PPA 경쟁력 (대용 비교)',
      lines: fallbackLines
    });
  }

  // ───────── ② 구매자 경제성 (PSV) ─────────
  if (isLTCovered && ourPSV.psv_median != null) {
    // [Case 1] LevelTen 커버 ISO — 직접 PSV
    var med = ourPSV.psv_median;
    var medCol = med > 0 ? 'var(--green)' : med < -15 ? 'var(--red)' : 'var(--amber)';
    var interpretation = '';
    if (med > 0) interpretation = '구매자 순수익 시장 → 장기 offtake 안정성 <b style="color:var(--green)">높음</b>';
    else if (med < -15) interpretation = '구매자 큰 순손실 → 장기 offtake 재협상 리스크 <b style="color:var(--red)">큼</b>';
    else interpretation = '구매자 순손실 → 장기 offtake 안정성 <b style="color:var(--amber)">보통</b>';
    // Cross-ISO 맥락
    var positiveIsos = solarPSV.filter(function(e){return e.psv_median > 0;}).map(function(e){return e.region;});
    var crossLine = '';
    if (positiveIsos.length === 1 && positiveIsos[0].toUpperCase() === ourMarket) {
      crossLine = '✓ 6개 ISO 중 <b>유일한 양수 시장</b>';
    } else if (positiveIsos.length > 1) {
      crossLine = positiveIsos.length+'개 ISO가 양수 (우리 '+ourMarket+' 포함)';
    } else {
      crossLine = '모든 ISO 음수 시장';
    }
    sections.push({
      icon: '💵',
      title: '구매자 경제성 (Solar PSV)',
      lines: [
        '<b style="color:'+medCol+'">'+(med>=0?'+':'')+'$'+med.toFixed(0)+'/MWh</b> Median · '+interpretation,
        crossLine
      ]
    });
  }
  // [Case 2] LevelTen 미커버 — Cross-ISO 참고값 제공
  else if (!isLTCovered && solarPSV.length) {
    var psvSorted = solarPSV.slice().sort(function(a,b){return (b.psv_median||-999)-(a.psv_median||-999);});
    var psvLines = [];
    psvLines.push('⚠️ '+regionDisplay+' 직접 PSV No data — 인접 ISO 참고');
    // 상위 2개 + 하위 1개만 보여줌
    var topPSV = psvSorted.filter(function(e){return e.psv_median != null;}).slice(0, 3);
    if (topPSV.length) {
      var refs = topPSV.map(function(e){
        var c = e.psv_median > 0 ? 'var(--green)' : e.psv_median < -15 ? 'var(--red)' : 'var(--amber)';
        return e.region+': <span style="color:'+c+';font-weight:700">'+(e.psv_median>=0?'+':'')+'$'+Number(e.psv_median).toFixed(0)+'</span>';
      });
      psvLines.push('참고 PSV: '+refs.join(' · '));
    }
    sections.push({
      icon: '💵',
      title: '구매자 경제성 (Solar PSV — 참고)',
      lines: psvLines
    });
  }

  // ───────── ③ BESS Tolling ─────────
  var bessLines = [];
  if (isLTCovered && (ourStorageISO.median != null || ourStorageISO.p25 != null)) {
    // [Case 1] LevelTen 커버 ISO — 공식 Storage Index
    var bessMed = ourStorageISO.median || ourStorageISO.p50;
    if (ourBessToll && bessMed) {
      var bessDiff = ourBessToll - bessMed;
      var bessDiffPct = (bessDiff / bessMed) * 100;
      var overP75 = ourStorageISO.p75 && ourBessToll > ourStorageISO.p75;
      var underP25 = ourStorageISO.p25 && ourBessToll < ourStorageISO.p25;
      var bessCol = overP75 ? 'var(--red)' : (underP25 ? 'var(--green)' : 'var(--amber)');
      var bessFlag = overP75 ? ' ⚠️ 시장 상단 초과 (재협상 여지)' : (underP25 ? ' ✓ 보수적' : '');
      bessLines.push('우리 <b style="color:var(--blue-h)">$'+ourBessToll.toFixed(2)+'/kW-mo</b> · '+ourMarket+' Median $'+bessMed.toFixed(1)+' 대비 <span style="color:'+bessCol+';font-weight:700">'+(bessDiffPct>=0?'+':'')+bessDiffPct.toFixed(0)+'%</span>'+bessFlag);
      bessLines.push('LevelTen 공식 Storage Index 기준 (2025 tolling offers)');
    } else if (bessMed) {
      bessLines.push(ourMarket+' Median $'+bessMed.toFixed(1)+'/kW-mo · LevelTen 공식');
    }
  }
  // [Case 2] LevelTen 미커버 (WECC_*, ISO-NE, NYISO 등) — AI Research fallback
  else if (!isLTCovered && aiRegionData && aiRegionData.durations && aiRegionData.durations.length) {
    var dur4h = aiRegionData.durations.find(function(d){return d.hours === 4;}) || aiRegionData.durations[0];
    if (dur4h && dur4h.p25 && ourBessToll) {
      var aiMid = (dur4h.p25 + dur4h.p75) / 2;
      var aiDiff = ourBessToll - aiMid;
      var aiDiffPct = (aiDiff / aiMid) * 100;
      var aiCol = ourBessToll > dur4h.p75 ? 'var(--red)' : (ourBessToll < dur4h.p25 ? 'var(--green)' : 'var(--amber)');
      var aiFlag = ourBessToll > dur4h.p75 ? ' ⚠️ 추정치 상단 초과' : '';
      bessLines.push('우리 <b style="color:var(--blue-h)">$'+ourBessToll.toFixed(2)+'/kW-mo</b> · AI 추정 '+dur4h.hours+'h 중앙값 $'+aiMid.toFixed(1)+' 대비 <span style="color:'+aiCol+';font-weight:700">'+(aiDiffPct>=0?'+':'')+aiDiffPct.toFixed(0)+'%</span>'+aiFlag);
      bessLines.push('⚠️ AI Research 추정 ('+regionDisplay+') — 공식 index 아님');
    } else if (dur4h && dur4h.p25) {
      bessLines.push('AI 추정 '+dur4h.hours+'h P25-P75: $'+Number(dur4h.p25).toFixed(1)+'~$'+Number(dur4h.p75).toFixed(1)+'/kW-mo ('+regionDisplay+')');
    }
  }
  // [Case 3] 둘 다 없음 — 안내만
  else if (!isLTCovered && ourBessToll) {
    bessLines.push('우리 $'+ourBessToll.toFixed(2)+'/kW-mo');
    bessLines.push('⚠️ '+regionDisplay+' Storage 벤치마크 No data — External 탭에서 AI 리서치 실행 권장');
  }
  if (bessLines.length) {
    sections.push({
      icon: '🔋',
      title: 'BESS Tolling',
      lines: bessLines
    });
  }

  // ───────── ④ 시장 동향 ─────────
  var trendLines = [];
  if (isLTCovered && (ourSolarISO.qoq_pct != null || ourSolarISO.yoy_pct != null)) {
    var parts = [];
    if (ourSolarISO.qoq_pct != null) {
      var qCol = ourSolarISO.qoq_pct > 0 ? 'var(--green)' : 'var(--red)';
      parts.push('QoQ <b style="color:'+qCol+'">'+(ourSolarISO.qoq_pct>=0?'+':'')+ourSolarISO.qoq_pct.toFixed(1)+'%</b>');
    }
    if (ourSolarISO.yoy_pct != null) {
      var yCol = ourSolarISO.yoy_pct > 0 ? 'var(--green)' : 'var(--red)';
      parts.push('YoY <b style="color:'+yCol+'">'+(ourSolarISO.yoy_pct>=0?'+':'')+ourSolarISO.yoy_pct.toFixed(1)+'%</b>');
    }
    if (parts.length) {
      var trendDir = (ourSolarISO.qoq_pct > 0 && ourSolarISO.yoy_pct > 0) ? '상승세' : (ourSolarISO.qoq_pct < 0 && ourSolarISO.yoy_pct < 0) ? '하락세' : '혼조';
      trendLines.push(ourMarket+' Solar P25 '+parts.join(' · ')+' ('+trendDir+')');
    }
  } else if (!isLTCovered && (contAvg.qoq_pct != null || contAvg.yoy_pct != null)) {
    // LevelTen 미커버 — Market-Averaged Continental 추세 대용
    var cParts = [];
    if (contAvg.qoq_pct != null) {
      var cqCol = contAvg.qoq_pct > 0 ? 'var(--green)' : 'var(--red)';
      cParts.push('QoQ <b style="color:'+cqCol+'">'+(contAvg.qoq_pct>=0?'+':'')+contAvg.qoq_pct.toFixed(1)+'%</b>');
    }
    if (contAvg.yoy_pct != null) {
      var cyCol = contAvg.yoy_pct > 0 ? 'var(--green)' : 'var(--red)';
      cParts.push('YoY <b style="color:'+cyCol+'">'+(contAvg.yoy_pct>=0?'+':'')+contAvg.yoy_pct.toFixed(1)+'%</b>');
    }
    if (cParts.length) {
      trendLines.push('Market-Averaged Solar P25 '+cParts.join(' · ')+' (전 대륙 평균 대용)');
    }
  }
  // Hybrid 성장 (전 대륙 — 지역 무관)
  var p2025 = pipeline.find(function(p){return p.cod_year === '2025';}) || {};
  var p2030 = pipeline.find(function(p){return p.cod_year === '2030+' || p.cod_year === '2030';}) || {};
  if (p2025.hybrid_mw && p2030.hybrid_mw) {
    var growth = (p2030.hybrid_mw / p2025.hybrid_mw).toFixed(0);
    trendLines.push('2030+ Hybrid <b style="color:var(--green)">'+(p2030.hybrid_mw/1000).toFixed(0)+'GW</b> (2025 대비 '+growth+'배) · HEUH Solar+BESS 모델 시장 부합');
  }
  if (trendLines.length) {
    sections.push({
      icon: '📈',
      title: '시장 동향',
      lines: trendLines
    });
  }

  // 빈 카드면 숨김
  if (!sections.length) return '';

  // HTML 렌더
  var html = '<div style="padding:14px 16px;background:linear-gradient(135deg,rgba(139,92,246,.05) 0%,rgba(37,99,235,.04) 100%);border:1px solid rgba(139,92,246,.2);border-radius:8px">';

  // 지역 라벨 + LevelTen 커버 여부 뱃지
  var coverBadge = isLTCovered
    ? '<span style="font-size:8.5px;padding:2px 7px;background:rgba(16,185,129,.15);color:var(--green);border:1px solid rgba(16,185,129,.3);border-radius:10px;font-weight:700">📋 LevelTen 직접 커버</span>'
    : '<span style="font-size:8.5px;padding:2px 7px;background:rgba(245,158,11,.15);color:var(--amber);border:1px solid rgba(245,158,11,.3);border-radius:10px;font-weight:700">⚠️ LevelTen 미커버 · 대용 비교</span>';
  html += '<div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:10px;margin-bottom:10px;border-bottom:1px solid rgba(255,255,255,.08)">';
  html += '<div style="font-size:10.5px;color:var(--t1);font-weight:700">📍 '+regionDisplay+'</div>';
  html += '<div>'+coverBadge+'</div>';
  html += '</div>';

  sections.forEach(function(s, idx) {
    html += '<div style="margin-bottom:'+(idx === sections.length-1 ? '0' : '12px')+';padding-bottom:'+(idx === sections.length-1 ? '0' : '12px')+';'+(idx === sections.length-1 ? '' : 'border-bottom:1px solid rgba(255,255,255,.06)')+'">';
    html += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;font-size:9px;font-weight:800;color:var(--t2);letter-spacing:.08em;text-transform:uppercase">';
    html += '<span style="font-size:12px">'+s.icon+'</span>'+s.title;
    html += '</div>';
    s.lines.forEach(function(line){
      html += '<div style="font-size:11px;color:var(--t1);line-height:1.7;padding-left:20px">'+line+'</div>';
    });
    html += '</div>';
  });
  // "전체 분석 보기" 링크
  html += '<div style="margin-top:12px;padding-top:10px;border-top:1px solid rgba(255,255,255,.06);text-align:right">';
  html += '<a onclick="valSwitchTab(\'benchmark\', this); var ext=document.querySelector(\'.val-bm-tab[data-sub=external]\'); if(ext) ext.click();" style="font-size:10px;color:var(--blue-h);cursor:pointer;font-weight:600">External 탭에서 전체 분석 보기 →</a>';
  html += '<span style="font-size:9px;color:var(--t3);margin-left:8px">('+q+')</span>';
  html += '</div>';
  html += '</div>';

  return html;
}

// window 전역 노출 (HTML onclick용)
window.valLoadBenchmark = valLoadBenchmark;
window.valSwitchBmSub = valSwitchBmSub;
window.valLoadLevelTen = valLoadLevelTen;
window.valOpenLevelTenModal = valOpenLevelTenModal;
window.valToggleLevelTen = valToggleLevelTen;
window.valUploadLevelTen = valUploadLevelTen;
window.valLoadMarketBenchmark = valLoadMarketBenchmark;
window.valRunBessResearch = valRunBessResearch;
window.valLoadBessResearch = valLoadBessResearch;
window.valToggleBessResearch = valToggleBessResearch;
