/* ============================================================
   js/pages/valuation/export.js
   ============================================================
   Valuation page — PDF Export (IC Opinion 보고서 내보내기)
   
   Functions:
     - valExportPDF: WeasyPrint 기반 IC Opinion PDF 생성
                     (main.py /valuation/export-pdf 엔드포인트 호출)
   
   Extracted from index.html (Phase 3 Step 3-D refactoring)
   Generated: Apr 19, 2026
   ============================================================ */

// ── IC Summary PDF Export
async function valExportPDF() {
  var btn = document.getElementById('val-export-btn');
  if (btn) { btn.textContent = '⏳ Generating PDF...'; btn.disabled = true; btn.style.opacity = '.6'; }

  try {
    var projSel = document.getElementById('val-proj-select');
    var projName = projSel ? (projSel.options[projSel.selectedIndex]||{}).text||'—' : '—';
    var today = new Date().toISOString().slice(0,10);
    var prepBy = (window._authUser||{}).email || 'HEUH Team';

    // 현재 프로젝트의 전체 valuation 데이터
    var valData = window._lastValData || {};
    var outputs = valData.outputs || {};
    var assumptions = valData.assumptions || {};

    // Threshold 설정값
    var thresholds = {
      sponsor_irr_pct: parseFloat((document.getElementById('thr-sponsor-irr')||{}).value) || 9.0,
      dev_margin_cwp: parseFloat((document.getElementById('thr-dev-margin')||{}).value) || 10.0,
    };

    // IC Opinion AI 분석 결과 (있으면 포함)
    var icAnalysis = {};
    var lang = window._cfLang || 'en';  // Default English (IC Opinion toggle overrides)
    var cached = lang === 'en' ? window._cfAnalysisEn : window._cfAnalysisKr;
    if (cached) {
      icAnalysis = {
        verdict: cached.verdict,
        verdict_color: cached.verdict_color,
        thesis: cached.thesis,
        rec: cached.rec,
        risks: cached.risks || [],
        compliance_count: cached.compliance_count || 0,
        threshold_status: cached.threshold_status || {},
        dev_ic: cached.dev_ic || {},
        sensitivity_kr: cached.sensitivity_kr,
        sensitivity_en: cached.sensitivity_en,
      };
    }

    // 시나리오 결과 수집
    var scenarios = [];
    ['base','upside','stress'].forEach(function(sc) {
      var el = document.getElementById('val-sc-result-'+sc);
      if (el && el.style.display !== 'none') {
        var rows = el.querySelectorAll('.val-sc-kpi-row');
        scenarios.push({
          name: sc.toUpperCase(),
          irr: rows[0] ? rows[0].querySelector('.val-sc-kpi-val').textContent : '—',
          margin: rows[1] ? rows[1].querySelector('.val-sc-kpi-val').textContent : '—'
        });
      }
    });

    // State/ISO는 PROJECTS 배열에서 추출
    var projId = projSel ? projSel.value : '';
    var projMeta = (typeof PROJECTS !== 'undefined') ? PROJECTS.find(function(p){ return p.id === projId; }) : null;
    var state = projMeta ? projMeta.state : '';
    var iso   = projMeta ? projMeta.iso : '';
    var cleanProjName = projMeta ? projMeta.name : projName.split(' (')[0];

    var payload = {
      project_name: cleanProjName,
      date: today,
      prepared_by: prepBy,
      state: state,
      iso: iso,
      outputs: outputs,
      assumptions: assumptions,
      thresholds: thresholds,
      scenarios: scenarios,
      ic_analysis: icAnalysis,
      verdict: icAnalysis.verdict || '',
      verdict_color: icAnalysis.verdict_color || 'amber',
    };

    // 서버에 PDF 요청 (바이너리 응답)
    var token = (window.HWR_AUTH && window.HWR_AUTH.token) || localStorage.getItem('hwr_token') || '';
    var apiBase = (typeof API_URL !== 'undefined' ? API_URL : (window.API_URL || ''));
    var res = await fetch(apiBase + '/valuation/export-pdf', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      var errText = '';
      try { var j = await res.json(); errText = j.detail || ''; } catch(e) {}
      throw new Error(errText || ('HTTP '+res.status));
    }

    // PDF 다운로드
    var blob = await res.blob();
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'IC_Summary_'+cleanProjName.replace(/\s+/g,'_')+'_'+today.replace(/-/g,'')+'.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function(){ URL.revokeObjectURL(url); }, 3000);

    if (btn) {
      btn.textContent = '✓ Downloaded';
      setTimeout(function() {
        btn.textContent = '✨ Export IC Opinion';
        btn.disabled = false;
        btn.style.opacity = '1';
      }, 2500);
    }
  } catch(e) {
    alert('IC Summary PDF generation failed: ' + e.message);
    if (btn) { btn.textContent = '✨ Export IC Opinion'; btn.disabled = false; btn.style.opacity = '1'; }
  }
}

// window 전역 노출 (HTML onclick용)
window.valExportPDF = valExportPDF;
