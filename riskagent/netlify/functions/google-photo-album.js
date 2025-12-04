// netlify/functions/google-photo-album.js
// - ?mode=years  : 최상위 폴더(ROOT_FOLDER_ID) 아래 연도 폴더 목록
// - ?mode=photos&folderId=... : 해당 폴더의 이미지 파일 목록

const crypto = require("crypto");

const ROOT_FOLDER_ID = "1MHo4JrlgQAAWXExR5jDd6uD5JOh6pLm5"; // 팀장님 최상위 앨범 폴더

// base64url 유틸
function base64urlEncode(str) {
  return Buffer.from(str)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

// 서비스 계정으로 Drive 토큰 발급
async function getAccessToken() {
  const saJson =
    process.env.GOOGLE_DRIVE_SA_JSON || process.env.ROBOT;

  if (!saJson) {
    throw new Error(
      "환경변수 GOOGLE_DRIVE_SA_JSON 또는 ROBOT(서비스 계정 JSON)이 설정되지 않았습니다."
    );
  }

  let creds;
  try {
    creds = JSON.parse(saJson);
  } catch (e) {
    throw new Error("서비스 계정 JSON 파싱 실패: " + e.message);
  }

  const clientEmail = creds.client_email;
  let privateKey = creds.private_key;

  if (!clientEmail || !privateKey) {
    throw new Error(
      "서비스 계정 JSON에 client_email 또는 private_key가 없습니다."
    );
  }

  privateKey = privateKey.replace(/\\n/g, "\n");

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claimSet = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/drive.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const encodedHeader = base64urlEncode(JSON.stringify(header));
  const encodedClaim = base64urlEncode(JSON.stringify(claimSet));
  const unsignedToken = `${encodedHeader}.${encodedClaim}`;

  const signer = crypto.createSign("RSA-SHA256");
  signer.update(unsignedToken);
  signer.end();
  const signature = signer.sign(privateKey, "base64");
  const encodedSignature = signature
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

  const jwt = `${unsignedToken}.${encodedSignature}`;

  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion: jwt,
  });

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const tokenText = await tokenRes.text();
  let tokenData;
  try {
    tokenData = JSON.parse(tokenText);
  } catch (e) {
    throw new Error("토큰 응답 JSON 파싱 실패: " + tokenText.slice(0, 200));
  }

  if (!tokenRes.ok) {
    throw new Error(
      tokenData.error_description ||
        tokenData.error ||
        `토큰 발급 실패: HTTP ${tokenRes.status}`
    );
  }

  if (!tokenData.access_token) {
    throw new Error("토큰 응답에 access_token이 없습니다.");
  }

  return tokenData.access_token;
}

// Drive 파일 목록 조회 공통 함수
async function listDriveFiles({ q, fields }) {
  const accessToken = await getAccessToken();

  const params = new URLSearchParams({
    q,
    fields:
      fields ||
      "files(id,name,mimeType,modifiedTime,thumbnailLink,webViewLink,webContentLink)",
    pageSize: "200",
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
    corpora: "allDrives",
    orderBy: "name desc",
  });

  const url = `https://www.googleapis.com/drive/v3/files?${params.toString()}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error("Drive API 응답 JSON 파싱 실패: " + text.slice(0, 200));
  }

  if (!res.ok) {
    throw new Error(data.error?.message || `Drive API 오류: HTTP ${res.status}`);
  }

  return data.files || [];
}

// Netlify handler
exports.handler = async (event) => {
  try {
    const params = event.queryStringParameters || {};
    const mode = params.mode || "years";

    if (mode === "years") {
      const q = `'${ROOT_FOLDER_ID}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
      const files = await listDriveFiles({ q });

      const normalized = files
        .map((f) => ({
          id: f.id,
          name: f.name,
          modifiedTime: f.modifiedTime,
        }))
        .sort((a, b) => (b.name || "").localeCompare(a.name || ""));

      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ mode: "years", folders: normalized }),
      };
    }

    if (mode === "photos") {
      const folderId = params.folderId;
      if (!folderId) {
        return {
          statusCode: 400,
          headers: { "Content-Type": "application/json; charset=utf-8" },
          body: JSON.stringify({ error: "folderId 파라미터가 필요합니다." }),
        };
      }

      const q = `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`;
      const files = await listDriveFiles({ q });

      const images = files
        .map((f) => ({
          id: f.id,
          name: f.name,
          mimeType: f.mimeType,
          modifiedTime: f.modifiedTime,
        }))
        .sort((a, b) => (b.modifiedTime || "").localeCompare(a.modifiedTime || ""));

      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ mode: "photos", images }),
      };
    }

    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        error: "mode 파라미터는 years 또는 photos 여야 합니다.",
      }),
    };
  } catch (e) {
    console.error("google-photo-album 함수 오류:", e);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ error: String(e) }),
    };
  }
};
