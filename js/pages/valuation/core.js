/* ============================================================
   js/pages/valuation/core.js
   ============================================================
   Valuation page — Core: initialization, project loading, language,
   thresholds, history, scenarios, NPV, UI toggles, save/version modal.
   
   Note: Some helpers (vlUpdateModeUI, vlRenderIntegrityReport) are
   nested inside valLoadProject — not extracted separately.
   
   Extracted from index.html (Phase 3 Step 3-A refactoring)
   Generated: Apr 19, 2026
   ============================================================ */

// ══ VALUATION PAGE ══════════════════════════════════════════════
function openValuationPage() {
  openPage('valuation');
  setActiveNav('btn-valuation');
  initValuationPage();
  valLoadThresholds();
  var fab = document.querySelector('.ai-fab');
  if (fab) fab.style.display = 'none';
}

function valSaveThresholds() {
  localStorage.setItem('val_thr', JSON.stringify({
    dev: parseFloat(document.getElementById('thr-dev-margin').value)||10,
    irr: parseFloat(document.getElementById('thr-sponsor-irr').value)||9,
    itc: parseFloat(document.getElementById('thr-itc').value)||30
  }));
}

function valLoadThresholds() {
  try {
    var t = JSON.parse(localStorage.getItem('val_thr')||'{}');
    if (t.dev) document.getElementById('thr-dev-margin').value = t.dev;
    if (t.irr) document.getElementById('thr-sponsor-irr').value = t.irr;
    if (t.itc) document.getElementById('thr-itc').value = t.itc;
  } catch(e){}
  ['thr-dev-margin','thr-sponsor-irr','thr-itc'].forEach(function(id){
    var el=document.getElementById(id);
    if(el) el.onchange = valSaveThresholds;
  });
}

function valGetThresholds() {
  return {
    dev_margin_cwp: parseFloat((document.getElementById('thr-dev-margin')||{}).value)||10,
    sponsor_irr_pct: parseFloat((document.getElementById('thr-sponsor-irr')||{}).value)||9,
    itc_min_pct: parseFloat((document.getElementById('thr-itc')||{}).value)||30
  };
}

function valApplyLanguage() {
  // Valuation 페이지 전체 한글/영어 텍스트 동적 적용
  var L = LANG.en;  // Valuation is English-only (see PR: feat/valuation-english-only)
  if (!L) return;
  
  // 헬퍼: ID 또는 selector로 텍스트/HTML 적용
          
  // ─── 헤더 ───
  var savedBadge = document.getElementById('val-saved-badge');
  if (savedBadge) {
    var span = savedBadge.querySelector('span') || savedBadge;
    span.textContent = L.valSaved;
  }
  var liveBadge = document.getElementById('val-live-badge');
  if (liveBadge) liveBadge.textContent = L.valLive;
  
  // Integrity Check 버튼 (상단바)
  var icBtnText = document.getElementById('val-ic-btn-text');
  if (icBtnText && L.valICBtnLabel) icBtnText.textContent = L.valICBtnLabel;
  var icModalTitle = document.getElementById('val-ic-modal-title');
  if (icModalTitle && L.valICTitle) icModalTitle.textContent = L.valICTitle;
  
  // Upload & Parse 버튼
  var uploadBtn = document.getElementById('val-upload-btn2');
  if (uploadBtn && !uploadBtn.disabled) uploadBtn.textContent = L.valUploadParse;
  
  // Export IC Opinion 버튼
  var exportBtn = document.getElementById('val-export-btn');
  if (exportBtn) exportBtn.textContent = L.valExportIC;
  
  // ─── 탭 버튼 ───
  var tabs = document.querySelectorAll('.val-tab');
  var tabKeys = ['valTabOverview', 'valTabSensitivity', 'valTabCashFlow', 'valTabHistory', 'valTabBenchmark', 'valTabIC'];
  tabs.forEach(function(tab, i) {
    if (tabKeys[i] && L[tabKeys[i]]) tab.textContent = L[tabKeys[i]];
  });
  
  // ─── 좌측 사이드바 섹션 제목 ───
  var secTitles = document.querySelectorAll('.val-sec-title');
  // 실제 HTML DOM 순서 (index.html L6815 이후):
  // Calc Mode → Project → Revenue → Deal Structure → CAPEX → OPEX → Debt → Credit → BESS Augmentation
  var secMap = ['valCalcMode', 'valSecProject', 'valSecRevenue',
                'valSecDealStructure', 'valSecCapex', 'valSecOpex',
                'valSecDebt', 'valSecCredit', 'valSecBess'];
  secTitles.forEach(function(el, i) {
    if (secMap[i] && L[secMap[i]]) el.textContent = L[secMap[i]];
  });
  
  // ─── 모드 설명 ───
  var desc = document.getElementById('vl-mode-desc');
  if (desc) {
    var mode = window._calibrationMode || 'calibration';
    desc.innerHTML = (mode === 'calibration') ? L.valModeCalibDesc : L.valModePredictDesc;
  }
  // ─── Scenario Analysis FMV Note (CAPEX 섹션) ───
  var fmvNote = document.getElementById('vi-prediction-fmv-note');
  if (fmvNote) {
    var curMode = window._calibrationMode || 'calibration';
    fmvNote.style.display = (curMode === 'prediction') ? 'block' : 'none';
  }
  // 모드 버튼 텍스트
  var mp = document.getElementById('vl-mode-predict');
  var mc = document.getElementById('vl-mode-calib');
  if (mp && L.valModePredict) mp.textContent = L.valModePredict;
  if (mc && L.valModeCalib) mc.textContent = L.valModeCalib;
  
  // ─── Integrity Check ───
  var icDesc = document.querySelector('#vl-check-file')?.closest('.val-sec-body')?.querySelector('div');
  if (icDesc) icDesc.textContent = L.valICDesc;
  var icFname = document.getElementById('vl-check-fname');
  if (icFname && !document.getElementById('vl-check-file').files[0]) icFname.textContent = L.valICFilePick;
  var icBtn = document.getElementById('vl-check-run-btn');
  if (icBtn && !icBtn.disabled) icBtn.textContent = L.valICRunBtn;
  
  // ─── Mode Info 모달 ───
  var infoModal = document.getElementById('val-mode-info-modal');
  if (infoModal) {
    var infoTitle = document.getElementById('val-mode-info-title');
    if (infoTitle) infoTitle.textContent = L.valModeInfoTitle;
    
    var infoGrid = infoModal.querySelector('div[style*="grid-template-columns:1fr 1fr"]');
    if (infoGrid) {
      infoGrid.innerHTML = 
        '<div style="padding:14px;background:rgba(124,58,237,0.06);border:1px solid rgba(124,58,237,0.2);border-radius:10px">' +
          '<div style="font-size:13px;font-weight:800;margin-bottom:8px;color:#c4b5fd">📊 Actual Model</div>' +
          '<div style="font-size:10px;color:var(--t2);line-height:1.7">' +
            '<strong>' + L.valModeInfoUsage + ':</strong> ' + L.valModeCalibUsage + '<br>' +
            '<strong>' + L.valModeInfoDebt + ':</strong> Actual (Sculpted DSCR-based)<br>' +
            '<strong>' + L.valModeInfoFlip + ':</strong> Actual (e.g. 9.2% Pay-Go)<br>' +
            '<strong>' + L.valModeInfoTax + ':</strong> Actual NOL offset (Y1–9)<br>' +
            '<strong>' + L.valModeInfoCapex + ':</strong> Actual FMV step-up (e.g. 23%)<br>' +
            '<strong>' + L.valModeInfoAccuracy + ':</strong> Replicates uploaded model ±0.15%p' +
          '</div>' +
        '</div>' +
        '<div style="padding:14px;background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.2);border-radius:10px">' +
          '<div style="font-size:13px;font-weight:800;margin-bottom:8px;color:#6ee7b7">🔮 Scenario Analysis</div>' +
          '<div style="font-size:10px;color:var(--t2);line-height:1.7">' +
            '<strong>' + L.valModeInfoUsage + ':</strong> ' + L.valModePredictUsage + '<br>' +
            '<strong>' + L.valModeInfoDebt + ':</strong> DSCR 1.30 Sculpted (industry)<br>' +
            '<strong>' + L.valModeInfoFlip + ':</strong> 99/5 standard (dynamic flip)<br>' +
            '<strong>' + L.valModeInfoTax + ':</strong> Immediate MACRS benefit<br>' +
            '<strong>' + L.valModeInfoCapex + ':</strong> 17.5% FMV Step-up (Norton Rose)<br>' +
            '<strong>' + L.valModeInfoAccuracy + ':</strong> Industry-benchmarked' +
          '</div>' +
        '</div>';
    }
    
    var infoHelp = infoModal.querySelector('div[style*="background:rgba(0,0,0,0.25)"]');
    if (infoHelp) {
      infoHelp.innerHTML = 
        '<strong style="color:var(--t1)">' + L.valModeInfoHelp + '</strong><br>' +
        L.valModeInfoHelpCalib + '<br>' +
        L.valModeInfoHelpPredict + '<br><br>' +
        '<span style="font-size:10px;color:var(--t3)">' + L.valModeInfoNote + '</span>';
    }
  }
  
  // ─── Empty state ───
  var emptyTitle = document.querySelector('#val-empty-state .val-empty-title');
  if (emptyTitle) emptyTitle.textContent = L.valEmptyTitle;
  var emptySub = document.querySelector('#val-empty-state .val-empty-sub');
  if (emptySub) emptySub.textContent = L.valEmptySub;
  
  // ─── Data badge (No data — upload model) ───
  var dataBadge = document.getElementById('val-data-badge');
  if (dataBadge && dataBadge.textContent.toLowerCase().includes('no data')) {
    dataBadge.textContent = L.valNoData;
  }
  
  // ─── Upload button label (English-only) ───
  // Upload fname
  var uploadFname = document.getElementById('val-upload-fname');
  if (uploadFname) {
    uploadFname.textContent = 'PF Model Upload (.xlsb / .xlsx)';
  }

  // "No recipient" 정적 옵션
  document.querySelectorAll('option').forEach(function(opt) {
    if (opt.textContent.includes('No recipient') || opt.textContent.includes('No share target')) {
      opt.textContent = '— No share target —';
    }
  });
}

