// netlify/functions/google-robot-pdf.js
// 구글드라이브에서 특정 폴더의 PDF 파일 목록을 가져오는 Netlify 함수
// - Google API Key: Netlify 환경변수 ROBOT 에 저장
// - Folder ID: 1jwNxOD2MyiJhgG0O_wdu6VkprjMqX2RA

const FOLDER_ID = "1jwNxOD2MyiJhgG0O_wdu6VkprjMqX2RA";

exports.handler = async (event, context) => {
  // CORS 허용 (필요시 도메인 제한 가능)
  const baseHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: baseHeaders,
      body: "",
    };
  }

  try {
    const apiKey = process.env.ROBOT;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers: baseHeaders,
        body: JSON.stringify({ error: "환경변수 ROBOT(구글 API 키)가 설정되어 있지 않습니다." }),
      };
    }

    // Google Drive API v3
    // 폴더 내 PDF, 휴지통 제외, 수정시간 기준 내림차순
    const params = new URLSearchParams({
      q: `'${FOLDER_ID}' in parents and mimeType='application/pdf' and trashed=false`,
      fields: "files(id,name,modifiedTime,webViewLink),nextPageToken",
      orderBy: "modifiedTime desc",
      pageSize: "100",
      key: apiKey,
    });

    const url = `https://www.googleapis.com/drive/v3/files?${params.toString()}`;

    const res = await fetch(url);
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error("Google Drive 응답 JSON 파싱 실패:", e, text.slice(0, 200));
      return {
        statusCode: 500,
        headers: baseHeaders,
        body: JSON.stringify({ error: "Google Drive 응답 JSON 파싱 실패" }),
      };
    }

    if (!res.ok) {
      console.error("Google Drive API 에러:", data);
      return {
        statusCode: res.status,
        headers: baseHeaders,
        body: JSON.stringify({ error: data.error || "Google Drive API 호출 실패" }),
      };
    }

    const files = (data.files || []).map((f) => {
      const id = f.id;
      // webViewLink 가 없을 수도 있으니 fallback 제공
      const viewUrl =
        f.webViewLink || `https://drive.google.com/file/d/${id}/view?usp=drivesdk`;
      return {
        id,
        name: f.name,
        modifiedTime: f.modifiedTime,
        viewUrl,
      };
    });

    return {
      statusCode: 200,
      headers: {
        ...baseHeaders,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({ files }),
    };
  } catch (e) {
    console.error("google-robot-pdf 함수 전체 에러:", e);
    return {
      statusCode: 500,
      headers: baseHeaders,
      body: JSON.stringify({ error: String(e) }),
    };
  }
};
