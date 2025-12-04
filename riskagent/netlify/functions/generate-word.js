const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require('docx');

exports.handler = async (event, context) => {
  console.log('워드 파일 생성 함수 호출됨:', event.httpMethod, event.path);
  
  // CORS 헤더 설정
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-App-Key',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // OPTIONS 요청 처리 (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // POST 요청만 처리
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    console.log('워드 파일 생성 요청 받음:', event.body);
    
    // 인증 헤더 검증
    const appKey = event.headers['x-app-key'] || event.headers['X-App-Key'];
    if (!appKey || appKey !== '13risk') {
      console.log('인증 실패:', appKey);
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: '인증이 필요합니다.' })
      };
    }
    
    const { content, queryType } = JSON.parse(event.body);

    // 입력 검증
    if (!content) {
      console.log('내용 검증 실패:', content);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '내용이 필요합니다.' })
      };
    }

    // 워드 파일 생성
    const now = new Date();
    const dateStr = now.toLocaleDateString('ko-KR');
    const timeStr = now.toLocaleTimeString('ko-KR');
    
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: `${queryType ? queryType.toUpperCase() : '코드'} 생성 결과`,
            heading: HeadingLevel.TITLE,
          }),
          new Paragraph({
            text: `생성일시: ${dateStr} ${timeStr}`,
            heading: HeadingLevel.HEADING_2,
          }),
          new Paragraph({
            text: "=".repeat(50),
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: content,
                font: "Consolas",
                size: 20, // 10pt
              }),
            ],
          }),
          new Paragraph({
            text: "=".repeat(50),
          }),
          new Paragraph({
            text: "이 문서는 리스크관리 자동화 시스템에 의해 자동으로 생성되었습니다.",
            italics: true,
          }),
        ],
      }],
    });

    const buffer = await Packer.toBuffer(doc);
    
    console.log('워드 파일 생성 성공');
    
    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${queryType || 'code'}_result_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}.docx"`
      },
      body: buffer.toString('base64'),
      isBase64Encoded: true
    };

  } catch (error) {
    console.error('워드 파일 생성 오류:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: '워드 파일 생성 중 오류가 발생했습니다.',
        details: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};