function initValuationPage() {
  // 언어 적용 먼저
  setTimeout(valApplyLanguage, 0);
  
  // Populate project dropdown
  var sel = document.getElementById('val-proj-select');
  if (!sel) return;
  if (sel.options.length === 0) {
    // A→Z 프로젝트명 기준 정렬 (원본 PROJECTS 배열은 건드리지 않음)
    var sortedProjects = PROJECTS.slice().sort(function(a, b) {
      return (a.name || '').localeCompare(b.name || '', 'en', {sensitivity: 'base'});
    });
    sortedProjects.forEach(function(p) {
      var opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name + ' (' + p.state + ', ' + p.iso + ')';
      sel.appendChild(opt);
    });
    sel.onchange = function() { valLoadProject(this.value); };
  }
  // Load first project or currently selected
  if (sel.value) valLoadProject(sel.value);
}

function valLoadProject(projectId) {
  var safeId = projectId.replace(/[/.]/g, '_');
  // Reset outputs
  ['vo-dev-margin','vo-epc-margin','vo-total-margin','vo-lirr','vo-uirr','vo-sirr',
   'vo-capex','vo-debt','vo-te','vo-eq','vo-ppa','vo-toll','vo-specs','vo-dates',
   'vo-irr-lev-pretax','vo-irr-lev-aftertax-before','vo-irr-lev-aftertax-after',
   'vo-irr-unlev-pretax','vo-wacc'].forEach(function(id) {
    var el = document.getElementById(id); if (el) el.textContent = '—';
  });
  var badge = document.getElementById('val-data-badge');
  if (badge) { badge.textContent = 'Loading...'; badge.style.background='var(--surface3)'; badge.style.color='var(--t3)'; }

  // 프로젝트 전환 시 CF/IC 탭은 일단 잠금 상태로 리셋 (데이터 로드 후 valDisplayData가 재활성화)
  ['val-tab-cf', 'val-tab-ic'].forEach(function(tid) {
    var tab = document.getElementById(tid);
    if (tab) {
      tab.classList.add('val-tab-locked');
      tab.style.opacity = '.35';
      tab.style.cursor = 'not-allowed';
      tab.style.pointerEvents = 'none';
      tab.title = 'Activates when saved Valuation data exists or after Calculate';
    }
  });

  // ══════ MODE 토글 (Actual Model vs Scenario Analysis) ══════
  // 기본값 'calibration' (= Actual Model, 엑셀 검증이 주 용도)
  // 내부 값은 'calibration' | 'prediction' 유지 (백엔드 호환)
  // UI 라벨만 Actual Model / Scenario Analysis로 표시
  // localStorage에 사용자 선택 저장 → 이후 방문 시 재사용
  var savedMode = localStorage.getItem('val_calc_mode');
  window._calibrationMode = savedMode || 'calibration';
  
  function vlUpdateModeUI(mode) {
    window._calibrationMode = mode;
    localStorage.setItem('val_calc_mode', mode);
    var predBtn = document.getElementById('vl-mode-predict');
    var calBtn = document.getElementById('vl-mode-calib');
    var desc = document.getElementById('vl-mode-desc');
    if (!predBtn || !calBtn) return;
    if (mode === 'calibration') {
      predBtn.style.background = 'transparent';
      predBtn.style.color = 'var(--t2)';
      calBtn.style.background = 'linear-gradient(135deg,#7c3aed,#5b21b6)';
      calBtn.style.color = '#fff';
      if (desc) desc.innerHTML = '<strong>📊 Actual Model:</strong> Replicates uploaded Excel model (e.g. Neptune FMV 23%, Pay-Go 9.2%, NOL offset). 💡 Tweak parameters for what-if scenarios from the actual baseline.';
    } else {
      predBtn.style.background = 'linear-gradient(135deg,#059669,#10b981)';
      predBtn.style.color = '#fff';
      calBtn.style.background = 'transparent';
      calBtn.style.color = 'var(--t2)';
      if (desc) desc.innerHTML = '<strong>🔮 Scenario Analysis:</strong> New deal feasibility using industry standards (FMV Step-up 17.5%, DSCR 1.30, 99/5 Partnership Flip). 💡 Quick IC hurdle decision before Excel model is built.';
    }
    // Scenario Analysis FMV note (CAPEX 섹션)
    var fmvNote = document.getElementById('vi-prediction-fmv-note');
    if (fmvNote) fmvNote.style.display = (mode === 'prediction') ? 'block' : 'none';
  }
  
  // 초기 UI 반영
  vlUpdateModeUI(window._calibrationMode);
  
  var pBtn2 = document.getElementById('vl-mode-predict');
  var cBtn2 = document.getElementById('vl-mode-calib');
  if (pBtn2) pBtn2.onclick = function() { vlUpdateModeUI('prediction'); };
  if (cBtn2) cBtn2.onclick = function() { vlUpdateModeUI('calibration'); };
  
  // ══════ Integrity Check 핸들러 (상단바 버튼) ══════
  // 파일 선택 → 자동 실행 → 모달로 결과 표시
  var checkFile = document.getElementById('vl-check-file');
  var icLabel = document.getElementById('val-ic-label');
  var icIcon = document.getElementById('val-ic-icon');
  var icBtnText = document.getElementById('val-ic-btn-text');
  var icModal = document.getElementById('val-ic-modal');
  var icModalFname = document.getElementById('val-ic-modal-filename');
  if (checkFile) checkFile.onchange = async function() {
    var file = this.files[0]; if (!file) return;
    var result = document.getElementById('vl-check-result');
    var L = (typeof LANG !== 'undefined' && LANG.en) || {};  // Valuation = English-only
    if (icIcon) icIcon.textContent = '⏳';
    if (icBtnText) icBtnText.textContent = L.valICChecking || 'Checking...';
    if (icLabel) icLabel.style.pointerEvents = 'none';
    try {
      var token = window._authToken || localStorage.getItem('hwr_token');
      var form = new FormData(); form.append('file', file);
      var res = await fetch(window.API_URL + '/valuation/integrity-check?lang=en', {
        method: 'POST', headers: {'Authorization': 'Bearer '+token}, body: form
      });
      var data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Check failed');
      if (icModalFname) icModalFname.textContent = '📄 ' + file.name;
      vlRenderIntegrityReport(result, data);
      if (icModal) icModal.style.display = 'flex';
      // 권장 mode 자동 전환
      if (data.metadata && data.metadata.recommended_mode) {
        vlUpdateModeUI(data.metadata.recommended_mode);
      }
    } catch(e) {
      if (icModalFname) icModalFname.textContent = '📄 ' + file.name;
      if (result) result.innerHTML = '<div style="padding:12px;background:rgba(239,68,68,0.1);color:#f87171;font-size:11px;border-radius:6px">❌ ' + e.message + '</div>';
      if (icModal) icModal.style.display = 'flex';
    } finally {
      if (icIcon) icIcon.textContent = '🔍';
      if (icBtnText) icBtnText.textContent = L.valICBtnLabel || 'Model Audit';
      if (icLabel) icLabel.style.pointerEvents = 'auto';
      // 같은 파일 재선택 가능하도록 value 리셋
      this.value = '';
    }
  };

  function vlRenderIntegrityReport(container, data) {
    var s = data.summary || {};
    var checks = data.checks || [];
    var meta = data.metadata || {};
    var L = LANG.en;  // Valuation = English-only (Integrity Report)
    // 절제된 tone: 화려한 이모지 대신 단색 dot + 한 글자 라벨
    var sevConfig = {
      'HIGH':   {dot:'#ef4444', label:'HIGH',   accent:'rgba(239,68,68,0.3)',  textColor:'#fca5a5'},
      'MEDIUM': {dot:'#f59e0b', label:'MEDIUM', accent:'rgba(245,158,11,0.3)', textColor:'#fcd34d'},
      'LOW':    {dot:'#64748b', label:'LOW',    accent:'rgba(100,116,139,0.3)', textColor:'#cbd5e1'},
      'INFO':   {dot:'#64748b', label:'INFO',   accent:'rgba(100,116,139,0.3)', textColor:'#cbd5e1'},
      'OK':     {dot:'#10b981', label:'PASS',   accent:'rgba(16,185,129,0.3)', textColor:'#6ee7b7'}
    };

    var html = '';
    
    // ─── 헤더: 타이틀 + 요약 배지 ───
    html += '<div style="padding:20px 22px;background:rgba(255,255,255,0.02);border-radius:10px;border:1px solid var(--border);margin-bottom:0">';
    
    // 타이틀 + 파일 스탯
    html += '<div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:14px;gap:16px;flex-wrap:wrap">';
    html += '<div style="font-size:15px;font-weight:600;color:var(--t1);letter-spacing:-0.01em">' + (L.valICReportTitle || 'Integrity Report') + '</div>';
    
    // 시트/에러 요약 (담백)
    var statLine = [];
    if (meta.sheet_count) statLine.push(meta.sheet_count + ' sheets');
    if (meta.formula_error_count !== undefined && meta.formula_error_count > 0) statLine.push(meta.formula_error_count.toLocaleString() + ' formula errors');
    if (meta.na_count) statLine.push(meta.na_count + ' #N/A');
    if (statLine.length) {
      html += '<div style="font-size:11px;color:var(--t3);font-variant-numeric:tabular-nums">' + statLine.join('  ·  ') + '</div>';
    }
    html += '</div>';
    
    // Severity 요약 배지 (있는 것만)
    var sumBadges = '';
    [['high','HIGH'],['medium','MEDIUM'],['low','LOW'],['ok','OK']].forEach(function(pair) {
      var v = s[pair[0]] || 0;
      if (v > 0) {
        var c = sevConfig[pair[1]];
        sumBadges += '<span style="display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:12px;background:rgba(255,255,255,0.03);border:1px solid '+c.accent+';font-size:11px;font-weight:500;color:'+c.textColor+';letter-spacing:0.02em">'
                  +  '<span style="width:6px;height:6px;border-radius:50%;background:'+c.dot+'"></span>'
                  +  c.label+' '+v
                  +  '</span>';
      }
    });
    if (sumBadges) {
      html += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">' + sumBadges + '</div>';
    }
    
    // ─── 개별 체크 항목 ───
    if (checks.length === 0) {
      html += '<div style="padding:14px;text-align:center;color:var(--t3);font-size:12px">No issues detected.</div>';
    } else {
      html += '<div style="display:flex;flex-direction:column;gap:8px">';
      checks.forEach(function(c) {
        var cfg = sevConfig[c.severity] || sevConfig['LOW'];
        // 카드: 왼쪽 얇은 accent line, 내부는 담백한 배경, 큰 글씨 제목
        html += '<div style="padding:14px 16px;background:rgba(255,255,255,0.02);border:1px solid var(--border);border-left:3px solid '+cfg.dot+';border-radius:8px;transition:background 0.12s">';
        
        // 제목 줄: dot + 라벨 + 타이틀
        html += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">';
        html += '<span style="font-size:10px;font-weight:700;color:'+cfg.textColor+';letter-spacing:0.08em;padding:2px 8px;border:1px solid '+cfg.accent+';border-radius:10px">'+cfg.label+'</span>';
        html += '<span style="font-size:13px;font-weight:600;color:var(--t1);letter-spacing:-0.005em">'+c.title+'</span>';
        html += '</div>';
        
        // Description — 이제 제대로 읽힐 크기
        if (c.description) {
          html += '<div style="font-size:12px;color:var(--t2);line-height:1.55;margin-top:4px">'+c.description+'</div>';
        }
        
        // Detail: 시트별 breakdown
        // 백엔드에서 집계된 detail_by_sheet 우선 사용, 없으면 legacy detail 배열 집계
        var sheetRows = null;
        if (c.detail_by_sheet && Array.isArray(c.detail_by_sheet) && c.detail_by_sheet.length > 0) {
          sheetRows = c.detail_by_sheet;  // [{sheet, count, cells:[...]}]
        } else if (c.detail && Array.isArray(c.detail) && c.detail.length > 0 && c.detail[0].sheet) {
          // legacy: 샘플 기반 on-the-fly 집계
          var bySheet = {};
          c.detail.forEach(function(e) {
            if (!bySheet[e.sheet]) bySheet[e.sheet] = {count:0, cells:[]};
            bySheet[e.sheet].count += 1;
            if (bySheet[e.sheet].cells.length < 3) bySheet[e.sheet].cells.push(e.cell);
          });
          sheetRows = Object.entries(bySheet)
            .map(function(p){ return {sheet:p[0], count:p[1].count, cells:p[1].cells}; })
            .sort(function(a,b){ return b.count - a.count; });
        }
        
        if (sheetRows) {
          html += '<div style="margin-top:10px;padding:10px 12px;background:rgba(0,0,0,0.2);border-radius:6px">';
          html += '<div style="font-size:10px;font-weight:600;color:var(--t3);letter-spacing:0.05em;text-transform:uppercase;margin-bottom:6px">Errors by Sheet</div>';
          html += '<div style="display:flex;flex-direction:column;gap:0;font-variant-numeric:tabular-nums">';
          var shown = sheetRows.slice(0, 8);
          shown.forEach(function(row, idx) {
            var cellsStr = (row.cells || []).join(', ');
            if (row.count > (row.cells||[]).length) cellsStr += ', …';
            html += '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding:5px 0;'+(idx < shown.length-1?'border-bottom:1px dashed rgba(255,255,255,0.04)':'')+'">';
            html += '<span style="font-size:11px;color:var(--t2);font-weight:500;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+row.sheet+'</span>';
            html += '<span style="font-size:10px;color:var(--t3);font-family:ui-monospace,monospace;flex:1;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+cellsStr+'</span>';
            html += '<span style="font-size:12px;color:'+cfg.dot+';font-weight:700;min-width:48px;text-align:right">'+row.count.toLocaleString()+'</span>';
            html += '</div>';
          });
          if (sheetRows.length > 8) {
            html += '<div style="font-size:10px;color:var(--t3);text-align:center;padding-top:6px;font-style:italic">+ '+(sheetRows.length-8)+' more sheets</div>';
          }
          html += '</div></div>';
        }
        
        // Action (권고)
        if (c.action) {
          html += '<div style="font-size:11px;color:var(--t3);line-height:1.5;margin-top:8px;padding-top:8px;border-top:1px dashed rgba(255,255,255,0.05)">→ '+c.action+'</div>';
        }
        html += '</div>';
      });
      html += '</div>';
    }
    
    html += '</div>';
    container.innerHTML = html;
    container.style.display = 'block';
  }

  // ══════ IRR Decomposition 핸들러 ══════
  var decompSection = document.getElementById('vo-decomp-section');
  var decompRunBtn = document.getElementById('vo-decomp-run-btn');
  if (decompRunBtn) decompRunBtn.onclick = async function() {
    var runTxt = document.getElementById('vo-decomp-run-txt');
    var content = document.getElementById('vo-decomp-content');
    if (runTxt) runTxt.textContent = '⏳ Analyzing...';
    this.disabled = true;
    try {
      var token = window._authToken || localStorage.getItem('hwr_token');
      var projectId = (document.getElementById('val-proj-select')||{}).value || '';
      // 최신 inputs 수집 (Calculate 실행된 결과 기준)
      var inputs = window._lastValInputs || {};
      if (!inputs || Object.keys(inputs).length === 0) {
        alert('Please click Calculate first to run the analysis.');
        this.disabled = false;
        if (runTxt) runTxt.textContent = 'Run Analysis';
        return;
      }
      var res = await fetch(window.API_URL + '/valuation/decompose-irr', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer '+token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, inputs: inputs })
      });
      var data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Analysis failed');
      window._lastDecomposition = data.result;
      voRenderDecomposition(data.result);
      if (content) content.style.display = 'block';
      if (runTxt) runTxt.textContent = '↻ Re-analyze';
    } catch(e) {
      alert('❌ ' + e.message);
      if (runTxt) runTxt.textContent = 'Run Analysis';
    } finally {
      this.disabled = false;
    }
  };

  function voRenderDecomposition(data) {
    var d = data;
    document.getElementById('vo-decomp-calib-irr').textContent = d.calib_irr.toFixed(2) + '%';
    document.getElementById('vo-decomp-predict-irr').textContent = d.predict_irr.toFixed(2) + '%';
    var deltaEl = document.getElementById('vo-decomp-delta');
    var sign = d.total_delta >= 0 ? '+' : '';
    deltaEl.textContent = sign + d.total_delta.toFixed(2) + '%p';
    deltaEl.style.color = d.total_delta >= 0 ? 'var(--green)' : 'var(--red)';
    
    var container = document.getElementById('vo-decomp-factors');
    container.innerHTML = '';
    var factors = d.factors || [];
    factors.forEach(function(f) {
      var name = f.name_en;  // Valuation = English-only; backend still returns both
      var fromC = f.from_calib;
      var toP = f.to_predict;
      var sign2 = f.delta_pp >= 0 ? '+' : '';
      var color = f.delta_pp >= 0 ? '#10b981' : '#ef4444';
      var absPp = Math.abs(f.delta_pp);
      var maxAbs = Math.max(...factors.map(function(x){ return Math.abs(x.delta_pp); }));
      var widthPct = maxAbs > 0 ? (absPp / maxAbs * 100) : 0;
      
      var html = '<div style="padding:10px;background:rgba(0,0,0,0.2);border-radius:6px;border-left:3px solid ' + color + '">';
      html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">';
      html += '<div style="font-size:11px;font-weight:700;color:var(--t1)">' + name + '</div>';
      html += '<div style="font-size:13px;font-weight:800;color:' + color + ';font-variant-numeric:tabular-nums">' + sign2 + f.delta_pp.toFixed(2) + '%p</div>';
      html += '</div>';
      // Bar
      html += '<div style="height:4px;background:rgba(255,255,255,0.05);border-radius:2px;overflow:hidden;margin-bottom:6px">';
      html += '<div style="height:100%;width:' + widthPct + '%;background:' + color + ';transition:width 0.3s"></div>';
      html += '</div>';
      // Detail
      html += '<div style="font-size:9px;color:var(--t3);line-height:1.5">';
      html += '<div>📊 <span style="color:#c4b5fd">Actual:</span> ' + fromC + '</div>';
      html += '<div>🔮 <span style="color:#6ee7b7">Scenario:</span> ' + toP + '</div>';
      html += '</div>';
      html += '</div>';
      container.innerHTML += html;
    });
  }

  // ══════ Claude 해설 버튼 핸들러 ══════
  var explainBtn = document.getElementById('vo-decomp-explain-btn');
  if (explainBtn) explainBtn.onclick = async function() {
    var txt = document.getElementById('vo-decomp-explain-txt');
    var result = document.getElementById('vo-decomp-explanation');
    if (!window._lastDecomposition) {
      alert('Run analysis first.');
      return;
    }
    if (txt) txt.textContent = '⏳ Generating...';
    this.disabled = true;
    try {
      var token = window._authToken || localStorage.getItem('hwr_token');
      var res = await fetch(window.API_URL + '/valuation/explain-diff', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer '+token, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: (document.getElementById('val-proj-select')||{}).value || '',
          decomposition: window._lastDecomposition,
          lang: 'en'
        })
      });
      var data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Explanation failed');
      if (result) {
        result.textContent = data.explanation || '';
        result.style.display = 'block';
      }
      if (txt) txt.textContent = '↻ Regenerate';
    } catch(e) {
      alert('❌ ' + e.message);
      if (txt) txt.textContent = 'Get AI Explanation';
    } finally {
      this.disabled = false;
    }
  };

  // 현재 세션 valuation 데이터 초기화 (전환 시 이전 데이터 잔존 방지)
  window._lastValData = null;

  // Load from Firebase
  apiCall('GET', '/valuation/' + safeId + '/latest').then(function(data) {
    if (!data || !data.outputs) {
      if (badge) { badge.textContent = 'No data — upload model'; badge.style.background='var(--surface3)'; badge.style.color='var(--t3)'; }
      return;
    }
    valDisplayData(data, safeId);
  }).catch(function() {
    if (badge) badge.textContent = 'Load failed';
  });
}

