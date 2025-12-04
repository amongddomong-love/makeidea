const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, onSnapshot, getDocs, orderBy, query, limit } = require('firebase/firestore');

// Firebase 설정
const firebaseConfig = {
  apiKey: process.env.firebase_api,
  authDomain: "chartupndown.firebaseapp.com",
  projectId: "chartupndown",
  storageBucket: "chartupndown.firebasestorage.app",
  messagingSenderId: "225904089655",
  appId: "1:225904089655:web:2832a9acd4d29c0e723db2",
  measurementId: "G-9K84VRDECB"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 입력 검증 함수
function validateInput(text, maxLength = 100) {
  if (!text || typeof text !== 'string') return '';
  
  // HTML 태그 제거
  text = text.replace(/<[^>]*>/g, '');
  // 특수문자 필터링
  text = text.replace(/[<>]/g, '');
  // 길이 제한
  if (text.length > maxLength) {
    text = text.substring(0, maxLength);
  }
  return text.trim();
}

exports.handler = async function(event, context) {
  // CORS 헤더 설정
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  // OPTIONS 요청 처리 (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    // GET 요청: 게시글 목록 조회
    if (event.httpMethod === 'GET') {
      const postsQuery = query(collection(db, "posts"), orderBy("timestamp", "desc"), limit(50));
      const querySnapshot = await getDocs(postsQuery);
      
      const posts = [];
      querySnapshot.forEach((doc) => {
        const post = doc.data();
        posts.push({
          id: doc.id,
          username: post.username,
          content: post.content,
          timestamp: post.timestamp.toDate().toISOString()
        });
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ posts })
      };
    }

    // POST 요청: 게시글 작성
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body);
      let { username, content } = body;

      // 입력 검증
      username = validateInput(username, 20);
      content = validateInput(content, 500);

      if (!username || !content) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: '아이디와 메시지를 모두 입력해주세요.' })
        };
      }

      // 게시글 저장
      const docRef = await addDoc(collection(db, "posts"), {
        username: username,
        content: content,
        timestamp: new Date()
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          postId: docRef.id,
          message: '게시글이 성공적으로 작성되었습니다.' 
        })
      };
    }

    // 지원하지 않는 HTTP 메서드
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: '서버 오류가 발생했습니다.' })
    };
  }
}; 