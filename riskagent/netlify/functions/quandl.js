// netlify/functions/quandl.js
// 목적: 브라우저 → (동일출처) → 함수 → Nasdaq/FRED API 프록시
// 특징:
//  - 환경변수 QUANDL_KEY 사용(클라이언트 미노출)
//  - data.nasdaq.com → www.quandl.com 순차 폴백
//  - User-Agent 지정, HTML 응답 방어, 에러 메시지 정규화
//  - 필요한 최소 필드만 전달(dataset_data.*)

const DOMAINS = [
  "https://data.nasdaq.com",
  "https://www.quandl.com",
];

// FRED 데이터셋의 경우 다른 엔드포인트 사용
const FRED_DATASETS = ['FRED/SP500', 'FRED/NASDAQCOM', 'FRED/DGS10', 'FRED/FEDFUNDS', 'FRED/GDP', 'FRED/UNRATE', 'FRED/CPIAUCSL'];

export const handler = async (event) => {
  console.log("QUANDL Function 호출됨:", event.queryStringParameters);
  
  try {
    const params = new URLSearchParams(event.rawQuery || event.queryStringParameters || {});
    const dataset = params.get("dataset");
    const start   = params.get("start");
    const end     = params.get("end");

    console.log("파라미터:", { dataset, start, end });

    if (!dataset) {
      return jsonBad(400, "dataset 파라미터가 필요합니다.");
    }
    const apiKey = process.env.QUANDL_KEY;
    if (!apiKey) {
      console.error("QUANDL_KEY 환경변수가 설정되지 않음");
      return jsonBad(500, "서버 환경변수 QUANDL_KEY가 설정되지 않았습니다.");
    }
    
    console.log("API 키 존재 확인됨");

    const qs = new URLSearchParams({
      api_key: apiKey,
      ...(start ? { start_date: start } : {}),
      ...(end   ? { end_date: end }   : {}),
    }).toString();

    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/123 Safari/537.36",
      "Accept": "application/json",
    };

    let lastErr;
    for (const dom of DOMAINS) {
      // FRED 데이터셋의 경우 다른 URL 구조 사용
      let url;
      if (FRED_DATASETS.includes(dataset)) {
        url = `${dom}/api/v3/datasets/${encodeURIComponent(dataset)}/data.json?${qs}`;
      } else {
        url = `${dom}/api/v3/datasets/${encodeURIComponent(dataset)}.json?${qs}`;
      }
      
      console.log(`도메인 시도: ${dom}`);
      console.log(`요청 URL: ${url}`);
      
      try {
        const r = await fetch(url, { 
          headers,
          timeout: 10000  // 10초 타임아웃
        });
        console.log(`응답 상태: ${r.status} ${r.statusText}`);
        const text = await r.text();
        console.log(`응답 길이: ${text.length} 문자`);

        // HTML 방어: JSON 파싱 실패 = 봇차단/리다이렉트
        let js;
        try { 
          js = JSON.parse(text); 
          console.log(`JSON 파싱 성공`);
        } catch (parseErr) {
          console.error(`JSON 파싱 실패:`, parseErr.message);
          console.log(`응답 내용 (처음 200자):`, text.slice(0, 200));
          
          if (r.status === 403 || text.startsWith("<")) {
            lastErr = new Error(`WAF/봇차단 의심(HTML 응답). 도메인: ${dom}`);
            console.error(`도메인 ${dom}에서 봇차단 의심`);
            continue;
          }
          lastErr = new Error(`JSON 파싱 실패(도메인: ${dom}): ${text.slice(0,120)}...`);
          continue;
        }

        if (!r.ok) {
          const msg = js?.quandl_error?.message || js?.error || `HTTP ${r.status}`;
          console.error(`API 오류: ${msg}`);
          lastErr = new Error(msg);
          continue;
        }

        const ds = js.dataset || js.dataset_data || {};
        console.log(`데이터셋 정보:`, Object.keys(ds));
        
        // 클라이언트는 dataset_data 포맷을 기대하므로 정규화
        const dataset_data = {
          column_names: ds.column_names || js?.dataset_data?.column_names || ["Date", "Value"],
          data: ds.data || js?.dataset_data?.data || [],
          start_date: ds.start_date || start || null,
          end_date: ds.end_date || end || null,
          name: ds.name || dataset,
        };

        console.log(`성공! 데이터 포인트: ${dataset_data.data.length}개`);
        return jsonOk({ dataset_data, source: dom });
      } catch (e) {
        console.error(`도메인 ${dom}에서 오류:`, e.message);
        lastErr = e;
      }
    }
    // 모든 도메인 실패
    return jsonBad(502, `모든 도메인 호출 실패: ${lastErr?.message || lastErr}`);

  } catch (e) {
    return jsonBad(500, `서버 오류: ${e.message}`);
  }
};

function jsonOk(body) {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify(body),
  };
}
function jsonBad(status, message) {
  return {
    statusCode: status,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ error: message }),
  };
}

function json(status, obj) {
  return {
    statusCode: status,
    headers: { 
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
    },
    body: JSON.stringify(obj),
  };
}