function valDisplayData(data, safeId) {
  window._lastValData = data;  // Benchmark vs 시장 비교용
  var a = data.assumptions || {};
  var o = data.outputs || {};
  var badge = document.getElementById('val-data-badge');

  if (badge) {
    badge.textContent = '✓ ' + (data.uploaded_at||'').substring(0,10);
    badge.style.background = 'var(--green-sub)';
    badge.style.color = 'var(--green)';
  }

  function fmt(v) { return v ? '$' + (v/1000).toFixed(1) + 'M' : '—'; }
  function fmtPct(v) { return v ? (v*100).toFixed(2) + '%' : '—'; }

  // Margins
  var devM = o.dev_margin || 0;
  var totalM = o.total_margin || 0;
  var epcM = totalM - devM;
  var el;
  el = document.getElementById('vo-dev-margin'); if(el) el.textContent = devM ? '$'+(devM/1000).toFixed(1)+'M' : '—';
  el = document.getElementById('vo-epc-margin'); if(el) el.textContent = epcM > 0 ? '$'+(epcM/1000).toFixed(1)+'M' : '—';
  el = document.getElementById('vo-total-margin'); if(el) el.textContent = totalM ? '$'+(totalM/1000).toFixed(1)+'M' : '—';
  el = document.getElementById('vo-margin-cwp'); if(el && o.margin_cwp) el.textContent = o.margin_cwp.toFixed(2)+' c/Wp';

  // IRRs
  el = document.getElementById('vo-lirr'); if(el) el.textContent = fmtPct(o.levered_irr);
  el = document.getElementById('vo-uirr'); if(el) el.textContent = fmtPct(o.unlevered_irr);
  el = document.getElementById('vo-sirr'); if(el) el.textContent = fmtPct(o.sponsor_irr || o.sponsor_irr_contract);

  // ── Returns Detail 5 카드 (Levered Pre-Tax / AT Before NOL / AT After NOL / Unlevered / WACC)
  // ════════════════════════════════════════════════════════════════════
  // 모드별 필드 소스 분기 (Phase F-1):
  //   📊 Actual Model (calibration):
  //     - Excel 파싱 값 우선 (업로드된 PF 모델의 실측 IRR)
  //   🔮 Scenario Analysis (prediction):
  //     - 엔진 계산 값 사용 (levered_irr, sponsor_irr, unlevered_irr)
  //     - After NOL 박스는 N/A (Prediction은 Immediate benefit mode)
  // ════════════════════════════════════════════════════════════════════
  var irrPct = function(v) { return (v != null && !isNaN(v)) ? (v * 100).toFixed(2) + '%' : '—'; };
  var isScenarioMode = (window._calibrationMode === 'prediction');
  
  // Lev Pre-Tax
  el = document.getElementById('vo-irr-lev-pretax');
  if(el) el.textContent = irrPct(
    isScenarioMode ? o.levered_irr : (o.sponsor_irr_levered_pretax || o.levered_irr)
  );
  
  // AT Before NOL — Scenario에선 Sponsor IRR (After-Tax 단일 값)
  el = document.getElementById('vo-irr-lev-aftertax-before');
  if(el) el.textContent = irrPct(
    isScenarioMode ? o.sponsor_irr : o.sponsor_irr_aftertax_before_nol
  );
  
  // AT After NOL — Scenario 모드에선 N/A (Immediate benefit, NOL 구분 없음)
  el = document.getElementById('vo-irr-lev-aftertax-after');
  if(el) el.textContent = isScenarioMode 
    ? 'N/A' 
    : irrPct(o.sponsor_irr_aftertax_after_nol);
  
  // Unlevered
  el = document.getElementById('vo-irr-unlev-pretax');
  if(el) el.textContent = irrPct(
    isScenarioMode ? o.unlevered_irr : (o.sponsor_irr_unlevered_pretax || o.unlevered_irr)
  );
  
  // WACC
  el = document.getElementById('vo-wacc');
  if(el) el.textContent = irrPct(o.wacc);

  // After NOL 박스의 부제도 모드별 조정
  var atAfterBox = document.getElementById('vo-irr-lev-aftertax-after');
  if (atAfterBox) {
    var subtitle = atAfterBox.parentElement.querySelector('div:last-child');
    if (subtitle) {
      subtitle.innerHTML = isScenarioMode
        ? '<span style="color:var(--t3);opacity:.7">Immediate Benefit · N/A</span>'
        : 'After-Tax (After NOL)';
    }
  }

  // 비교 인사이트 자동 생성
  var insightEl = document.getElementById('vo-irr-insights');
  var insightTxt = document.getElementById('vo-irr-insight-text');
  if (insightEl && insightTxt) {
    var insights = [];
    // 모드별 소스 선택
    var uPre, wacc_v, lPre, atBefore, atAfter;
    if (isScenarioMode) {
      uPre = o.unlevered_irr;
      wacc_v = o.wacc;
      lPre = o.levered_irr;
      atBefore = o.sponsor_irr;  // Scenario: single after-tax
      atAfter = null;              // Scenario: no NOL distinction
    } else {
      uPre = o.sponsor_irr_unlevered_pretax || o.unlevered_irr;
      wacc_v = o.wacc;
      lPre = o.sponsor_irr_levered_pretax || o.sponsor_irr;
      atBefore = o.sponsor_irr_aftertax_before_nol;
      atAfter = o.sponsor_irr_aftertax_after_nol;
    }

    // 1. Unlevered vs WACC — 가치 창출 여부
    if (uPre && wacc_v) {
      var spread = (uPre - wacc_v) * 100;
      var verdict = spread > 0 ? 'Value Creation' : 'Value Destruction';
      var col = spread > 0 ? 'var(--green)' : 'var(--red)';
      insights.push('Unlevered '+(uPre*100).toFixed(2)+'% '+(spread>0?'>':'<')+' WACC '+(wacc_v*100).toFixed(2)+'% → <strong style="color:'+col+'">'+verdict+' '+(spread>0?'+':'')+spread.toFixed(2)+'%p</strong>');
    }
    // 2. Levered vs Unlevered — 레버리지 효과
    if (lPre && uPre) {
      var lev = (lPre - uPre) * 100;
      var sign = lev >= 0 ? '+' : '';
      var levCol = lev >= 0 ? 'var(--green)' : 'var(--amber)';
      var levNote = lev < 0 ? ' <span style="opacity:.6">(debt burden > returns)</span>' : '';
      insights.push('Leverage Effect: <strong style="color:'+levCol+'">'+sign+lev.toFixed(2)+'%p</strong>'+levNote);
    }
    // 3. NOL 지연 손실 (Actual Model only)
    if (!isScenarioMode && atBefore && atAfter) {
      var nolLoss = (atBefore - atAfter) * 100;
      insights.push('NOL Deferral Loss: <strong style="color:var(--amber)">-'+nolLoss.toFixed(2)+'%p</strong>');
    }
    // 4. Scenario 모드 표시
    if (isScenarioMode) {
      insights.push('<span style="color:var(--t3);opacity:.7">🔮 Scenario mode · Immediate benefit (NOL not applicable)</span>');
    }

    if (insights.length) {
      insightTxt.innerHTML = insights.join(' &nbsp;·&nbsp; ');
      insightEl.style.display = 'block';
    } else {
      insightEl.style.display = 'none';
    }
  }

  // Capital structure
  el = document.getElementById('vo-capex'); if(el) el.textContent = fmt(o.capex_total);
  el = document.getElementById('vo-debt');  if(el) el.textContent = fmt(o.debt);
  el = document.getElementById('vo-te');    if(el) el.textContent = fmt(o.tax_equity);
  el = document.getElementById('vo-eq');    if(el) el.textContent = fmt(o.sponsor_equity);

  // Deal terms
  el = document.getElementById('vo-ppa');
  if(el) el.textContent = o.ppa_price ? '$'+o.ppa_price+'/MWh · '+o.ppa_term+'yr' : '—';
  el = document.getElementById('vo-toll');
  if(el) el.textContent = o.bess_toll&&o.bess_toll>0 ? '$'+o.bess_toll+'/kW-mo · '+o.bess_toll_term+'yr' : '—';
  el = document.getElementById('vo-specs');
  if(el) el.textContent = (a.pv_mwac||'—')+' MWac PV · '+(a.bess_mw||'—')+' MW '+(a.bess_duration||'');
  el = document.getElementById('vo-dates');
  if(el) el.textContent = 'COD '+(a.cod||'—')+' · NTP '+(a.ntp||'—');

  // Meta
  el = document.getElementById('vo-meta');
  if(el) el.textContent = (data.filename||'') + ' · ' + (data.scenario||'') + ' · ' + (data.uploaded_by||'');

  // ── Show results, hide empty state
  var rw = document.getElementById('val-results-wrap');
  var es = document.getElementById('val-empty-state');
  if (rw) rw.style.display = 'block';
  if (es) es.style.display = 'none';
  var dot = document.getElementById('val-status-dot');
  if (dot) dot.className = 'val-status-dot live';

  // Fill inputs
  function setV(id, v) { var e=document.getElementById(id); if(e&&v!=null&&v!==undefined) e.value=v; }
  // Revenue
  setV('vi-ppa-p', o.ppa_price || a.ppa_price);
  setV('vi-ppa-t', o.ppa_term  || a.ppa_term);
  setV('vi-ppa-esc', a.ppa_escalation ? a.ppa_escalation*100 : 0);
  setV('vi-toll-p', o.bess_toll_y1_effective || o.bess_toll || a.bess_toll);
  setV('vi-toll-t', o.bess_toll_term || a.bess_toll_term);
  setV('vi-toll-esc', a.bess_toll_escalation ? a.bess_toll_escalation*100 : (a.toll_esc || 0));
  // Project specs
  setV('vi-pv-mwac', a.pv_mwac);
  setV('vi-pv-mwdc', a.pv_mwdc || o.pv_mwdc || (a.pv_mwac ? a.pv_mwac*1.348 : null));
  setV('vi-dev-kwac', a.dev_fee_kwac || 200);
  // CAPEX 구성
  setV('vi-module', a.module_cwp || 31.5);
  setV('vi-bos', a.bos_cwp || 42.88);
  setV('vi-ess-equip', a.ess_per_kwh || 234.5);
  setV('vi-bess-bos', a.bess_bos_per_kwh || 130.0);
  setV('vi-epc-cont', a.epc_cont_pct || 8);
  setV('vi-owner', a.owner_pct || 3);
  setV('vi-intercon', a.intercon_m || 22.5);
  setV('vi-dev-cost', a.dev_cost_m || 20);
  setV('vi-capex-override', a.capex_total_override || '');
  setV('vi-te-ratio', a.te_ratio_override || '');
  // OPEX
  setV('vi-pv-om', a.pv_om_covered || a.pv_om);
  setV('vi-bess-om', a.bess_om || 8.6);
  setV('vi-assetmgmt', a.asset_mgmt_sm || 150);
  // Financing — derive debt ratio from outputs
  if (o.capex_total && o.debt) setV('vi-debt-r', Math.round(o.debt/o.capex_total*1000)/10);
  // Tax Equity
  setV('vi-flip-y', a.flip_yield ? (a.flip_yield>1 ? a.flip_yield : a.flip_yield*100) : 8.75);
  setV('vi-flip-t', a.flip_term || 7);
  setV('vi-te-fee', a.te_upfront_fee ? a.te_upfront_fee*100 : 2);
  setV('vi-life', a.life || o.life_yrs || 35);
  // ITC/PTC — 모드에 따라 다른 필드
  var creditMode = (o.credit_mode || a.credit_mode || 'ITC').toUpperCase();
  if (typeof window.vlSetCredit === 'function') window.vlSetCredit(creditMode);
  if (creditMode === 'ITC') {
    setV('vi-pv-itc', a.pv_itc_rate != null ? a.pv_itc_rate : (o.pv_itc_rate != null ? o.pv_itc_rate : 30));
    setV('vi-bess-itc', a.bess_itc_rate != null ? a.bess_itc_rate : (o.bess_itc_rate != null ? o.bess_itc_rate : 30));
    setV('vi-itc-elig', a.itc_eligibility ? a.itc_eligibility*100 : 97);
  } else {
    setV('vi-ptc-rate', a.ptc_rate_per_kwh || o.ptc_rate || 0.027);
    setV('vi-bess-itc-ptc', a.bess_itc_rate != null ? a.bess_itc_rate : 30);
    setV('vi-itc-elig-ptc', a.itc_eligibility ? a.itc_eligibility*100 : 97);
  }
  // 레거시 hidden
  setV('vi-credit-val', a.itc_rate ? a.itc_rate*100 : 30);
  setV('vi-dscr', a.dscr_p50 || 1.30);
  setV('vi-aug-y1', 4); setV('vi-aug-y2', 8); setV('vi-aug-y3', 12);

  // Version history
  apiCall('GET', '/valuation/'+safeId+'/versions').then(function(vers) {
    if (!vers) return;
    var keys = Object.keys(vers).sort().reverse();
    if (!keys.length) return;
    var lst = document.getElementById('vo-history-list');
    var emp = document.getElementById('val-empty-hist');
    if (emp) emp.style.display = 'none';
    if (lst) {
      lst.style.display = 'block';
      lst.innerHTML = keys.slice(0,10).map(function(k) {
        var v = vers[k];
        var irr = v.outputs && v.outputs.sponsor_irr ? (v.outputs.sponsor_irr*100).toFixed(2)+'%' : '—';
        var margin = v.outputs && v.outputs.dev_margin ? '$'+(v.outputs.dev_margin/1000).toFixed(1)+'M' : '—';
        var date = (v.uploaded_at||k).substring(0,16).replace('T',' ');
        var name = v.filename || k;
        var scenario = v.scenario && v.scenario!==name ? ' · '+v.scenario : '';
        var reason = v.reason || '';
        var approver = v.approver || '';
        var reasonHtml = reason
          ? '<div style="margin-top:5px;padding:4px 8px;background:rgba(255,255,255,.03);border-left:2px solid var(--border2);border-radius:0 4px 4px 0;font-size:10px;color:var(--t3);">📝 '+reason+(approver?' · ✅ '+approver:'')+'</div>'
          : (approver ? '<div style="font-size:10px;color:var(--green);margin-top:2px">✅ '+approver+'</div>' : '');
        var vEnc = encodeURIComponent(JSON.stringify(v));
        return '<div class="val-history-item" onclick="valLoadVersionEncoded(this)" data-ver="'+vEnc+'" data-sid="'+safeId+'" title="Click to load" style="flex-direction:column;align-items:stretch">' +
          '<div style="display:flex;justify-content:space-between;align-items:flex-start">' +
            '<div style="flex:1;min-width:0">' +
              '<div class="val-hi-name">'+name+scenario+'</div>' +
              '<div class="val-hi-meta">'+date+' · '+(v.uploaded_by||'')+'</div>' +
            '</div>' +
            '<div style="text-align:right;flex-shrink:0;margin-left:12px">' +
              '<div class="val-hi-irr">'+irr+'</div>' +
              '<div style="font-size:10px;color:var(--t3)">Dev '+margin+'</div>' +
            '</div>' +
          '</div>' +
          reasonHtml +
        '</div>';
      }).join('');
    }
  }).catch(function(){});

  // ── 데이터가 존재하면 Cash Flow / IC Opinion 탭 자동 활성화
  // (엑셀 업로드 or 저장된 버전 로드 시점)
  if (o && (o.sponsor_irr || o.sponsor_irr_levered_pretax || o.dev_margin)) {
    if (typeof valActivateCFTab === 'function') valActivateCFTab();
  }
}

