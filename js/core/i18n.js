/* ============================================================
   js/core/i18n.js
   ============================================================
   LANG dictionary — Korean/English translations for all UI text
   Extracted from index.html (Phase 3 Step 2 refactoring)
   Generated: Apr 19, 2026
   ============================================================ */
const LANG = {
  ko: {
    total: '총', pv: 'PV', ess: 'ESS',
    projList: '프로젝트 목록',
    divest: "'26 매각 대상",
    sh: 'Safe Harbor',
    other: '기타 파이프라인',
    searchPlaceholder: '프로젝트 검색 (이름, 주, ISO...)',
    selectPrompt: '프로젝트를 선택하세요',
    overview: '개요', financial: '재무', budget: '예산', docs: '문서', schedule: '일정',
    divestBtn: '💰 매각현황', atlasBtn: '🏔 Atlas North M1', ppaBtn: '⚡ PPA',
    backBtn: '← HEUH Dashboard',
    // 지도 범례
    legendPortfolio: '포트폴리오', legendType: '유형',
    // Atlas
    atlasTitle: '🏔 Atlas North M1 Milestone',
    atlasSub: 'Lydian 1st Milestone Payment 조건 달성 현황',
    atlasTotal: '전체 항목', atlasDone: '완료', atlasPending: '미착수', atlasRate: '전체 달성률',
    atlasColItem: '항목', atlasColTarget: 'TARGET 일정', atlasColDday: 'D-DAY', atlasColStatus: '상태',
    // PPA
    ppaTitle: '⚡ PPA 진척 현황',
    ppaSub: '프로젝트별 PPA 단계 관리',
    ppaAll: '전체', ppaRfp: 'RFP 참여', ppaSl: 'SL/BL', ppaContract: '계약 완료',
    ppaColProj: '프로젝트', ppaColIso: 'ISO', ppaColState: '주', ppaColStage: '현재 단계', ppaColNote: '현황',
    // 매각현황
    divestTitle: '💰 매각현황 (2026년)',
    divestSub: '8개 프로젝트 · 예상 총 매각이익 $142M',
    divestColName: '프로젝트', divestColType: '매각처', divestColIso: 'ISO · 주',
    divestColStage: '현재 단계', divestColProg: '진척도', divestColProb: '확도',
    divestColMargin: '예상이익', divestColNote: '현황',
    divestStageNote: '단계 가중치: 준비 0% → NDA/티저 20% → NBO 40% → BO 60% → SPA협상 80% → 클로징 100%',
    divestStages: {'준비':'준비','NDA/티저':'NDA/티저','NBO':'NBO','BO':'BO','SPA협상':'SPA협상','클로징':'클로징'},
    divestTypes: {'LCC':'LCC','운영업체':'운영업체'},
    liquidityBtn: '💧 운영자산 유동화',
    liquidityTitle: '💧 운영 자산 유동화',
    liquiditySub: 'Legacy 자산 정상화 방안 및 Exit 전략',
    // AI 패널
    aiSearchBtn: '🤖 AI 검색',
    filterAll: '전체',
    statTotal: '총',
    aiSub: '포트폴리오 분석 · 문서 분석 · 자연어 검색',
    aiReport: '📊 포트폴리오 리포트', aiRisk: '⚠️ 리스크 분석',
    aiCod: '📅 COD 현황', aiFinance: '💰 재무 요약',
    aiPlaceholder: '예: PJM 지역 대용량 ESS 프로젝트 현황은?',
    aiWelcome: '안녕하세요! US 프로젝트 파이프라인 AI 어시스트입니다.<br><br><strong>할 수 있는 것:</strong><br>• 포트폴리오 현황 분석 및 경영진 리포트 생성<br>• 업로드한 계약서·품의서 핵심 조항 분석<br>• 재무 벤치마크 (시장 기준 CAPEX·IRR 참고값)<br>• 자연어로 프로젝트 검색 (상단 🤖 버튼)<br><br>위 버튼으로 빠르게 시작하거나 질문을 입력하세요.',
    financeTitle: '📊 재무 현황', financeSub: 'P&L · B/S · C/F',
    issuesTitle: '🔥 핵심 이슈', issuesSub: '매각현황 · PPA · Atlas North M1',
    issuesBtn: '🔥 핵심 이슈', reportBtn: '📋 보고', financeBtn: '📊 재무',
    
    // ═══ VALUATION page (English-only; Korean retained only inside IC Opinion via _cfLang) ═══
    valCalcMode: 'Calculation Mode',
    valModePredict: '📈 Prediction', valModeCalib: '🎯 Calibration',
    valModePredictDesc: '<strong>Prediction:</strong> Quick feasibility check for projects without a full model. Uses industry-standard PF assumptions (99/5 flip + level debt + MACRS allocation); FMV = sum of CAPEX inputs (includes Dev/EPC Margin).',
    valModeCalibDesc: '<strong>Calibration:</strong> For replicating uploaded Excel models. Sculpted debt + NOL offset + custom Partnership Flip. ±0.15%p accuracy vs original model.',
    valModeInfoTitle: '⚙️ Calculation Mode Comparison',
    valModeInfoUsage: 'Usage', valModeInfoDebt: 'Debt Structure', valModeInfoFlip: 'Partnership Flip',
    valModeInfoTax: 'Tax', valModeInfoCapex: 'CAPEX', valModeInfoAccuracy: 'Accuracy',
    valModeCalibUsage: 'Excel model replication/verification',
    valModePredictUsage: 'New project prediction',
    valModeInfoHelp: '💡 Which one should I use?',
    valModeInfoHelpCalib: '• To <strong>upload Excel</strong> and verify <strong>same numbers</strong> → <strong style="color:#c4b5fd">Calibration</strong>',
    valModeInfoHelpPredict: '• For <strong>new project</strong> with parameters only, to <strong>predict IRR</strong> → <strong style="color:#6ee7b7">Prediction</strong>',
    valModeInfoNote: '※ After Excel upload, run Integrity Check to get an automatic mode recommendation.',

    // Integrity Check
    valICTitle: 'Model Audit',
    valICDesc: 'Excel model integrity check (formula errors, Capital Stack, IRR, Debt, Revenue).',
    valICFilePick: 'Select .xlsb / .xlsx file',
    valICRunBtn: '🔍 Run Integrity Check',
    valICBtnLabel: 'Model Audit',
    valICChecking: '⏳ Checking...',
    valICReportTitle: '📋 Integrity Report',
    // Sidebar sections
    valSecProject: 'Project', valSecRevenue: 'Revenue', valSecCapex: 'CAPEX',
    valSecOpex: 'OPEX', valSecBess: 'BESS Augmentation', valSecDebt: 'Debt/Tax',
    valSecCredit: 'Credit (ITC/PTC)', valSecAdvanced: 'Advanced',

    // Header/tabs
    valTabOverview: 'Overview', valTabSensitivity: 'Sensitivity',
    valTabCashFlow: 'Cash Flow', valTabHistory: 'History',
    valTabBenchmark: 'Benchmark', valTabIC: 'IC Opinion',
    valExportIC: '✨ Export IC Opinion',
    valUploadParse: 'Upload & Parse', valSaved: 'Saved!',
    valLive: 'Live · Calculated',
    valNoData: 'No data — upload model',
    // Empty state
    valEmptyTitle: 'Upload a model or run Calculate',
    valEmptySub: 'PF models (.xlsb) are parsed automatically. Or fill in the left inputs and click Calculate for a quick estimate.',

    // Result cards
    // IRR Decomposition
  },
  en: {
    total: 'Total', pv: 'PV', ess: 'ESS',
    projList: 'Project List',
    divest: "'26 Divestment",
    sh: 'Safe Harbor',
    other: 'Other Pipeline',
    searchPlaceholder: 'Search projects (name, state, ISO...)',
    selectPrompt: 'Select a project',
    overview: 'Overview', financial: 'Financial', budget: 'Budget', docs: 'Documents', schedule: 'Schedule',
    divestBtn: '💰 Divestment', atlasBtn: '🏔 Atlas North M1', ppaBtn: '⚡ PPA',
    backBtn: '← HEUH Dashboard',
    // Map legend
    legendPortfolio: 'Portfolio', legendType: 'Type',
    // Atlas
    atlasTitle: '🏔 Atlas North M1 Milestone',
    atlasSub: 'Lydian 1st Milestone Payment Conditions',
    atlasTotal: 'Total Items', atlasDone: 'Done', atlasPending: 'Pending', atlasRate: 'Achievement Rate',
    atlasColItem: 'Item', atlasColTarget: 'Target Date', atlasColDday: 'D-DAY', atlasColStatus: 'Status',
    // PPA
    ppaTitle: '⚡ PPA Progress',
    ppaSub: 'PPA Stage Management by Project',
    ppaAll: 'Total', ppaRfp: 'RFP', ppaSl: 'SL/BL', ppaContract: 'Contracted',
    ppaColProj: 'Project', ppaColIso: 'ISO', ppaColState: 'State', ppaColStage: 'Stage', ppaColNote: '현황',
    // Divestment
    divestTitle: '💰 Divestment Status (2026)',
    divestSub: '8 Projects · Est. Total Margin $142M',
    divestColName: 'Project', divestColType: 'Buyer', divestColIso: 'ISO · State',
    divestColStage: 'Stage', divestColProg: 'Progress', divestColProb: 'Prob.',
    divestColMargin: 'Est. Margin', divestColNote: '현황',
    divestStageNote: 'Stage Weight: Prep 0% → NDA/Teaser 20% → NBO 40% → BO 60% → SPA 80% → Closing 100%',
    divestStages: {'준비':'Prep','NDA/티저':'NDA/Teaser','NBO':'NBO','BO':'BO','SPA협상':'SPA','클로징':'Closing'},
    divestTypes: {'LCC':'LCC','운영업체':'Operator'},
    liquidityBtn: '💧 Asset Liquidity',
    liquidityTitle: '💧 Operating Asset Liquidity',
    liquiditySub: 'Legacy Asset Normalization & Exit Strategy',
    // AI Panel
    aiSearchBtn: '🤖 AI Search',
    filterAll: 'All',
    statTotal: 'Total',
    aiSub: 'Portfolio Analysis · Document Review · NL Search',
    aiReport: '📊 Portfolio Report', aiRisk: '⚠️ Risk Analysis',
    aiCod: '📅 COD Status', aiFinance: '💰 Finance Summary',
    aiPlaceholder: 'e.g. Large-scale ESS projects in PJM region?',
    aiWelcome: 'Hello! I am the US Project Pipeline AI Assistant.<br><br><strong>What I can do:</strong><br>• Portfolio analysis & executive report generation<br>• Key clause analysis from uploaded contracts/approvals<br>• Financial benchmarks (market CAPEX·IRR reference)<br>• Natural language project search (🤖 button above)<br><br>Use the buttons above or type your question to get started.',
    financeTitle: '📊 Financial Overview', financeSub: 'P&L · B/S · C/F',
    issuesTitle: '🔥 Key Issues', issuesSub: 'Divestment · PPA · Atlas North M1',
    issuesBtn: '🔥 Key Issues', reportBtn: '📋 Reports', financeBtn: '📊 Finance',
    
    // ═══ VALUATION page ═══
    valCalcMode: 'Calculation Mode',
    valModePredict: '📈 Prediction', valModeCalib: '🎯 Calibration',
    valModePredictDesc: '<strong>Prediction:</strong> Quick feasibility check for projects without a full model. Uses industry-standard PF assumptions (99/5 flip + level debt + MACRS allocation); FMV = sum of CAPEX inputs (includes Dev/EPC Margin).',
    valModeCalibDesc: '<strong>Calibration:</strong> For replicating uploaded Excel models. Sculpted debt + NOL offset + custom Partnership Flip. ±0.15%p accuracy vs original model.',
    valModeInfoTitle: '⚙️ Calculation Mode Comparison',
    valModeInfoUsage: 'Usage', valModeInfoDebt: 'Debt Structure', valModeInfoFlip: 'Partnership Flip',
    valModeInfoTax: 'Tax', valModeInfoCapex: 'CAPEX', valModeInfoAccuracy: 'Accuracy',
    valModeCalibUsage: 'Excel model replication/verification',
    valModePredictUsage: 'New project prediction',
    valModeInfoHelp: '💡 Which one should I use?',
    valModeInfoHelpCalib: '• To <strong>upload Excel</strong> and verify <strong>same numbers</strong> → <strong style="color:#c4b5fd">Calibration</strong>',
    valModeInfoHelpPredict: '• For <strong>new project</strong> with parameters only, to <strong>predict IRR</strong> → <strong style="color:#6ee7b7">Prediction</strong>',
    valModeInfoNote: '※ After Excel upload, run Integrity Check to get an automatic mode recommendation.',
    
    // Integrity Check
    valICTitle: 'Model Audit',
    valICDesc: 'Excel model integrity check (formula errors, Capital Stack, IRR, Debt, Revenue).',
    valICFilePick: 'Select .xlsb / .xlsx file',
    valICRunBtn: '🔍 Run Integrity Check',
    valICBtnLabel: 'Model Audit',
    valICChecking: '⏳ Checking...',
    valICReportTitle: '📋 Integrity Report',
    // Sidebar sections
    valSecProject: 'Project', valSecRevenue: 'Revenue', valSecCapex: 'CAPEX',
    valSecOpex: 'OPEX', valSecBess: 'BESS Augmentation', valSecDebt: 'Debt/Tax',
    valSecCredit: 'Credit (ITC/PTC)', valSecAdvanced: 'Advanced',
    
    // Header/tabs
    valTabOverview: 'Overview', valTabSensitivity: 'Sensitivity',
    valTabCashFlow: 'Cash Flow', valTabHistory: 'History',
    valTabBenchmark: 'Benchmark', valTabIC: 'IC Opinion',
    valExportIC: '✨ Export IC Opinion',
    valUploadParse: 'Upload & Parse', valSaved: 'Saved!',
    valLive: 'Live · Calculated',
    valNoData: 'No data — upload model',
    // Empty state
    valEmptyTitle: 'Upload a model or run Calculate',
    valEmptySub: 'PF models (.xlsb) are parsed automatically. Or fill in the left inputs and click Calculate for a quick estimate.',
    
    // Result cards
  }
};