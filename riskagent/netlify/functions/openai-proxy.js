// 🔒 개선된 OpenAI 프록시 함수
// ✅ API 키는 서버에서만 사용, 클라이언트에 절대 노출되지 않음
// ✅ CORS 지원, 환경변수 기반 설정
// ✅ OpenAI 호환 엔드포인트 지원 (Groq, LM Studio 등)
// 
// 필요한 환경변수:
// - OPENAI_API_KEY   : OpenAI 또는 호환 API 키 (필수)
// - OPENAI_BASE_URL  : 기본값 'https://api.openai.com/v1' (선택)
// - ALLOWED_ORIGINS  : CORS 허용 도메인(쉼표구분) 또는 '*' (선택)

exports.handler = async function(event) {
  try {
    // CORS 처리
    const origin = event.headers.origin || "";
    const allowed = (process.env.ALLOWED_ORIGINS || "*")
      .split(",")
      .map(s => s.trim());
    const allowOrigin =
      allowed.includes("*") || allowed.includes(origin) ? origin || "*" : "*";

    // OPTIONS 요청 처리 (CORS preflight)
    if (event.httpMethod === 'OPTIONS') {
      return resp(204, {}, allowOrigin);
    }

    // GET 요청 처리 (진단용 - 함수 배포 확인)
    if (event.httpMethod === 'GET') {
      const apiKey = process.env.OPENAI_API_KEY;
      const baseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
      
      return resp(200, {
        ok: true,
        where: "openai-proxy",
        timestamp: new Date().toISOString(),
        hasApiKey: !!(apiKey),
        baseUrl: baseUrl,
        method: "GET",
        origin: event.headers.origin || "unknown",
        userAgent: event.headers['user-agent'] || "unknown"
      }, allowOrigin);
    }

    // 환경변수 체크
    const apiKey = process.env.OPENAI_API_KEY;
    const baseUrl = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
    
    if (!apiKey) {
      console.error('❌ OPENAI_API_KEY 환경변수가 설정되지 않음');
      return resp(500, { 
        error: "OPENAI_API_KEY is not set on Netlify.",
        code: "MISSING_API_KEY"
      }, allowOrigin);
    }

    if (event.httpMethod !== "POST") {
      return resp(405, { error: "Method Not Allowed. Use POST for OpenAI requests." }, allowOrigin);
    }

    // 클라이언트에서 온 바디 그대로 전달(모델/메시지 등)
    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch (e) {
      return resp(400, { 
        error: "Invalid JSON in request body",
        code: "INVALID_JSON"
      }, allowOrigin);
    }

    // 기본값 설정
    if (!body.model) body.model = 'gpt-4o-mini';
    if (!body.messages) body.messages = [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Hello' }
    ];

    console.log('🔄 OpenAI 호환 API 호출:', {
      baseUrl,
      model: body.model,
      messagesCount: body.messages?.length || 0
    });

    // OpenAI 호환 Chat Completions 엔드포인트 호출
    const r = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "User-Agent": "Netlify-Function-OpenAI-Proxy/2.0"
      },
      body: JSON.stringify(body)
    });

    const data = await r.json().catch(() => ({}));
    
    if (!r.ok) {
      console.error('❌ 상위 API 오류:', r.status, data);
      // 상위로 에러 전파 (프록시 환경변수 미설정/모델명 오류 등)
      return resp(r.status, { 
        error: "Upstream API error", 
        detail: data,
        code: "UPSTREAM_ERROR"
      }, allowOrigin);
    }
    
    console.log('✅ API 호출 성공');
    return resp(200, data, allowOrigin);

  } catch (err) {
    console.error('❌ 함수 내부 오류:', err);
    return resp(500, { 
      error: "Function error", 
      detail: String(err?.message || err),
      code: "INTERNAL_ERROR"
    }, "*");
  }
}

// 응답 헬퍼 함수
function resp(statusCode, json, origin) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Max-Age": "86400"
    },
    body: JSON.stringify(json)
  };
}