function valLoadVersionEncoded(el) {
  var v = JSON.parse(decodeURIComponent(el.dataset.ver));
  var safeId = el.dataset.sid;
  valLoadVersion(v, safeId);
}

function valLoadVersion(v, safeId) {
  valDisplayData(v, safeId);
  // Switch to overview tab
  var btn = document.querySelector('.val-tab');
  if (btn) valSwitchTab('overview', btn);
  var msg = document.getElementById('val-calc-msg');
  if (msg) { msg.textContent = '✓ Version loaded: ' + (v.filename||''); msg.style.color='var(--green)'; }
}

// ── Hurdle Check UI Updated (계산 결과 + 임계값 기반)
function valUpdateHurdleCheck(r, inputs) {
  if (!r) return;

  // Hurdle 값 (Settings 입력 필드에서)
  var irrHurdle = parseFloat((document.getElementById('thr-sponsor-irr')||{}).value) || 9.0;   // %
  var marginHurdle = parseFloat((document.getElementById('thr-dev-margin')||{}).value) || 10.0; // c/Wp

  // 현재 값
  var sponsorIrrPct = r.sponsor_irr != null ? r.sponsor_irr * 100 : null;   // Full Life 기준
  var pvMwac = parseFloat(inputs.pv_mwac) || 199;
  var pvMwdc = pvMwac * 1.33;  // 표준 DC/AC ratio (가변)
  var devMarginCwp = r.dev_margin ? (r.dev_margin / (pvMwdc * 1000) * 100) : null;  // $M → c/Wp

  // IRR 4단계 평가 (9/10/11%)
  function irrTier(v) {
    if (v == null) return { emoji: '—', txt: 'Needs calc', col: 'var(--t3)', bg: 'var(--surface2)' };
    if (v >= 11.0) return { emoji: '✅', txt: 'EXCELLENT', col: '#10B981', bg: 'rgba(16,185,129,.15)' };
    if (v >= 10.0) return { emoji: '🟢', txt: 'STRONG', col: '#10B981', bg: 'rgba(16,185,129,.10)' };
    if (v >= irrHurdle) return { emoji: '🟡', txt: 'MARGINAL', col: 'var(--amber)', bg: 'rgba(245,158,11,.12)' };
    return { emoji: '🔴', txt: 'BELOW THRESHOLD', col: 'var(--red)', bg: 'rgba(239,68,68,.12)' };
  }
  function marginTier(v) {
    if (v == null) return { emoji: '—', txt: 'Needs calc', col: 'var(--t3)', bg: 'var(--surface2)' };
    if (v >= marginHurdle * 1.2) return { emoji: '✅', txt: 'EXCELLENT', col: '#10B981', bg: 'rgba(16,185,129,.15)' };
    if (v >= marginHurdle) return { emoji: '🟢', txt: 'PASS', col: '#10B981', bg: 'rgba(16,185,129,.10)' };
    if (v >= marginHurdle * 0.9) return { emoji: '🟡', txt: 'MARGINAL', col: 'var(--amber)', bg: 'rgba(245,158,11,.12)' };
    return { emoji: '🔴', txt: 'BELOW THRESHOLD', col: 'var(--red)', bg: 'rgba(239,68,68,.12)' };
  }

  var irrT = irrTier(sponsorIrrPct);
  var marT = marginTier(devMarginCwp);

  // Primary (IRR) 카드
  var irrCard = document.getElementById('vo-hurdle-irr');
  var irrCur = document.getElementById('vo-hurdle-irr-current');
  var irrTgt = document.getElementById('vo-hurdle-irr-target');
  var irrSt  = document.getElementById('vo-hurdle-irr-status');
  if (irrCur) irrCur.textContent = sponsorIrrPct != null ? sponsorIrrPct.toFixed(2) + '%' : '—';
  if (irrTgt) irrTgt.textContent = '≥ ' + irrHurdle.toFixed(1) + '%';
  if (irrSt)  { irrSt.textContent = irrT.emoji + ' ' + irrT.txt; irrSt.style.color = irrT.col; irrSt.style.background = irrT.bg; }
  if (irrCard) irrCard.style.borderLeftColor = irrT.col;

  // Secondary (Margin) 카드
  var marCard = document.getElementById('vo-hurdle-margin');
  var marCur = document.getElementById('vo-hurdle-margin-current');
  var marTgt = document.getElementById('vo-hurdle-margin-target');
  var marSt  = document.getElementById('vo-hurdle-margin-status');
  if (marCur) marCur.textContent = devMarginCwp != null ? devMarginCwp.toFixed(2) + ' c/Wp' : '—';
  if (marTgt) marTgt.textContent = '≥ ' + marginHurdle.toFixed(1);
  if (marSt)  { marSt.textContent = marT.emoji + ' ' + marT.txt; marSt.style.color = marT.col; marSt.style.background = marT.bg; }
  if (marCard) marCard.style.borderLeftColor = marT.col;

  // Overall Verdict
  var vCard = document.getElementById('vo-hurdle-verdict');
  var vIcon = document.getElementById('vo-hurdle-verdict-icon');
  var vText = document.getElementById('vo-hurdle-verdict-text');
  if (sponsorIrrPct != null && devMarginCwp != null) {
    var bothPass = sponsorIrrPct >= irrHurdle && devMarginCwp >= marginHurdle;
    var bothExcel = sponsorIrrPct >= 11 && devMarginCwp >= marginHurdle * 1.2;
    var col, emoji, txt;
    if (bothExcel) { col = '#10B981'; emoji = '🏆'; txt = 'EXCELLENT — STRONG BUY'; }
    else if (bothPass) { col = '#10B981'; emoji = '✅'; txt = 'PASS — IC APPROVED'; }
    else if (sponsorIrrPct >= irrHurdle || devMarginCwp >= marginHurdle) { col = 'var(--amber)'; emoji = '⚠️'; txt = 'PARTIAL — CONDITIONAL'; }
    else { col = 'var(--red)'; emoji = '❌'; txt = 'FAIL — NEEDS REWORK'; }
    if (vIcon) vIcon.textContent = emoji;
    if (vText) { vText.textContent = txt; vText.style.color = col; }
    if (vCard) vCard.style.borderLeftColor = col;
  }

  // NPV 섹션 Updated (있을 때만)
  valUpdateNPV(r, inputs);
}

