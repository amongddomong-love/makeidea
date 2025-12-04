// netlify/functions/send-email.js
// 필요한 패키지
const nodemailer = require('nodemailer');
const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require('docx');

// (도우미) 워드 파일 생성 함수
async function createWordDocument(content, queryType) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('ko-KR');
  const timeStr = now.toLocaleTimeString('ko-KR');

  // 간단한 본문 + 헤더 구성
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          text: `${(queryType || 'code').toUpperCase()} 생성 결과`,
          heading: HeadingLevel.TITLE,
        }),
        new Paragraph({
          children: [
            new TextRun({ text: `생성일: ${dateStr} ${timeStr}`, break: 1 }),
            new TextRun({ text: ' ' }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: content || '내용이 없습니다.',
            }),
          ],
        }),
      ],
    }],
  });

  return await Packer.toBuffer(doc); // Buffer 반환 (첨부용)
}

// Netlify 함수 엔드포인트
exports.handler = async (event) => {
  // CORS 헤더
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-App-Key',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    // 1) 인증 헤더 검사 (헤더 키는 소문자로 들어오는 경우가 많음)
    const h = event.headers || {};
    const appKey = h['x-app-key'] || h['X-App-Key'];
    if (!appKey || appKey !== '13risk') {
      return { statusCode: 401, headers, body: JSON.stringify({ error: '인증이 필요합니다.' }) };
    }

    // 2) 요청 파싱
    // ❗ filename은 받지 않음(중복 선언 충돌 방지)
    const { to, subject, content_html, queryType } = JSON.parse(event.body || '{}');

    // 3) 수신자 유효성 검사
    const recipients = (to || '')
      .split(/[,;]+/)
      .map(s => s.trim())
      .filter(Boolean);
    if (!recipients.length) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: '수신자 이메일이 필요합니다.' }) };
    }

    // 4) 본문 텍스트(워드용) 정제
    const textContent = content_html
      ? content_html.replace(/<[^>]*>/g, '')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&amp;/g, '&')
                    .trim()
      : '내용이 없습니다.';

    // 5) 워드 파일 생성
    const wordBuffer = await createWordDocument(textContent, queryType);
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const wordFilename = `${(queryType || 'code')}_result_${y}-${m}-${d}.docx`; // ✅ 중복 없는 변수명

    // 6) 메일 트랜스포트 생성
    // ❗ 오타 수정: createTransporter -> createTransport
    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST || 'smtp.naver.com',
      port: parseInt(process.env.MAIL_PORT || '587', 10),
      secure: false, // 587은 StartTLS
      auth: {
        user: process.env.MAIL_USER || 'kamekaze@naver.com',
        pass: process.env.MAIL_PASSWORD || '***여기에-실패-원인***', // 실제 배포에서는 반드시 환경변수 사용
      },
      // 필요시 강제 TLS: requireTLS: true,
    });

    // 7) 메일 옵션
    const emailBody = `안녕하세요,

요청하신 ${(queryType || 'code').toUpperCase()} 결과를 워드 파일로 첨부합니다.

첨부파일: ${wordFilename}

(자동발송) ${new Date().toLocaleString('ko-KR')}`;

    const mailOptions = {
      from: {
        name: process.env.MAIL_FROM_NAME || '리스크관리 자동화',
        address: process.env.MAIL_USER || 'kamekaze@naver.com', // 네이버는 보통 로그인 메일과 동일해야 전송 허용
      },
      to: recipients,
      subject: subject || `${(queryType || 'code').toUpperCase()} 결과 (${new Date().toLocaleDateString('ko-KR')})`,
      text: emailBody,
      html: content_html || `<p>요청하신 결과를 워드 파일로 첨부합니다.</p>`,
      attachments: [
        {
          filename: wordFilename,
          content: wordBuffer, // Buffer
          contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        },
      ],
    };

    // 8) 전송
    const info = await transporter.sendMail(mailOptions);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true, messageId: info.messageId || null }),
    };
  } catch (error) {
    // 상세 원인 노출(클라에서 같이 보여줄 수 있도록 details 필드 유지)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: '이메일 발송 중 오류가 발생했습니다.',
        details: error.message, // 예: Invalid login / getaddrinfo ENOTFOUND / etc.
        ts: new Date().toISOString(),
      }),
    };
  }
};
