// netlify/functions/config.js
export const handler = async (event) => {
  const headers = {'Content-Type':'application/json'};
  if (event.httpMethod === 'GET') {
    // ▶ Netlify 환경변수에서만 읽기
    const has = !!process.env.BOK_API_KEY;
    return { statusCode:200, headers, body: JSON.stringify({ has_bok_key: has, bok_api_key: has ? '***' : null }) };
  }
  // ▶ POST로 환경변수 저장은 불가(런타임에서 변경 못함)
  return { statusCode:405, headers, body: JSON.stringify({ message:'배포환경에서는 UI로 환경변수를 저장할 수 없습니다. Netlify 대시보드에서 설정하세요.' }) };
};