// ── NPV UI Updated
function valUpdateNPV(r, inputs) {
  if (!r) return;
  var section = document.getElementById('vo-npv-section');
  if (!section) return;

  var hurdlePct = parseFloat((document.getElementById('thr-sponsor-irr')||{}).value) || 9.0;

  var spNpv = r.sponsor_npv;  // $K
  var prNpv = r.project_npv;  // $K
  var wacc = r.wacc;  // 0.072

  var spEl = document.getElementById('vo-sponsor-npv');
  var prEl = document.getElementById('vo-project-npv');
  var hrEl = document.getElementById('vo-npv-hurdle-rate');
  var wcEl = document.getElementById('vo-npv-wacc-rate');

  function fmtNpv(v) {
    if (v == null) return '—';
    var m = v / 1000;  // $K → $M
    var sign = m >= 0 ? '' : '-';
    var abs = Math.abs(m);
    var col = v >= 0 ? 'var(--green)' : 'var(--red)';
    return { text: sign + '$' + abs.toFixed(1) + 'M', color: col };
  }

  var spF = fmtNpv(spNpv);
  var prF = fmtNpv(prNpv);
  if (spEl) {
    if (typeof spF === 'object') { spEl.textContent = spF.text; spEl.style.color = spF.color; }
    else spEl.textContent = spF;
  }
  if (prEl) {
    if (typeof prF === 'object') { prEl.textContent = prF.text; prEl.style.color = prF.color; }
    else prEl.textContent = prF;
  }
  if (hrEl) hrEl.textContent = hurdlePct.toFixed(1) + '%';
  if (wcEl) wcEl.textContent = wacc != null ? (wacc * 100).toFixed(2) + '%' : '—';

  // 값 있으면 섹션 표시
  if (spNpv != null || prNpv != null) section.style.display = 'block';
}

