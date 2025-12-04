// netlify/functions/ecos-key-stats.js
// 100대 통계지표(KeyStatisticList) 프록시 함수
// - ECOS API를 서버(Netlify)에서 호출해서 그대로 JSON 반환
// - 프론트에서는 / .netlify / functions / ecos-key-stats 만 호출

exports.handler = async (event, context) => {
  try {
    const apiKey = process.env.BOK_API_KEY;

    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "환경변수 BOK_API_KEY가 설정되어 있지 않습니다." }),
      };
    }

    const url = `https://ecos.bok.or.kr/api/KeyStatisticList/${apiKey}/json/kr/1/100`;

    // Node 18 이상에서는 fetch 내장
    const response = await fetch(url);
    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: `ECOS KeyStatisticList 호출 실패 (status: ${response.status})` }),
      };
    }

    const data = await response.json();

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        // 동일 도메인에서만 쓸 거라 꼭 필요하진 않지만, 혹시 몰라서 CORS 허용
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify(data),
    };
  } catch (err) {
    console.error("ecos-key-stats 함수 오류:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "서버 내부 오류 (ecos-key-stats)", detail: String(err) }),
    };
  }
};
