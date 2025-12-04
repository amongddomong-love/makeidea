// netlify/functions/ecos-stat-search.js
// ECOS StatisticSearch 프록시 + 집계 함수
// 쿼리 파라미터:
//   statCode   : 통계표 코드 (예: 722Y001)
//   cycle      : 주기 (D/M/Q/A)
//   startDate  : 시작일 (YYYYMMDD)
//   endDate    : 종료일 (YYYYMMDD)
//   itemCode1  : (선택) 세부 통계항목 코드1 (예: 기준금리 0101000, USD환율 0000001)
//
// 응답 형식:
//   { labels: ["YYYY-MM-DD", ...], values: [숫자, ...] }

exports.handler = async (event, context) => {
  try {
    const apiKey = process.env.BOK_API_KEY;

    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "환경변수 BOK_API_KEY가 설정되어 있지 않습니다." }),
      };
    }

    const params = event.queryStringParameters || {};
    const statCode = params.statCode;
    const cycle = params.cycle;
    const startDate = params.startDate;
    const endDate = params.endDate;
    const itemCode1 = params.itemCode1 || "";

    if (!statCode || !cycle || !startDate || !endDate) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "필수 파라미터(statCode, cycle, startDate, endDate)가 누락되었습니다.",
        }),
      };
    }

    const perPage = 100;
    const basePath =
      `${statCode}/${cycle}/${startDate}/${endDate}` +
      (itemCode1 ? `/${itemCode1}` : "");

    // 1차 호출: 전체 건수(list_total_count) 확인
    const firstUrl = `https://ecos.bok.or.kr/api/StatisticSearch/${apiKey}/json/kr/1/${perPage}/${basePath}`;

    const firstRes = await fetch(firstUrl);
    if (!firstRes.ok) {
      return {
        statusCode: firstRes.status,
        body: JSON.stringify({ error: `ECOS 첫 호출 실패 (status: ${firstRes.status})` }),
      };
    }

    const firstJson = await firstRes.json();
    const root = firstJson && firstJson.StatisticSearch ? firstJson.StatisticSearch : null;

    if (!root) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "ECOS 응답 형식이 예상과 다릅니다.(StatisticSearch 없음)" }),
      };
    }

    const totalCount = parseInt(root.list_total_count || "0", 10);

    // 첫 페이지 row 수집
    let rows = [];
    if (root.row) {
      if (Array.isArray(root.row)) {
        rows = rows.concat(root.row);
      } else {
        rows.push(root.row);
      }
    }

    // 2페이지 이후가 있다면 추가 호출
    const pageCount = Math.max(1, Math.ceil(totalCount / perPage));
    const promises = [];

    for (let page = 2; page <= pageCount; page++) {
      const startIdx = (page - 1) * perPage + 1;
      const endIdx = page * perPage;
      const url = `https://ecos.bok.or.kr/api/StatisticSearch/${apiKey}/json/kr/${startIdx}/${endIdx}/${basePath}`;
      promises.push(fetch(url).then((res) => res.json()));
    }

    if (promises.length > 0) {
      const otherPages = await Promise.all(promises);
      otherPages.forEach((json) => {
        const r = json && json.StatisticSearch && json.StatisticSearch.row;
        if (!r) return;
        if (Array.isArray(r)) {
          rows = rows.concat(r);
        } else {
          rows.push(r);
        }
      });
    }

    // TIME 기준 정렬
    rows.sort((a, b) => {
      const ta = a.TIME || "";
      const tb = b.TIME || "";
      return ta.localeCompare(tb);
    });

    // 라벨/값 생성
    const labels = rows.map((r) => {
      const t = r.TIME || "";
      if (t.length === 8) {
        const y = t.slice(0, 4);
        const m = t.slice(4, 6);
        const d = t.slice(6, 8);
        return `${y}-${m}-${d}`;
      }
      return t;
    });

    const values = rows.map((r) => {
      const v = parseFloat(r.DATA_VALUE);
      return Number.isFinite(v) ? v : null;
    });

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ labels, values }),
    };
  } catch (err) {
    console.error("ecos-stat-search 함수 오류:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "서버 내부 오류 (ecos-stat-search)", detail: String(err) }),
    };
  }
};