function valActivateCFTab() {
  function activateTab(tabId, label) {
    var tab = document.getElementById(tabId);
    if (!tab) return;
    tab.classList.remove('val-tab-locked');
    tab.style.opacity = ''; tab.style.cursor = '';
    tab.style.pointerEvents = ''; tab.title = '';
    // 초록 점 / 녹색 글자 효과 제거 — 단순히 활성화만 함
  }
  activateTab('val-tab-cf', 'Cash Flow');
  activateTab('val-tab-ic', 'IC Opinion');
}

// ── 버전 저장 모달
async function valShowSaveModal() {
  var modal = document.getElementById('val-save-modal');
  if (!modal) return;

  // 자동 버전명 생성 (현재 날짜 + 요청자)
  var now = new Date();
  var pad = function(n){return n<10?'0'+n:n;};
  var versionName = now.getFullYear() + '-' + pad(now.getMonth()+1) + '-' + pad(now.getDate())
                  + ' ' + pad(now.getHours()) + ':' + pad(now.getMinutes())
                  + ' @ ' + ((window.HWR_AUTH||{}).email||'—').split('@')[0];
  var vsmSc = document.getElementById('vsm-scenario');
  if (vsmSc) vsmSc.value = versionName;

  // 공유 대상 드롭다운 — 전체 사용자 목록 (admin 엔드포인트 재활용, 본인 제외)
  var approverSel = document.getElementById('vsm-approver');
  if (approverSel) {
    approverSel.innerHTML = '<option value="">— Loading... —</option>';
    var myEmail = (window.HWR_AUTH||{}).email || '';
    try {
      var admins = await apiCall('GET', '/auth/admins');
      if (admins && admins.admins && admins.admins.length) {
        var others = admins.admins.filter(function(a){return a !== myEmail;});
        approverSel.innerHTML = '<option value="">— No share target —</option>' +
          others.map(function(a){
            return '<option value="'+a+'">'+a+'</option>';
          }).join('');
      } else {
        approverSel.innerHTML = '<option value="">— No share target —</option>';
      }
    } catch(e) {
      approverSel.innerHTML = '<option value="">— No share target —</option>';
    }
  }

  // 입력 필드 리셋
  var reasonEl = document.getElementById('vsm-reason');
  if (reasonEl) reasonEl.value = '';

  modal.style.display = 'flex';
}

