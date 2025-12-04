// Netlify Functions 프록시 서버
// DART API CORS 문제 해결을 위한 프록시

export const handler = async (event) => {
  try {
    // CORS 헤더 설정
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Content-Type': 'application/json; charset=utf-8'
    };

    // OPTIONS 요청 처리 (CORS preflight)
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers,
        body: ''
      };
    }

    // 환경변수에서 DART API 키 가져오기
    const apiKey = process.env.DART_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          status: 'error', 
          message: 'DART_API_KEY 환경변수가 설정되지 않았습니다.' 
        })
      };
    }

    // 쿼리 파라미터에서 path와 params 추출
    const { path, ...queryParams } = event.queryStringParameters || {};
    
    if (!path) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          status: 'error', 
          message: 'path 파라미터가 필요합니다.' 
        })
      };
    }

    // DART API URL 구성
    const baseUrl = 'https://opendart.fss.or.kr/api/' + encodeURIComponent(path);
    const searchParams = new URLSearchParams();
    
    // 기존 쿼리 파라미터 추가
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, value);
      }
    });
    
    // API 키 추가
    searchParams.append('crtfc_key', apiKey);
    
    const targetUrl = `${baseUrl}?${searchParams.toString()}`;
    
    console.log('DART API 호출:', targetUrl);

    // DART API 호출 (타임아웃 설정)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30초 타임아웃
    
    try {
      const response = await fetch(targetUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error('DART API 응답 오류:', response.status, response.statusText);
        return {
          statusCode: response.status,
          headers,
          body: JSON.stringify({ 
            status: 'error', 
            message: `DART API 호출 실패: ${response.status} ${response.statusText}` 
          })
        };
      }

      // 응답 데이터 처리
      const contentType = response.headers.get('content-type') || '';
      
      if (contentType.includes('application/json')) {
        // JSON 응답
        const data = await response.text();
        return {
          statusCode: 200,
          headers,
          body: data
        };
      } else if (contentType.includes('application/zip') || contentType.includes('octet-stream')) {
        // ZIP 파일 응답 (corpCode.xml)
        const buffer = await response.arrayBuffer();
        return {
          statusCode: 200,
          headers: {
            ...headers,
            'Content-Type': 'application/zip',
            'Content-Disposition': 'attachment; filename="corpCode.xml"'
          },
          body: Buffer.from(buffer).toString('base64'),
          isBase64Encoded: true
        };
      } else {
        // 기타 텍스트 응답
        const data = await response.text();
        return {
          statusCode: 200,
          headers: {
            ...headers,
            'Content-Type': contentType || 'text/plain'
          },
          body: data
        };
      }
    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.error('Fetch 에러:', fetchError);
      
      if (fetchError.name === 'AbortError') {
        return {
          statusCode: 504,
          headers,
          body: JSON.stringify({ 
            status: 'error', 
            message: '요청 시간 초과 (30초)' 
          })
        };
      }
      
      throw fetchError; // 다른 에러는 상위 catch로 전달
    }

  } catch (error) {
    console.error('프록시 서버 에러:', error);
    console.error('에러 스택:', error.stack);
    console.error('요청 정보:', {
      httpMethod: event.httpMethod,
      path: event.path,
      queryStringParameters: event.queryStringParameters,
      headers: event.headers
    });
    
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify({ 
        status: 'error', 
        message: `서버 에러: ${error.message}`,
        errorType: error.name,
        stack: error.stack
      })
    };
  }
};
