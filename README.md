# HWR_Dashboard

**Hanwha Energy USA Holdings — Dashboard 프론트엔드**

순수 HTML/CSS/JS 기반 SPA. GitHub Pages 호스팅. 백엔드: [HWR-api](https://github.com/shinjo99/HWR-api) (Railway).

접속: https://shinjo99.github.io/HWR_Dashboard/

---

## 프로젝트 배경

- **구축 기간**: 약 1주 (2026년 3~4월, Claude 4.6 Opus 활용)
- **구축 환경**: Git CLI 미사용. GitHub 웹 인터페이스 드래그&드롭으로 배포
- **사용 범위**: Hanwha Renewables USA 내부
- **기술 선택 이유**: React/Vue 프레임워크 없이 순수 JS — 빠른 프로토타이핑, 외부 빌드 도구 불필요

---

## 주요 기능 (화면 단위)

| 탭/화면 | 설명 |
|---|---|
| **Dashboard (홈)** | PPV 총액, 프로젝트 스테이지별 집계, 알림 |
| **Projects** | Solar + BESS 프로젝트 목록 및 상세 |
| **Valuation** | PF Model 업로드 → IRR/NPV 계산. Calibration/Prediction 모드. 5개 탭: Overview, Sensitivity, Cash Flow, History, Benchmark, IC Opinion |
| **Benchmark** | FRED 시장 지표, LevelTen Solar PPA, Peer IRR, BESS Tolling AI 리서치 |
| **Divest** | 매각 현황 관리 |
| **Atlas** | 프로젝트별 Milestone 추적 |
| **Financial** | P&L, B/S, C/F (연도별) |
| **Admin** | 사용자 관리, LevelTen 업로드, 권한 기반 기능 |

---

## 아키텍처

Phase 3 리팩터링 완료. 원본 `index.html` 13,869줄 → 7,743줄 (-44.2%). 외부 JS 8개 모듈로 분리.

```
index.html               메인 페이지 (7,743줄) — UI 레이아웃 + 인라인 핸들러
├── main.css             글로벌 스타일
├── valuation.css        Valuation 화면 전용 스타일

JS 모듈 (index.html에서 <script src> 로 로드, 순서 중요):
├── i18n.js              다국어 (ko/en) 리소스 + translate() 함수
├── core.js              API_URL, JWT 관리, 공통 fetch 래퍼, 알림
├── projects.js          프로젝트 CRUD + Dashboard 홈 렌더
├── calculate.js         Valuation Calculate 로직 (엔진 호출, 결과 렌더)
├── benchmark.js         Benchmark 탭 (FRED, LevelTen, BESS 리서치)
├── export.js            IC Summary PDF 다운로드 트리거
└── contentscript.js     (Chrome extension injection 대응, 무시해도 무방)

외부 CDN:
├── pretendardvariable.min.css  Pretendard 폰트 (한글)
├── d3.min.js                   차트 (Sensitivity, Sankey)
├── chart.umd.min.js            Chart.js (Market Indicators)
├── xlsx.full.min.js            XLSX 파싱 (PF Model 업로드)
└── topojson-client.min.js      US 지도 (states-10m.json)
```

### 주요 상태 관리

`window.API_URL` (core.js line 20) — 유일한 백엔드 URL 소스:
```js
window.API_URL = 'https://hwr-api-production.up.railway.app';
```

`window.AUTH` — JWT 토큰 + 사용자 역할 (viewer/admin) 보관.

---

## 로컬 실행

**빌드 불필요.** 로컬 정적 서버만 있으면 됨:

```bash
# Python 3
python3 -m http.server 8000

# Node.js
npx http-server -p 8000
```

그 후 `http://localhost:8000` 접속. CORS 설정은 백엔드(`HWR-api`)에서 `allow_origins=["*"]` 이라 로컬 개발 OK.

**주의**: 로컬에서 백엔드 변경하려면 `core.js`의 `window.API_URL`을 `http://localhost:8080` 으로 수정.

---

## 배포

GitHub Pages 자동 배포. `main` 브랜치에 push하면 1-2분 후 `shinjo99.github.io/HWR_Dashboard/` 에 반영.

1. GitHub `HWR_Dashboard` repo → **Add file → Upload files**
2. 수정한 파일 드래그 → Commit
3. GitHub Pages 자동 빌드 (Actions 탭에서 확인 가능)
4. **하드 리프레시 필수** (Ctrl+Shift+R) — 브라우저 캐시 때문에

---

## 인증 흐름

1. 사용자 로그인 → `POST /auth/login` → JWT 반환 (24시간 유효)
2. JWT는 localStorage에 저장 (`hwr_token`)
3. 이후 모든 API 요청에 `Authorization: Bearer {jwt}` 헤더 자동 추가
4. 역할 (viewer/admin) 에 따라 UI 버튼 show/hide
5. 401/403 응답 시 자동 로그아웃 + 로그인 화면 리다이렉트

---

## 디자인 가이드

- **폰트**: Pretendard Variable (한글 최적화)
- **컬러**:
  - Primary: `#6366f1` (보라) — Calibration 모드
  - Success: `#10b981` (녹색) — Prediction 모드, 긍정 지표
  - Warning: `#f59e0b` (주황) — 경고, Aug 연도
  - Danger: `#ef4444` (빨강) — 음수, 수렴 실패
- **다크 테마**: 기본값. 토글 없음
- **반응형**: Desktop 우선. 모바일 미지원

---

## Phase 진행도

| Phase | 내용 | 상태 |
|---|---|---|
| Phase 1 | Dead code 제거 | ✅ 완료 |
| Phase 2 | (skip) | — |
| **Phase 3** | index.html 분리 (13,869 → 7,743줄, -44.2%, 8개 JS 모듈) | ✅ 완료 |
| Phase 3E | API URL 중앙화 (하드코딩 9개 URL → `window.API_URL` 1개) | ✅ 완료 |
| Phase 4 | 백엔드 리팩터링 (main.py 4,632 → 100줄) — 프론트 변경 없음 | ✅ 완료 (백엔드 측) |
| Phase 5 | 문서화 | 🟡 진행 중 (이 README) |
| Phase 6 | CI/CD | ⏳ 예정 |

---

## 알려진 이슈 / 다음 과제

### 🔴 High Priority
- **Prediction 모드 결과 화면에서 Sponsor IRR 음수 표시** — 백엔드 엔진 로직 이슈 (UI는 정상 렌더)
- **Cash Flow 탭의 "Aug" 마커 UI 로직** — Y4, Y8에 Augmentation 비용 반영 표시되지만 color 로직 명확화 필요

### 🟡 Medium Priority
- **BESS Tolling AI 리서치 로딩 표시 개선** — 현재 "🔎 Generating..." 만 뜸. 30-60초 소요 안내 추가
- **IC Opinion 탭 영문 템플릿** — 현재 한국어 하드코딩 ("투자 의견", "핵심 논거")
- **CF 분석 AI 버튼 추가** — 백엔드 `/valuation/analyze-cf` 엔드포인트 존재하나 프론트 UI 없음

### 🟢 Low Priority
- **모바일 반응형 지원**
- **다크/라이트 테마 토글**
- **i18n 완성도 개선** — 일부 영문 문자열 아직 하드코딩

---

## 기술 스택

- **순수 HTML/CSS/JS** (ES6+) — 빌드 도구 없음
- **D3.js v7** — Sensitivity 차트, Sankey 다이어그램
- **Chart.js v4** — Market Indicators 차트
- **XLSX.js** — 클라이언트 사이드 PF Model 파일 미리보기
- **TopoJSON** — US 주별 지도 (Projects 화면)
- **Pretendard Variable** — 한글 폰트

---

## 트러블슈팅

### 로그인 "서버 연결 오류" 뜸
1. F12 Console 탭 → `API_URL` 에러 확인 (예: `ReferenceError: Cannot access 'API_URL' before initialization`)
2. `core.js` 의 `window.API_URL` 선언 순서 확인 — 반드시 **다른 스크립트보다 먼저** 로드돼야
3. Railway 백엔드 상태 확인: `curl https://hwr-api-production.up.railway.app/health`

### 계산 결과가 이상함 (Prediction 모드)
- 이건 프론트 이슈 아니라 **백엔드 엔진 로직 이슈**. `HWR-api` repo README의 "알려진 이슈" 섹션 참조
- Calibration 모드 결과는 정상이어야 함 (Neptune 기준 Sponsor IRR 10.14%)

### 하드 리프레시 해도 변경사항 안 보임
- GitHub Pages 배포 지연 (최대 5분)
- 브라우저 캐시: Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac)
- CDN 캐시: private/incognito 창에서 확인

---

## 라이선스

Proprietary. Hanwha Renewables USA 내부 사용.

---

## 작업 재개용 컨텍스트 (Claude 새 세션)

**이 repo에서 작업 재개 시, Claude에게 다음을 알려주세요:**

1. 구조: `index.html` 메인 + 8개 외부 JS 모듈 (i18n, core, projects, calculate, benchmark, export 등)
2. 배포: GitHub 웹 드래그 → GitHub Pages 자동. 하드 리프레시 필수
3. 백엔드 URL: `window.API_URL` 하나로 중앙화 (core.js line 20)
4. 주의사항:
   - **절대 `API_URL` 을 파일 직접 수정으로 바꾸지 말 것** — 순환 참조 에러 기록 있음
   - JS 모듈 로드 순서 중요 (`i18n → core → projects → calculate → benchmark → export`)
   - index.html 내 인라인 이벤트 핸들러 많음 (onclick, onchange) — 외부 JS 함수 이름 변경 시 같이 수정
5. 참고 문서: 이 README 전체 + 백엔드 `HWR-api` README
