// Netlify 서버리스 함수: firebase_api 키를 반환
// 실제 운영에서는 인증된 요청에만 응답하도록 보안 강화 필요
exports.handler = async function(event, context) {
  // Netlify 환경변수에서 firebase_api 키를 읽음
  const FIREBASE_API_KEY = process.env.firebase_api;

  // (예시) 인증 로직: 개발용이므로 실제 운영에서는 반드시 인증 추가 필요
  // if (!event.headers['authorization'] || event.headers['authorization'] !== 'Bearer your_token') {
  //   return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  // }

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*', // CORS 설정
      'Access-Control-Allow-Headers': 'Content-Type'
    },
    body: JSON.stringify({ firebaseApiKey: FIREBASE_API_KEY })
  };
}; 