function valCloseSaveModal() {
  var modal = document.getElementById('val-save-modal');
  if (modal) modal.style.display = 'none';
}

async function valSaveVersion() {
  var reason = (document.getElementById('vsm-reason')||{}).value||'';
  var approver = (document.getElementById('vsm-approver')||{}).value||'';  // 이제는 "공유 대상" (선택)
  var scenario = (document.getElementById('vsm-scenario')||{}).value||'';
  if (!reason.trim()) { alert('Enter change summary.'); return; }
  // approver는 선택 필드 — 검증 제거

  var calc = window._lastCalcResult;
  if (!calc) { alert('Please run Calculate first.'); return; }

  var safeId = calc.projectId.replace(/[/.]/g,'_');
  var payload = {
    filename: scenario || 'Calculated',
    scenario: scenario,
    reason: reason,
    shared_with: approver,  // 재해석된 필드명
    approver: approver,     // 레거시 호환 (백엔드에서 둘 다 처리)
    assumptions: calc.inputs,
    outputs: calc.outputs
  };

  try {
    var btn = document.querySelector('#val-save-modal button:last-child');
    if (btn) { btn.textContent = 'Saving...'; btn.disabled = true; }

    await apiCall('POST', '/valuation/'+safeId+'/save', payload);

    valCloseSaveModal();
    var saveBtn = document.getElementById('val-save-version-btn');
    if (saveBtn) { saveBtn.textContent = '✓ Saved'; saveBtn.style.borderColor='var(--green)'; saveBtn.style.color='var(--green)'; saveBtn.style.background='rgba(16,185,129,.08)'; saveBtn.style.pointerEvents='none'; }

    // History 탭 갱신
    var histEl = document.getElementById('vo-history-list');
    if (histEl && histEl.style.display !== 'none') {
      valLoadHistory(safeId);
    }

    // 입력창 초기화
    ['vsm-reason','vsm-approver','vsm-scenario'].forEach(function(id){
      var el = document.getElementById(id); if(el) el.value='';
    });
  } catch(e) {
    alert('Save failed: '+e.message);
    var btn2 = document.querySelector('#val-save-modal button:last-child');
    if (btn2) { btn2.textContent='💾 Save'; btn2.disabled=false; }
  }
}

// ── History 로드 (재설계: 승인 flow 제거, 깔끔한 타임라인)
function valLoadHistory(safeId) {
  apiCall('GET', '/valuation/'+safeId+'/versions').then(function(vers) {
    if (!vers) return;
    var keys = Object.keys(vers).sort().reverse();
    if (!keys.length) return;
    var lst = document.getElementById('vo-history-list');
    var emp = document.getElementById('val-empty-hist');
    if (emp) emp.style.display = 'none';
    if (!lst) return;
    lst.style.display = 'block';

    // 현재 사용자 이메일 (공유받은 것 하이라이트용)
    var myEmail = (window.HWR_AUTH||{}).email || '';

    lst.innerHTML = keys.slice(0,100).map(function(k) {
      var v = vers[k];
      var irr = v.outputs && v.outputs.sponsor_irr ? (v.outputs.sponsor_irr*100).toFixed(2)+'%' : '—';
      var margin = v.outputs && v.outputs.dev_margin ? '$'+(v.outputs.dev_margin/1000).toFixed(1)+'M' : '—';
      var name = v.filename || k;
      var scenario = v.scenario && v.scenario!==name ? ' · '+v.scenario : '';
      var reason = v.reason || '';

      // 저장 정보
      var savedAt = (v.uploaded_at||k).substring(0,16).replace('T',' ');
      var savedBy = v.requested_by || v.uploaded_by || '—';
      var savedByShort = savedBy.split('@')[0];
      // 공유 대상
      var sharedWith = v.shared_with || v.approver || '';  // 재해석 + 레거시 호환
      var sharedWithShort = sharedWith ? sharedWith.split('@')[0] : '';
      // 레거시 rejected 상태 (옛날 데이터만)
      var legacyRejected = v.status === 'rejected';
      // 공유받은 사람인지 (나에게 검토 요청이 온 버전)
      var isSharedToMe = sharedWith && sharedWith === myEmail && savedBy !== myEmail;

      // 카드 왼쪽 border: 공유받은 버전은 blue, rejected 레거시는 red, 나머지는 default
      var borderLeftStyle = '';
      if (isSharedToMe) borderLeftStyle = ';border-left:3px solid var(--blue-h);background:rgba(37,99,235,.03)';
      else if (legacyRejected) borderLeftStyle = ';border-left:3px solid var(--red);opacity:.7';

      var vEnc = encodeURIComponent(JSON.stringify(v));
      var html = '<div class="val-history-item" data-ts="'+k+'" style="flex-direction:column;align-items:stretch'+borderLeftStyle+'" onclick="valLoadVersionEncoded(this)" data-ver="'+vEnc+'" data-sid="'+safeId+'">';

      // 1행: 파일명 + IRR/Margin
      html += '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">';
      // 왼쪽: 파일명/시나리오
      html += '<div style="flex:1;min-width:0">';
      html += '<div class="val-hi-name" style="font-size:12.5px;font-weight:700;color:var(--t1)">'+name+'<span style="color:var(--t3);font-weight:400">'+scenario+'</span></div>';
      // 메타 정보 한 줄
      html += '<div style="display:flex;align-items:center;gap:8px;margin-top:4px;font-size:10px;color:var(--t3);font-variant-numeric:tabular-nums">';
      html += '<span>📅 '+savedAt+'</span>';
      html += '<span style="color:var(--t3)">·</span>';
      html += '<span style="color:var(--t2)">👤 '+savedByShort+'</span>';
      if (sharedWith) {
        html += '<span style="color:var(--t3)">·</span>';
        html += '<span style="color:'+(isSharedToMe?'var(--blue-h)':'var(--t3)')+';'+(isSharedToMe?'font-weight:700':'')+'">🔗 '+sharedWithShort+(isSharedToMe?' (shared with me)':'')+'</span>';
      }
      if (legacyRejected) {
        html += '<span style="color:var(--red);font-weight:600">· Discarded</span>';
      }
      html += '</div>';
      html += '</div>';

      // 오른쪽: IRR / Margin
      html += '<div style="text-align:right;flex-shrink:0">';
      html += '<div class="val-hi-irr" style="font-size:15px;font-weight:800;color:var(--green);font-variant-numeric:tabular-nums">'+irr+'</div>';
      html += '<div style="font-size:10px;color:var(--t3);margin-top:1px;font-variant-numeric:tabular-nums">Dev '+margin+'</div>';
      html += '</div>';
      html += '</div>';

      // 변경 근거
      if (reason) {
        html += '<div style="margin-top:8px;padding:6px 10px;background:rgba(255,255,255,.03);border-left:2px solid var(--border2);border-radius:0 4px 4px 0;font-size:10.5px;color:var(--t2);line-height:1.5">💬 '+reason+'</div>';
      }

      html += '</div>';
      return html;
    }).join('');
  }).catch(function(){});
}

