// netlify/functions/gpt.js
// 서버리스 프록시: 브라우저 → (동일 출처) → 함수 → (서버-서버) → OpenAI API
// 환경변수: OPENAI_API_KEY 에 OpenAI 키 저장 (Netlify > Site settings > Environment variables)

export const handler = async (event) => {
  // OPTIONS 요청 처리 (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, X-App-Key',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  try {
    // 인증 헤더 검증
    const appKey = event.headers['x-app-key'] || event.headers['X-App-Key'];
    if (!appKey || appKey !== '13risk') {
      return json(401, { error: '인증이 필요합니다.' });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return json(500, { error: "Server missing OPENAI_API_KEY" });

    const { prompt } = JSON.parse(event.body || "{}");
    if (!prompt) return json(400, { error: "Missing prompt" });

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json", 
        "Authorization": `Bearer ${apiKey}` 
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // 최신/저렴 모델로 권장
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1000, 
        temperature: 0.7,
      })
    });

    const data = await resp.json();
    if (!resp.ok) return json(resp.status, { error: "OpenAI error", details: data });
    
    return json(200, { content: data?.choices?.[0]?.message?.content || "" });
  } catch (e) {
    return json(500, { error: e.message || String(e) });
  }
};

function json(status, obj) { 
  return { 
    statusCode: status, 
    headers: { 
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, X-App-Key",
      "Access-Control-Allow-Methods": "POST, OPTIONS"
    }, 
    body: JSON.stringify(obj) 
  }; 
}
