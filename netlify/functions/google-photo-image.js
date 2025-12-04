// netlify/functions/google-photo-image.js
// 쿼리 ?fileId=... 로 호출하면 해당 구글 드라이브 파일 이미지를 반환하는 프록시 함수
// - JPG/PNG/GIF 등: 그대로 전달
// - HEIC/HEIF: sharp로 JPEG 변환 후 전달

const crypto = require("crypto");
// sharp 모듈: package.json 에 "sharp": "^0.33.0" 추가 필요
const sharp = require("sharp");

// google-photo-album.js 와 동일한 토큰 발급 로직 재사용
function base64urlEncode(str) {
  return Buffer.from(str)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

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

  // 환경변수에서 들어온 \n 복원
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

exports.handler = async (event) => {
  try {
    const params = event.queryStringParameters || {};
    const fileId = params.fileId;

    if (!fileId) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
        body: "fileId 파라미터가 필요합니다.",
      };
    }

    const accessToken = await getAccessToken();

    // 이미지 바이너리 가져오기
    const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
      fileId
    )}?alt=media`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        // GIF/이미지 형식 힌트
        Accept: "image/*,*/*",
      },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Drive image fetch error:", res.status, text.slice(0, 200));
      return {
        statusCode: res.status,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
        body: `이미지 가져오기 실패: HTTP ${res.status}`,
      };
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentTypeHeader = res.headers.get("content-type") || "";
    let outBuffer = buffer;
    let outContentType = contentTypeHeader || "image/jpeg";

    // ---------- HEIC/HEIF 인 경우 JPEG로 변환 ----------
    // (브라우저에서 HEIC는 직접 표시 불가)
    if (
      /image\/heic/i.test(contentTypeHeader) ||
      /image\/heif/i.test(contentTypeHeader)
    ) {
      try {
        outBuffer = await sharp(buffer).jpeg().toBuffer();
        outContentType = "image/jpeg";
        console.log("HEIC 이미지를 JPEG로 변환했습니다.");
      } catch (convErr) {
        console.error("HEIC → JPEG 변환 실패:", convErr);
        // 변환 실패 시 원본 그대로 전달 (안 보일 수는 있어도 에러는 막자)
        outBuffer = buffer;
        outContentType = contentTypeHeader || "application/octet-stream";
      }
    }

    // GIF, JPG, PNG 등은 그대로 전달
    return {
      statusCode: 200,
      headers: {
        "Content-Type": outContentType,
        "Cache-Control": "public, max-age=86400",
      },
      body: outBuffer.toString("base64"),
      isBase64Encoded: true,
    };
  } catch (e) {
    console.error("google-photo-image 함수 오류:", e);
    return {
      statusCode: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
      body: "서버 오류: " + String(e),
    };
  }
};