function valFilterByISO(iso) {
  window._bmIsoFilter = iso;
  valLoadBenchmark();  // 재렌더
}

// ── 스파크라인 툴팁 (fixed positioning, mouse-follow) ────────
function valShowSparkTip(event, el) {
  var tip = document.getElementById('spark-tooltip');
  if (!tip) {
    tip = document.createElement('div');
    tip.id = 'spark-tooltip';
    document.body.appendChild(tip);
  }
  var label = el.getAttribute('data-label') || '';
  var value = el.getAttribute('data-value') || '';
  tip.innerHTML = '<span class="tip-label">'+label+'</span><span class="tip-value">'+value+'</span>';
  tip.style.display = 'block';
  // 마우스 좌표 근처에 표시 (오프셋으로 커서 가림 방지)
  var x = event.clientX + 10;
  var y = event.clientY - 30;
  // 화면 오른쪽 경계 방지
  if (x + 120 > window.innerWidth) x = event.clientX - 130;
  tip.style.left = x + 'px';
  tip.style.top = y + 'px';
}

function valHideSparkTip() {
  var tip = document.getElementById('spark-tooltip');
  if (tip) tip.style.display = 'none';
}

function valInitScenarios(baseInputs) {
  if (!baseInputs) return;
  window._valBaseInputs = baseInputs; // 재계산용 보관
  var capexM = baseInputs.capex_total_override || (baseInputs.capex_total ? baseInputs.capex_total/1000 : null);
  var pcts = _valGetSensPcts();

  function setScenario(prefix, mults) {
    var card = document.getElementById('val-sc-'+prefix);
    if (!card) return;
    var inps = card.querySelectorAll('.val-sc-inp');
    var rawFlip = baseInputs.flip_yield || 8.75;
    if (rawFlip > 50) rawFlip = rawFlip / 100;
    var defaults = {
      ppa_price: (baseInputs.ppa_price || 68.82) * (mults.ppa||1),
      bess_toll: (baseInputs.bess_toll || 14.50), // 항상 Base값 (공통 고정)
      capex_total_override: capexM ? capexM * (mults.capex||1) : '',
      debt_ratio: (baseInputs.debt_ratio || 47.6),
      flip_yield: rawFlip
    };
    inps.forEach(function(inp) {
      var field = inp.dataset.field;
      var val = defaults[field];
      inp.value = val ? parseFloat(val).toFixed(field==='ppa_price'||field==='bess_toll'?2:1) : '';
    });
  }

  setScenario('base',   {ppa:1.00,             capex:1.00});
  setScenario('upside', {ppa:1 + pcts.ppa_up,  capex:1 - pcts.capex_up});
  setScenario('stress', {ppa:1 - pcts.ppa_dn,  capex:1 + pcts.capex_dn});

  var btn = document.getElementById('val-run-scenarios-btn');
  if (btn) { btn.style.opacity='1'; btn.style.pointerEvents='auto'; }
}

// ── 민감도 프리셋 적용 (Mild/Moderate/Severe)
function valApplySensPreset(kind) {
  var presets = {
    mild:     { ppa: 2, capex_up: 2, capex_dn: 3 },
    moderate: { ppa: 3, capex_up: 4, capex_dn: 5 },
    severe:   { ppa: 5, capex_up: 6, capex_dn: 8 },
  };
  var p = presets[kind] || presets.moderate;
  var set = function(id, v) { var el = document.getElementById(id); if (el) el.value = v; };
  set('sens-ppa-up',   p.ppa);
  set('sens-ppa-dn',   p.ppa);
  set('sens-capex-up', p.capex_up);
  set('sens-capex-dn', p.capex_dn);

  // 버튼 스타일 Updated
  ['mild','moderate','severe'].forEach(function(k) {
    var btns = document.querySelectorAll('[onclick*="valApplySensPreset(\''+k+'\')"]');
    btns.forEach(function(btn) {
      if (k === kind) {
        btn.style.background = 'var(--blue-d)';
        btn.style.color = '#fff';
        btn.style.borderColor = 'transparent';
        btn.style.border = 'none';
        btn.style.fontWeight = '700';
      } else {
        btn.style.background = 'var(--surface3)';
        btn.style.color = 'var(--t2)';
        btn.style.border = '1px solid var(--border2)';
        btn.style.fontWeight = '600';
      }
    });
  });

  // 시나리오 값도 재적용
  valRecalcScenariosFromSens();
}

// ── 시나리오 값 재계산 (민감도 %만 변경 시)
function valRecalcScenariosFromSens() {
  if (!window._valBaseInputs) return;
  valInitScenarios(window._valBaseInputs);
}

// ITC/PTC toggle (valuation 페이지용 - window.vlSetCredit의 alias 역할)
function valSetCredit(type) {
  if (typeof window.vlSetCredit === 'function') {
    window.vlSetCredit(type);
  }
}

// ── 1. IRR 게이지 차트
function valDrawIRRGauge(canvasId, value, label, min, max, good, ok) {
  var canvas = document.getElementById(canvasId);
  if (!canvas) return;
  var W = canvas.offsetWidth || 120, H = 80;
  canvas.width = W; canvas.height = H;
  var ctx = canvas.getContext('2d');
  var cx = W/2, cy = H - 12, r = Math.min(W,H*2)*0.38;
  var startA = Math.PI, endA = 2*Math.PI;

  // Background arc
  ctx.beginPath();
  ctx.arc(cx, cy, r, startA, endA);
  ctx.strokeStyle = 'rgba(128,128,128,0.15)';
  ctx.lineWidth = 8; ctx.lineCap = 'round';
  ctx.stroke();

  // Value arc
  var pct = Math.min(1, Math.max(0, (value - min) / (max - min)));
  var valA = startA + pct * Math.PI;
  var color = value >= good ? '#1D9E75' : value >= ok ? '#BA7517' : '#E24B4A';
  ctx.beginPath();
  ctx.arc(cx, cy, r, startA, valA);
  ctx.strokeStyle = color;
  ctx.lineWidth = 8; ctx.lineCap = 'round';
  ctx.stroke();

  // Value text
  ctx.fillStyle = color;
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(value ? (value*100).toFixed(2)+'%' : '—', cx, cy - 4);

  // Label
  ctx.fillStyle = 'rgba(128,128,128,0.7)';
  ctx.font = '9px sans-serif';
  ctx.fillText(label, cx, cy + 10);
}

// 인풋 변경 시 Calculate 버튼에 'dirty' 표시만. 실제 계산은 버튼 클릭으로만 실행.
function valAttachDebounce() {
  document.querySelectorAll('.vi').forEach(function(el) {
    el.addEventListener('input', function() {
      var btn=document.getElementById('val-calc-btn');
      if(btn) btn.classList.add('dirty');
    });
  });
}

function valToggleSec(hd) {
  var body = hd.nextElementSibling;
  var chev = hd.querySelector('.val-sec-toggle');
  var open = body.style.display !== 'none';
  body.style.display = open ? 'none' : 'block';
  if(chev) { chev.classList.toggle('open', !open); }
}

function valSwitchTab(name, btn) {
  document.querySelectorAll('.val-tab').forEach(function(t){ t.classList.remove('active'); });
  document.querySelectorAll('.val-tab-panel').forEach(function(p){ p.classList.remove('active'); });
  if(btn) btn.classList.add('active');
  var panel = document.getElementById('val-panel-'+name);
  if(panel) panel.classList.add('active');
  // IC Opinion 탭 진입 시 이미 분석 결과 있으면 표시 유지
  if(name === 'ic' && window._cfAnalysis && !document.getElementById('cf-ai-result').innerHTML.includes('Calculate')) {
    // 결과 이미 있음 — 유지
  }
}

// window 전역 노출 (HTML onclick용)
window.valSetCredit = valSetCredit;
window.valSwitchTab = valSwitchTab;
window.valToggleSec = valToggleSec;
window.valShowSaveModal = valShowSaveModal;
window.valCloseSaveModal = valCloseSaveModal;
window.valSaveVersion = valSaveVersion;
window.valApplySensPreset = valApplySensPreset;
window.valRecalcScenariosFromSens = valRecalcScenariosFromSens;
