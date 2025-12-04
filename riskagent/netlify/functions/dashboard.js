// netlify/functions/dashboard.js
// ▶ 간단 버전: World Bank API로 CPI/Unemployment만 실데이터, 나머지는 샘플 생성
const WB = 'https://api.worldbank.org/v2';
const KST = 9 * 60 * 60 * 1000;

async function wbSeries(country, indicator){
  const url = `${WB}/country/${country}/indicator/${indicator}?format=json&per_page=1000`;
  const r = await fetch(url); const j = await r.json();
  const arr = (Array.isArray(j) && j[1]) ? j[1] : [];
  const series = arr.map(d => ({year:+d.date, value:d.value})).filter(d => d.year>=2005 && d.value!=null).sort((a,b)=>a.year-b.year);
  return series;
}
function sampleSeries(start=2005, end=2023, base=100, vol=0.5){
  const out=[]; for(let y=start; y<=end; y++){ const v = base + (Math.random()-0.5)*2*vol; out.push({year:y, value:+v.toFixed(2)}); } return out;
}

export const handler = async (event) => {
  const headers = {'Content-Type':'application/json; charset=utf-8'};
  try{
    const url = new URL(event.rawUrl);
    const indicatorsParam = (url.searchParams.get('indicators')||'소비자물가상승률,실업률').split(',').map(s=>s.trim());
    const country = url.searchParams.get('country') || 'KOR';

    const nameMap = {
      '소비자물가상승률': {wb:'FP.CPI.TOTL.ZG'},
      '실업률': {wb:'SL.UEM.TOTL.ZS'},
      '기준금리': {sample:{base:3.5, vol:0.2}},
      '원달러환율': {sample:{base:1200, vol:60}},
      'GDP성장률': {sample:{base:2.8, vol:0.8}},
      // 하위호환: 'cpi','unemployment'
      'cpi': {wb:'FP.CPI.TOTL.ZG'},
      'unemployment': {wb:'SL.UEM.TOTL.ZS'},
    };

    const series = {};
    const headline = {};
    for(const key of indicatorsParam){
      const meta = nameMap[key];
      if (!meta){ continue; }
      let s=[];
      if (meta.wb){
        s = await wbSeries(country, meta.wb);
      }else{
        const {base, vol} = meta.sample;
        s = sampleSeries(2005, 2023, base, vol);
      }
      series[key] = s;
      headline[key] = s.length ? +s[s.length-1].value.toFixed(2) : null;
    }

    const now = new Date(Date.now()+KST).toISOString(); // Asia/Seoul
    return { statusCode:200, headers, body: JSON.stringify({ now, headline, series }) };
  }catch(e){
    return { statusCode:500, headers, body: JSON.stringify({ error:String(e) }) };
  }
};
