# ailert.html 연결 파일 보고서

**생성일**: 2025년 1월 27일  
**대상 파일**: `ailert.html`  
**총 라인 수**: 14,938줄

---

## 📋 목차

1. [로컬 라이브러리 파일](#1-로컬-라이브러리-파일)
2. [외부 CDN 라이브러리](#2-외부-cdn-라이브러리)
3. [로컬 스크립트 파일](#3-로컬-스크립트-파일)
4. [데이터 파일 참조](#4-데이터-파일-참조)
5. [외부 HTML 파일 참조](#5-외부-html-파일-참조)
6. [API 엔드포인트](#6-api-엔드포인트)
7. [요약 및 권고사항](#7-요약-및-권고사항)

---

## 1. 로컬 라이브러리 파일

### 1.1 libs 폴더 내 파일들

`ailert.html`에서 참조하는 로컬 라이브러리 파일들:

| 파일명 | 경로 | 용도 | 로딩 방식 |
|--------|------|------|----------|
| `chart.min.js` | `libs/chart.min.js` | 차트 시각화 라이브러리 | `<script src="libs/chart.min.js" defer></script>` |
| `d3.v7.min.js` | `libs/d3.v7.min.js` | D3.js 데이터 시각화 라이브러리 | `<script src="libs/d3.v7.min.js" defer></script>` |
| `xlsx.full.min.js` | `libs/xlsx.full.min.js` | Excel 파일 읽기/쓰기 라이브러리 | `<script src="libs/xlsx.full.min.js" defer></script>` |

**참고**: `libs` 폴더에는 다음 파일들도 존재하지만 `ailert.html`에서는 직접 참조하지 않음:
- `firebase-app.js`
- `firebase-auth.js`
- `firebase-firestore.js`

---

## 2. 외부 CDN 라이브러리

### 2.1 PDF.js

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js" defer></script>
```

- **용도**: 브라우저 내 PDF 텍스트 추출
- **버전**: 3.11.174
- **CDN**: cdnjs.cloudflare.com
- **사용 위치**: PDF 모달 및 PDF 파일 처리 기능

### 2.2 PPTXGenJS

```html
<script src="https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js" defer></script>
```

- **용도**: PowerPoint 파일 생성
- **버전**: 3.12.0
- **CDN**: cdn.jsdelivr.net
- **형식**: UMD 빌드

---

## 3. 로컬 스크립트 파일

### 3.1 fixed_functions.js

```html
<script src="fixed_functions.js"></script>
```

- **경로**: `fixed_functions.js` (루트 디렉토리)
- **용도**: 전역 함수 정의 및 파이프라인 실행 로직
- **주요 기능**:
  - `createProgressOverlay()`: 진행 상태 오버레이 생성
  - `checkAndPromptForApiKey()`: OpenAI 프록시 연결 확인
  - `executePipelineSteps()`: 파이프라인 단계별 실행 (GPT0~GPT4)
  - `validatePipelineRequirements()`: 파이프라인 요구사항 검증
  - `generateAndShowReport()`: 최종 보고서 생성 및 표시
- **라인 수**: 869줄

---

## 4. 데이터 파일 참조

### 4.1 go_scen 폴더 구조

`ailert.html`에서 참조하는 데이터 파일들 (실제 파일 존재 여부 확인 필요):

#### 4.1.1 지표 데이터
- `go_scen/data/indicator.xlsx`
  - **용도**: 지표-시나리오 매핑 데이터
  - **참조 위치**: 다수 (라인 4007, 4173, 4708, 5026, 5318 등)
  - **중요도**: ⭐⭐⭐⭐⭐ (핵심 데이터 파일)

#### 4.1.2 시장 데이터
- `go_scen/data/market_data/market_data.xlsx`
  - **용도**: 시장 데이터 로드
  - **참조 위치**: 라인 4051
- `go_scen/data/market_data/scenario_summary.xlsx`
  - **용도**: 시나리오 요약 데이터
  - **참조 위치**: 라인 4291

#### 4.1.3 뉴스 데이터
- `go_scen/data/news/bigkinds/daily_news/keyword_news.xlsx`
  - **용도**: 키워드별 뉴스 메타데이터 (phase/title/press/url)
  - **참조 위치**: 라인 4407, 4741
- `go_scen/data/news/keyword.xlsx`
  - **용도**: 키워드 기본 풀 데이터
  - **참조 위치**: 라인 4711

#### 4.1.4 설정 파일
- `go_scen/data/set/{indicatorId}.xlsx`
  - **용도**: 지표별 설정 데이터
  - **참조 위치**: 라인 6697, 7073
  - **동적 경로**: `indicatorId` 값에 따라 파일명 변경

#### 4.1.5 시나리오 PDF
- `go_scen/scen/{folderName}/scenario_{folderName}.pdf`
  - **용도**: 시나리오 PDF 문서
  - **참조 위치**: 라인 6764, 12201
  - **동적 경로**: `folderName` 값에 따라 경로 변경

### 4.2 데이터 파일 로딩 패턴

```javascript
// 예시: indicator.xlsx 로드
const url = 'go_scen/data/indicator.xlsx';
const resp = await fetch(url);
if (!resp.ok) throw new Error('Failed to load indicator.xlsx');
```

**주의사항**: 
- 모든 데이터 파일은 상대 경로로 참조됨
- 파일이 없을 경우 에러 처리 로직 포함
- 일부 파일은 타임스탬프 쿼리 파라미터 사용 (`?t=${Date.now()}`)

---

## 5. 외부 HTML 파일 참조

### 5.1 RISK_MONITOR.html

```javascript
window.open('RISK_MONITOR.html', '_blank');
```

- **경로**: `RISK_MONITOR.html` (루트 디렉토리)
- **용도**: 특정 지표 범위(IND500~IND532) 클릭 시 새 창에서 열림
- **참조 위치**: 라인 5322
- **조건**: 지표 ID가 IND500~IND532 범위일 때만 실행

---

## 6. API 엔드포인트

### 6.1 Netlify Functions

#### 6.1.1 OpenAI 프록시
- **엔드포인트**: `/.netlify/functions/openai-proxy`
- **메서드**: POST
- **용도**: OpenAI API 프록시 (클라이언트 API 키 사용 안 함)
- **참조 위치**: `fixed_functions.js` 라인 25
- **요청 형식**:
  ```json
  {
    "model": "gpt-4o-mini",
    "messages": [{ "role": "user", "content": "..." }],
    "max_tokens": 5
  }
  ```

#### 6.1.2 기타 Netlify Functions
코드 내에서 여러 Netlify Functions를 참조하지만, 구체적인 엔드포인트명은 동적으로 구성됨.

---

## 7. 요약 및 권고사항

### 7.1 파일 의존성 요약

| 카테고리 | 파일 수 | 상태 |
|---------|---------|------|
| 로컬 라이브러리 | 3개 | ✅ 확인됨 |
| 외부 CDN | 2개 | ✅ 확인됨 |
| 로컬 스크립트 | 1개 | ✅ 확인됨 |
| 데이터 파일 | 6+ 개 | ⚠️ 확인 필요 |
| 외부 HTML | 1개 | ⚠️ 확인 필요 |

### 7.2 주요 발견사항

1. **데이터 파일 경로**: `go_scen` 폴더 구조가 코드에서 참조되지만 실제 파일 존재 여부 확인 필요
2. **동적 파일 경로**: 일부 파일은 런타임에 동적으로 경로가 생성됨 (`{indicatorId}`, `{folderName}`)
3. **에러 처리**: 데이터 파일 로드 실패 시 적절한 에러 메시지 표시
4. **타임스탬프 캐싱**: 일부 파일 로드 시 캐시 방지를 위한 타임스탬프 쿼리 파라미터 사용

### 7.3 권고사항

#### ✅ 즉시 확인 필요
1. **go_scen 폴더 존재 여부 확인**
   - `go_scen/data/indicator.xlsx` 파일 존재 확인
   - `go_scen/data/market_data/` 폴더 구조 확인
   - `go_scen/data/news/` 폴더 구조 확인

2. **RISK_MONITOR.html 파일 존재 확인**
   - 루트 디렉토리에 `RISK_MONITOR.html` 파일이 있는지 확인

3. **libs 폴더 파일 확인**
   - `libs/chart.min.js` 존재 확인
   - `libs/d3.v7.min.js` 존재 확인
   - `libs/xlsx.full.min.js` 존재 확인

#### 🔧 개선 제안
1. **파일 경로 상수화**: 하드코딩된 경로를 상수로 관리하여 유지보수성 향상
2. **에러 핸들링 강화**: 파일 로드 실패 시 사용자에게 더 명확한 안내 메시지 제공
3. **의존성 문서화**: `package.json` 또는 별도 문서에 외부 라이브러리 버전 명시

#### 📝 문서화 제안
1. **데이터 파일 구조 문서화**: 각 Excel 파일의 컬럼 구조 및 용도 명시
2. **API 엔드포인트 문서화**: Netlify Functions의 요청/응답 형식 문서화
3. **환경 변수 문서화**: 필요한 환경 변수 목록 및 설정 방법 안내

---

## 8. 파일 참조 상세 목록

### 8.1 직접 참조 파일 (HTML 태그)

```html
<!-- 라인 10-12 -->
<script src="libs/chart.min.js" defer></script>
<script src="libs/d3.v7.min.js" defer></script>
<script src="libs/xlsx.full.min.js" defer></script>

<!-- 라인 14 -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js" defer></script>

<!-- 라인 16 -->
<script src="https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js" defer></script>

<!-- 라인 13674 -->
<script src="fixed_functions.js"></script>
```

### 8.2 JavaScript 내 동적 참조

#### 데이터 파일
- `go_scen/data/indicator.xlsx` (라인 4007, 4173, 4708)
- `go_scen/data/market_data/market_data.xlsx` (라인 4051)
- `go_scen/data/market_data/scenario_summary.xlsx` (라인 4291)
- `go_scen/data/news/bigkinds/daily_news/keyword_news.xlsx` (라인 4407, 4741)
- `go_scen/data/news/keyword.xlsx` (라인 4711)
- `go_scen/data/set/{indicatorId}.xlsx` (라인 6697, 7073)
- `go_scen/scen/{folderName}/scenario_{folderName}.pdf` (라인 6764, 12201)

#### HTML 파일
- `RISK_MONITOR.html` (라인 5322)

---

## 9. 체크리스트

배포 전 확인 사항:

- [ ] `libs/chart.min.js` 파일 존재 확인
- [ ] `libs/d3.v7.min.js` 파일 존재 확인
- [ ] `libs/xlsx.full.min.js` 파일 존재 확인
- [ ] `fixed_functions.js` 파일 존재 확인
- [ ] `RISK_MONITOR.html` 파일 존재 확인
- [ ] `go_scen/data/indicator.xlsx` 파일 존재 확인
- [ ] `go_scen/data/market_data/` 폴더 구조 확인
- [ ] `go_scen/data/news/` 폴더 구조 확인
- [ ] Netlify Functions 배포 상태 확인
- [ ] 환경 변수 `OPENAI_API_KEY` 설정 확인
- [ ] CDN 라이브러리 접근 가능 여부 확인

---

**보고서 작성 완료**
















