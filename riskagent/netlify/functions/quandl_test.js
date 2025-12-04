// netlify/functions/quandl_test.js
// 간단한 테스트 함수로 API 연결 상태 확인

export const handler = async (event) => {
  console.log("테스트 함수 호출됨");
  
  try {
    const apiKey = process.env.QUANDL_KEY;
    console.log("API 키 존재:", !!apiKey);
    console.log("API 키 길이:", apiKey ? apiKey.length : 0);
    
    if (!apiKey) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "QUANDL_KEY 환경변수가 설정되지 않음" })
      };
    }
    
    // 간단한 API 호출 테스트
    const testUrl = `https://data.nasdaq.com/api/v3/datasets/FRED/UNRATE.json?api_key=${apiKey}&limit=1`;
    console.log("테스트 URL:", testUrl);
    
    const response = await fetch(testUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/123 Safari/537.36",
        "Accept": "application/json",
      }
    });
    
    console.log("응답 상태:", response.status);
    const text = await response.text();
    console.log("응답 길이:", text.length);
    console.log("응답 내용 (처음 500자):", text.slice(0, 500));
    
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        success: true,
        status: response.status,
        responseLength: text.length,
        responsePreview: text.slice(0, 500),
        apiKeyLength: apiKey.length
      })
    };
    
  } catch (error) {
    console.error("테스트 오류:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        error: error.message,
        stack: error.stack 
      })
    };
  }
};
