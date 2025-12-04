// netlify/functions/yahoo-robot.js
// Yahoo Finance 차트 API 프록시
// 프론트에서: /.netlify/functions/yahoo-robot?symbol=TSLA&start=2025-11-18&end=2025-11-23

// 날짜(YYYY-MM-DD)를 Unix time(초)로 변환
function toUnix(dateStr, fallbackDaysAgo = 365) {
  if (!dateStr) {
    const d = new Date();
    d.setDate(d.getDate() - fallbackDaysAgo);
    return Math.floor(d.getTime() / 1000);
  }
  const d = new Date(dateStr);
  if (isNaN(d)) {
    const dd = new Date();
    dd.setDate(dd.getDate() - fallbackDaysAgo);
    return Math.floor(dd.getTime() / 1000);
  }
  return Math.floor(d.getTime() / 1000);
}

exports.handler = async (event, context) => {
  try {
    const qs = event.queryStringParameters || {};
    const symbol = qs.symbol;
    const start = qs.start;
    const end = qs.end;

    if (!symbol) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'symbol 파라미터가 필요합니다.' }),
      };
    }

    // Yahoo Finance v8 chart API 사용
    const period1 = toUnix(start, 10); // 기본 10일 전
    // period2는 "종료일 + 1일" 정도로 두는 편이 안전
    const endDateObj = end ? new Date(end) : new Date();
    if (isNaN(endDateObj)) {
      endDateObj.setTime(Date.now());
    }
    // 1일 더해줘서 inclusive 비슷하게
    endDateObj.setDate(endDateObj.getDate() + 1);
    const period2 = Math.floor(endDateObj.getTime() / 1000);

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      symbol
    )}?interval=1d&period1=${period1}&period2=${period2}`;

    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; NetlifyBot/1.0; +https://www.netlify.com/)',
        Accept: 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      // Yahoo에서 HTML 에러를 줄 수도 있어서, 그때는 raw 응답을 감싸서 보냄
      data = { raw: text };
    }

    if (!res.ok) {
      return {
        statusCode: res.status === 403 ? 502 : res.status,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Yahoo Finance 요청 실패',
          status: res.status,
          detail: data,
        }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(data),
    };
  } catch (err) {
    console.error('yahoo-robot error:', err);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Internal Server Error', detail: String(err) }),
    };
  }
};
