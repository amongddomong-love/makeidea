// netlify/functions/google-robot-video.js
// 구글드라이브 특정 폴더에서 "video/*" mimeType 파일만 가져와서 리턴하는 함수
// - API 키는 Netlify 환경변수 ROBOT 에 저장 (절대 코드에 직접 쓰지 않기)
// - 폴더 ID는 고정 상수로 두거나, 필요하면 queryString으로 받아도 됨

const FOLDER_ID = "1f08ZgXoHNMQffQdZncuVpdvA50bnQt7F"; // 팀장님 폴더 ID

exports.handler = async (event, context) => {
  try {
    const API_KEY = process.env.ROBOT;
    if (!API_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "ROBOT 환경변수가 없습니다." })
      };
    }

    // ------ 기본 파라미터 설정 ------
    const baseUrl = "https://www.googleapis.com/drive/v3/files";
    const pageSize = 50;

    let files = [];
    let pageToken = null;

    // ------ 페이지네이션 돌면서 폴더 안 video/* 파일 모두 수집 ------
    do {
      const params = new URLSearchParams({
        key: API_KEY,
        q: `'${FOLDER_ID}' in parents and mimeType contains 'video/' and trashed = false`,
        fields: "files(id,name,mimeType,modifiedTime,thumbnailLink,webViewLink),nextPageToken",
        orderBy: "modifiedTime desc",
        pageSize: String(pageSize)
      });

      if (pageToken) {
        params.append("pageToken", pageToken);
      }

      const url = `${baseUrl}?${params.toString()}`;

      const res = await fetch(url);
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error("JSON 파싱 실패:", text);
        throw new Error("Google Drive 응답 파싱 실패");
      }

      if (!res.ok) {
        console.error("Drive API error:", data);
        return {
          statusCode: res.status,
          body: JSON.stringify({ error: data.error || "Drive API 오류" })
        };
      }

      const batch = data.files || [];
      files = files.concat(batch);
      pageToken = data.nextPageToken || null;
    } while (pageToken);

    // ------ 화면에서 쓰기 편하도록 최소 정보만 가공 ------
    const mapped = files.map((f) => {
      const id = f.id;
      return {
        id,
        name: f.name,
        mimeType: f.mimeType,
        modifiedTime: f.modifiedTime,
        // 구글드라이브 웹뷰 링크 (새 탭에서 열기용)
        viewUrl: f.webViewLink || `https://drive.google.com/file/d/${id}/view`,
        // 동영상 스트리밍용 (embed 하고 싶을 때 사용)
        // * 파일 공유 설정이 "링크가 있는 모든 사용자" 이상이어야 동작
        streamingUrl: `https://drive.google.com/uc?export=download&id=${id}`,
        // 썸네일이 있으면 사용, 없으면 null
        thumbnail: f.thumbnailLink || null
      };
    });

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({ files: mapped })
    };
  } catch (e) {
    console.error("google-robot-video error:", e);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: e.message || "내부 서버 오류" })
    };
  }
};
