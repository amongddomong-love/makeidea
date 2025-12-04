// netlify/functions/yahoo-finance.js
// Yahoo Finance API 프록시 함수
// 무료 API이므로 API 키가 필요하지 않습니다

export const handler = async (event) => {
  // CORS preflight 요청 처리
  if (event.httpMethod === 'OPTIONS') {
    return json(200, { message: 'CORS preflight' });
  }

  try {
    const url = new URL(event.rawUrl);
    const symbol = url.searchParams.get("symbol");   // 예: "^GSPC", "AAPL", "BTC-USD"
    const start = url.searchParams.get("start");     // "YYYY-MM-DD"
    const end = url.searchParams.get("end");

    if (!symbol || !start || !end) {
      return json(400, { error: "Missing required params: symbol, start, end" });
    }

    // Yahoo Finance API는 무료이므로 API 키가 필요하지 않습니다
    // 날짜를 Unix timestamp로 변환
    const startTimestamp = Math.floor(new Date(start).getTime() / 1000);
    const endTimestamp = Math.floor(new Date(end).getTime() / 1000);

    // Yahoo Finance API 엔드포인트
    const target = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${startTimestamp}&period2=${endTimestamp}&interval=1d&includePrePost=true&events=div%2Csplit`;
    
    console.log(`Yahoo Finance API 요청: ${symbol} (${start} ~ ${end})`);

    const resp = await fetch(target, { 
      headers: { 
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; Netlify-Function/1.0)"
      } 
    });
    const text = await resp.text();

    console.log(`Yahoo Finance API 응답 상태: ${resp.status}`);

    // JSON 파싱
    let payload;
    try { 
      payload = JSON.parse(text); 
    } catch {
      console.error("Yahoo Finance API가 JSON이 아닌 응답을 반환했습니다:", text.slice(0, 500));
      
      return json(resp.status || 502, { 
        error: "Yahoo Finance API가 예상하지 못한 형식의 응답을 반환했습니다.", 
        status: resp.status,
        bodySnippet: text.slice(0, 200) 
      });
    }

    if (!resp.ok) {
      console.error("Yahoo Finance API 오류:", payload);
      
      return json(resp.status, { 
        error: "Yahoo Finance API 오류", 
        details: payload,
        status: resp.status
      });
    }

    // chart.result 형태 확인
    if (!payload?.chart?.result || !payload.chart.result[0]) {
      console.error("Yahoo Finance API 응답 형식 오류:", Object.keys(payload || {}));
      return json(502, { 
        error: "Yahoo Finance API 응답 형식이 올바르지 않습니다.", 
        gotKeys: Object.keys(payload || {}),
        hint: "심볼이 올바른지 확인해주세요."
      });
    }

    const result = payload.chart.result[0];
    if (!result.timestamp || !result.indicators?.quote?.[0]) {
      console.error("Yahoo Finance API 데이터 구조 오류:", Object.keys(result || {}));
      return json(502, { 
        error: "Yahoo Finance API 데이터 구조가 올바르지 않습니다.", 
        hint: "해당 심볼의 데이터가 존재하는지 확인해주세요."
      });
    }

    console.log(`Yahoo Finance API 성공: ${result.timestamp.length}개 데이터 포인트`);
    
    // 그대로 전달
    return json(200, payload);

  } catch (e) {
    console.error("Yahoo Finance 함수 오류:", e);
    return json(500, { 
      error: "서버 내부 오류가 발생했습니다.", 
      details: e.message || String(e),
      hint: "잠시 후 다시 시도해주세요."
    });
  }
};

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
