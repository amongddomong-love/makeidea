// netlify/functions/quandl_csv.js
// 목적: 외부 API 전면 차단 시에도 서비스 지속을 위한 CSV 폴백
// 특징:
//  - quandl.js와 동일한 호출 방식
//  - 성공 시 CSV 형태로 데이터 반환
//  - 정적 호스팅에 사용할 경우 빌드/스케줄 함수 필요

const DOMAINS = [
  "https://data.nasdaq.com",
  "https://www.quandl.com",
];

export const handler = async (event) => {
  try {
    const params = new URLSearchParams(event.rawQuery || event.queryStringParameters || {});
    const dataset = params.get("dataset");
    const start   = params.get("start");
    const end     = params.get("end");

    if (!dataset) {
      return csvBad(400, "dataset 파라미터가 필요합니다.");
    }
    const apiKey = process.env.QUANDL_KEY;
    if (!apiKey) {
      return csvBad(500, "서버 환경변수 QUANDL_KEY가 설정되지 않았습니다.");
    }

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
      const url = `${dom}/api/v3/datasets/${encodeURIComponent(dataset)}.json?${qs}`;
      try {
        const r = await fetch(url, { headers });
        const text = await r.text();

        // HTML 방어: JSON 파싱 실패 = 봇차단/리다이렉트
        let js;
        try { js = JSON.parse(text); } catch (_) {
          if (r.status === 403 || text.startsWith("<")) {
            lastErr = new Error(`WAF/봇차단 의심(HTML 응답). 도메인: ${dom}`);
            continue;
          }
          lastErr = new Error(`JSON 파싱 실패(도메인: ${dom}): ${text.slice(0,120)}...`);
          continue;
        }

        if (!r.ok) {
          const msg = js?.quandl_error?.message || js?.error || `HTTP ${r.status}`;
          lastErr = new Error(msg);
          continue;
        }

        const ds = js.dataset || js.dataset_data || {};
        const data = ds.data || js?.dataset_data?.data || [];
        const columnNames = ds.column_names || js?.dataset_data?.column_names || ["Date", "Value"];

        // CSV 형태로 변환
        const csvContent = convertToCSV(data, columnNames);
        
        return csvOk(csvContent, dataset, dom);

      } catch (e) {
        lastErr = e;
      }
    }
    // 모든 도메인 실패
    return csvBad(502, `모든 도메인 호출 실패: ${lastErr?.message || lastErr}`);

  } catch (e) {
    return csvBad(500, `서버 오류: ${e.message}`);
  }
};

function convertToCSV(data, columnNames) {
  // CSV 헤더
  const header = columnNames.join(',');
  
  // CSV 데이터 행들
  const rows = data.map(row => 
    row.map(cell => 
      typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell
    ).join(',')
  );
  
  return [header, ...rows].join('\n');
}

function csvOk(content, dataset, source) {
  return {
    statusCode: 200,
    headers: { 
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="fred_${dataset.replace('/', '_')}.csv"`,
      "Cache-Control": "no-store" 
    },
    body: content,
  };
}

function csvBad(status, message) {
  return {
    statusCode: status,
    headers: { "Content-Type": "text/plain" },
    body: `Error: ${message}`,
  };
}
