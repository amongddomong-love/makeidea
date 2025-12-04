const fetch = require('node-fetch');

// Netlify serverless 함수: GPT 호출 예제
// 환경변수(OPENAI_API_KEY)는 Netlify 대시보드에서 설정하며, 코드/프론트엔드에 노출되지 않습니다.
// process.env.OPENAI_API_KEY로만 접근해야 하며, 절대 프론트엔드로 전달하지 않습니다.
exports.handler = async function(event) {
    try {
        // 프론트엔드에서 전달된 키워드 파싱
        const { keywords } = JSON.parse(event.body);
        // Netlify 환경변수에서 OPENAI_API_KEY를 불러옵니다 (코드/프론트엔드에 노출 X)
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'API 키가 설정되어 있지 않습니다.' })
            };
        }
        // OpenAI API 호출 예시
        // 실제로는 아래 url, method, body 등 OpenAI API에 맞게 수정 필요
        const url = 'https://api.openai.com/v1/chat/completions';
        const openaiPayload = {
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: '당신은 금융과 경제 분야의 전문가입니다.' },
                { role: 'user', content: keywords }
            ],
            temperature: 0.7,
            max_tokens: 1000
        };
        // fetch 호출 시 Authorization 헤더에만 키를 포함 (프론트엔드 노출 방지)
        // 절대 apiKey를 프론트엔드로 전달하지 마세요!
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}` // 키는 오직 서버에서 헤더에만 포함
            },
            body: JSON.stringify(openaiPayload)
        });
        const data = await response.json();
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify(data)
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'OpenAI 호출 중 오류가 발생했습니다.' })
        };
    }
}; 
// 이 함수는 오직 서버에서 실행되며, OPENAI_API_KEY는 process.env로만 접근합니다.
// 프론트엔드 fetch 요청에는 키가 포함되지 않습니다. (Authorization 헤더는 서버에서만 추가) 