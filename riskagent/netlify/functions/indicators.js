// netlify/functions/indicators.js
export const handler = async () => {
  // ▶ Python 백엔드의 BOK_INDICATORS와 동일 구조로 반환
  const indicators = [
    {code:"901Y001",item:"A",name:"소비자물가상승률",description:"전년동월대비 소비자물가상승률",unit:"%",category:"물가"},
    {code:"901Y001",item:"F",name:"실업률",description:"실업률",unit:"%",category:"고용"},
    {code:"722Y001",item:"A",name:"기준금리",description:"한국은행 기준금리",unit:"%",category:"금리"},
    {code:"731Y001",item:"A",name:"원달러환율",description:"원/달러 환율",unit:"원",category:"환율"},
    {code:"200Y001",item:"A",name:"GDP성장률",description:"실질GDP 전년동기대비증감률",unit:"%",category:"성장"},
  ];
  const categories = [...new Set(indicators.map(i => i.category))];
  return { statusCode:200, headers:{'Content-Type':'application/json'}, body: JSON.stringify({indicators, categories}) };
};
