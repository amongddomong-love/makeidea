// netlify/functions/fdr.js
// FinanceDataReader 호환 서버리스 함수
// FinanceDataReader가 사용하는 데이터 소스들을 직접 호출

export const handler = async (event) => {
  try {
    const url = new URL(event.rawUrl);
    const symbol = url.searchParams.get("symbol");   // 예: "KOSPI", "USD/KRW"
    const start = url.searchParams.get("start");     // "YYYY-MM-DD"
    const end = url.searchParams.get("end");

    if (!symbol || !start || !end) {
      return json(400, { error: "Missing required params: symbol, start, end" });
    }

    let data;
    
    try {
      // FinanceDataReader가 사용하는 데이터 소스에 따라 분기
      if (symbol === 'KOSPI') {
        data = await fetchKospiData(start, end);
      } else if (symbol === 'KOSDAQ') {
        data = await fetchKosdaqData(start, end);
      } else if (symbol === 'USD/KRW') {
        data = await fetchUsdKrwData(start, end);
      } else if (symbol === 'KR10YT=RR') {
        data = await fetchKr10yData(start, end);
      } else if (symbol === 'US10YT=RR') {
        data = await fetchUs10yData(start, end);
      } else if (symbol === 'GC=F') {
        data = await fetchGoldData(start, end);
      } else if (symbol === 'CL=F') {
        data = await fetchOilData(start, end);
      } else if (symbol === 'BTC-USD') {
        data = await fetchBitcoinData(start, end);
      } else {
        return json(400, { error: `Unsupported symbol: ${symbol}` });
      }

      return json(200, { data });

    } catch (error) {
      console.error('Error fetching data:', error);
      return json(500, { error: error.message || 'Failed to fetch data' });
    }

  } catch (e) {
    return json(500, { error: e.message || String(e) });
  }
};

// KOSPI 데이터 조회 (Yahoo Finance API 사용)
async function fetchKospiData(start, end) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/^KS11?period1=${Math.floor(new Date(start).getTime() / 1000)}&period2=${Math.floor(new Date(end).getTime() / 1000)}&interval=1d`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  if (!data.chart || !data.chart.result || !data.chart.result[0]) {
    throw new Error('Invalid KOSPI data format');
  }
  
  const result = data.chart.result[0];
  const timestamps = result.timestamp;
  const values = result.indicators.quote[0].close;
  
  return timestamps.map((timestamp, index) => ({
    date: new Date(timestamp * 1000).toISOString().split('T')[0],
    value: values[index] || null
  })).filter(item => item.value !== null);
}

// KOSDAQ 데이터 조회
async function fetchKosdaqData(start, end) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/^KQ11?period1=${Math.floor(new Date(start).getTime() / 1000)}&period2=${Math.floor(new Date(end).getTime() / 1000)}&interval=1d`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  if (!data.chart || !data.chart.result || !data.chart.result[0]) {
    throw new Error('Invalid KOSDAQ data format');
  }
  
  const result = data.chart.result[0];
  const timestamps = result.timestamp;
  const values = result.indicators.quote[0].close;
  
  return timestamps.map((timestamp, index) => ({
    date: new Date(timestamp * 1000).toISOString().split('T')[0],
    value: values[index] || null
  })).filter(item => item.value !== null);
}

// USD/KRW 환율 데이터 조회
async function fetchUsdKrwData(start, end) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/USDKRW=X?period1=${Math.floor(new Date(start).getTime() / 1000)}&period2=${Math.floor(new Date(end).getTime() / 1000)}&interval=1d`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  if (!data.chart || !data.chart.result || !data.chart.result[0]) {
    throw new Error('Invalid USD/KRW data format');
  }
  
  const result = data.chart.result[0];
  const timestamps = result.timestamp;
  const values = result.indicators.quote[0].close;
  
  return timestamps.map((timestamp, index) => ({
    date: new Date(timestamp * 1000).toISOString().split('T')[0],
    value: values[index] || null
  })).filter(item => item.value !== null);
}

// 한국 10년 국채 수익률 데이터 조회
async function fetchKr10yData(start, end) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/KR10YT=RR?period1=${Math.floor(new Date(start).getTime() / 1000)}&period2=${Math.floor(new Date(end).getTime() / 1000)}&interval=1d`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  if (!data.chart || !data.chart.result || !data.chart.result[0]) {
    throw new Error('Invalid KR10Y data format');
  }
  
  const result = data.chart.result[0];
  const timestamps = result.timestamp;
  const values = result.indicators.quote[0].close;
  
  return timestamps.map((timestamp, index) => ({
    date: new Date(timestamp * 1000).toISOString().split('T')[0],
    value: values[index] || null
  })).filter(item => item.value !== null);
}

// 미국 10년 국채 수익률 데이터 조회
async function fetchUs10yData(start, end) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/US10YT=RR?period1=${Math.floor(new Date(start).getTime() / 1000)}&period2=${Math.floor(new Date(end).getTime() / 1000)}&interval=1d`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  if (!data.chart || !data.chart.result || !data.chart.result[0]) {
    throw new Error('Invalid US10Y data format');
  }
  
  const result = data.chart.result[0];
  const timestamps = result.timestamp;
  const values = result.indicators.quote[0].close;
  
  return timestamps.map((timestamp, index) => ({
    date: new Date(timestamp * 1000).toISOString().split('T')[0],
    value: values[index] || null
  })).filter(item => item.value !== null);
}

// 금 선물 데이터 조회
async function fetchGoldData(start, end) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/GC=F?period1=${Math.floor(new Date(start).getTime() / 1000)}&period2=${Math.floor(new Date(end).getTime() / 1000)}&interval=1d`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  if (!data.chart || !data.chart.result || !data.chart.result[0]) {
    throw new Error('Invalid Gold data format');
  }
  
  const result = data.chart.result[0];
  const timestamps = result.timestamp;
  const values = result.indicators.quote[0].close;
  
  return timestamps.map((timestamp, index) => ({
    date: new Date(timestamp * 1000).toISOString().split('T')[0],
    value: values[index] || null
  })).filter(item => item.value !== null);
}

// WTI 원유 데이터 조회
async function fetchOilData(start, end) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/CL=F?period1=${Math.floor(new Date(start).getTime() / 1000)}&period2=${Math.floor(new Date(end).getTime() / 1000)}&interval=1d`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  if (!data.chart || !data.chart.result || !data.chart.result[0]) {
    throw new Error('Invalid Oil data format');
  }
  
  const result = data.chart.result[0];
  const timestamps = result.timestamp;
  const values = result.indicators.quote[0].close;
  
  return timestamps.map((timestamp, index) => ({
    date: new Date(timestamp * 1000).toISOString().split('T')[0],
    value: values[index] || null
  })).filter(item => item.value !== null);
}

// 비트코인 데이터 조회
async function fetchBitcoinData(start, end) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/BTC-USD?period1=${Math.floor(new Date(start).getTime() / 1000)}&period2=${Math.floor(new Date(end).getTime() / 1000)}&interval=1d`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  if (!data.chart || !data.chart.result || !data.chart.result[0]) {
    throw new Error('Invalid Bitcoin data format');
  }
  
  const result = data.chart.result[0];
  const timestamps = result.timestamp;
  const values = result.indicators.quote[0].close;
  
  return timestamps.map((timestamp, index) => ({
    date: new Date(timestamp * 1000).toISOString().split('T')[0],
    value: values[index] || null
  })).filter(item => item.value !== null);
}

function json(status, obj) {
  return {
    statusCode: status,
    headers: { 
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
    },
    body: JSON.stringify(obj),
  };
}
