// 목적: Functions(CJS)에서 Firebase 클라이언트 SDK(ESM)를 안전하게 초기화
// 포인트
//  1) dynamic import로 ESM 모듈 로드 (CJS 호환)
//  2) getApps()로 중복 초기화 방지
//  3) Firestore는 'lite' 사용: 서버리스에 적합(커넥션 적고 응답 빠름)

let _cache = null;

/**
 * Firebase App/Firestore 인스턴스를 1회 초기화 후 재사용
 * @returns {Promise<{app: any, db: any, firebase: any, firestoreLite: any}>}
 */
export async function getFirebase() {
  if (_cache) return _cache;

  // 동적 import: CJS에서도 ESM 모듈 로드 가능
  const firebase = await import('firebase/app');
  const firestoreLite = await import('firebase/firestore/lite');

  const { initializeApp, getApp, getApps } = firebase;
  const { getFirestore } = firestoreLite;

  // Netlify 환경변수에 저장된 Firebase 클라이언트 설정(JSON 문자열)
  // 예) {"apiKey":"...","authDomain":"...","projectId":"..."}
  const configStr = process.env.firebase_api;
  if (!configStr) {
    throw new Error('Missing env: firebase_api');
  }
  const firebaseConfig = JSON.parse(configStr);

  // 중복 초기화 방지
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

  const db = getFirestore(app);
  _cache = { app, db, firebase, firestoreLite };
  return _cache;
}
