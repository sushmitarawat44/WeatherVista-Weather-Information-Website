const API = "https://api.open-meteo.com/v1/forecast";
const GEO = "https://geocoding-api.open-meteo.com/v1/search";
const demo = {
  name:"Delhi", country:"India", latitude:28.6139, longitude:77.2090,
  current:{temperature_2m:29, apparent_temperature:31, relative_humidity_2m:55, wind_speed_10m:12, weather_code:1, uv_index:5},
  hourly:{time:Array.from({length:24},(_,i)=>new Date(Date.now()+i*3600000).toISOString()),temperature_2m:Array.from({length:24},(_,i)=>27+Math.round(Math.sin(i/3)*5)),precipitation_probability:Array.from({length:24},(_,i)=>i%5===0?40:8)},
  daily:{time:Array.from({length:7},(_,i)=>new Date(Date.now()+i*86400000).toISOString()),weather_code:[1,2,3,61,80,2,0],temperature_2m_max:[34,33,31,29,32,35,36],temperature_2m_min:[24,24,23,22,24,25,25],precipitation_probability_max:[8,18,45,72,35,12,4],wind_speed_10m_max:[12,16,19,14,11,13,10],sunrise:["06:00"],sunset:["18:40"]}
};
const codeMap={0:["☀️","Clear sky"],1:["🌤️","Mainly clear"],2:["⛅","Partly cloudy"],3:["☁️","Overcast"],45:["🌫️","Fog"],48:["🌫️","Rime fog"],51:["🌦️","Light drizzle"],53:["🌦️","Drizzle"],55:["🌧️","Heavy drizzle"],61:["🌦️","Light rain"],63:["🌧️","Rain"],65:["🌧️","Heavy rain"],71:["🌨️","Light snow"],73:["❄️","Snow"],75:["❄️","Heavy snow"],80:["🌦️","Rain showers"],81:["🌧️","Rain showers"],82:["⛈️","Heavy showers"],95:["⛈️","Thunderstorm"],96:["⛈️","Thunderstorm"],99:["⛈️","Thunderstorm"]};
function weatherInfo(code){return codeMap[code]||["🌡️","Variable conditions"]}
function esc(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
async function geocode(city){
  const r=await fetch(`${GEO}?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
  if(!r.ok) throw Error("Location search failed");
  const d=await r.json(); if(!d.results?.length) throw Error("City not found");
  return d.results[0];
}
async function getWeather(place){
  const url=`${API}?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,uv_index&hourly=temperature_2m,precipitation_probability,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,sunrise,sunset&timezone=auto&forecast_days=7`;
  const r=await fetch(url); if(!r.ok) throw Error("Weather service unavailable"); return await r.json();
}
function saveRecent(place){let arr=JSON.parse(localStorage.getItem("wv_recent")||"[]"); arr=[place.name,...arr.filter(x=>x.toLowerCase()!==place.name.toLowerCase())].slice(0,6);localStorage.setItem("wv_recent",JSON.stringify(arr))}
function formatDay(date){return new Intl.DateTimeFormat("en",{weekday:"short",month:"short",day:"numeric"}).format(new Date(date))}
function formatHour(date){return new Intl.DateTimeFormat("en",{hour:"numeric"}).format(new Date(date))}
function deg(d){const dirs=["N","NE","E","SE","S","SW","W","NW"];return dirs[Math.round(d/45)%8]}
function comfort(t,h){if(t>=35)return "Very warm";if(t>=29&&h>70)return "Humid";if(t<15)return "Cool";return "Comfortable"}

async function loadDashboard(place){
  const box=document.getElementById("searchMessage"); if(box)box.textContent="Loading live weather...";
  let data;
  try{data=await getWeather(place)}catch(e){data=demo; place={...demo}}
  const c=data.current||demo.current, info=weatherInfo(c.weather_code);
  document.getElementById("currentCity").textContent=`${place.name}${place.country?`, ${place.country}`:""}`;
  document.getElementById("updatedAt").textContent="Just updated";
  document.getElementById("weatherIcon").textContent=info[0];
  document.getElementById("currentTemp").textContent=Math.round(c.temperature_2m)+"°";
  document.getElementById("condition").textContent=info[1];
  document.getElementById("feelsLike").textContent=Math.round(c.apparent_temperature)+"°";
  document.getElementById("humidity").textContent=c.relative_humidity_2m+"%";
  document.getElementById("wind").textContent=Math.round(c.wind_speed_10m)+" km/h";
  document.getElementById("uv").textContent=Math.round(c.uv_index??0);
  document.getElementById("rainChance").textContent=(data.hourly?.precipitation_probability?.[0]??0)+"%";
  document.getElementById("windDir").textContent=deg(c.wind_direction_10m??0);
  document.getElementById("comfort").textContent=comfort(c.temperature_2m,c.relative_humidity_2m);
  const sr=data.daily?.sunrise?.[0]?.slice(11,16)||"--", ss=data.daily?.sunset?.[0]?.slice(11,16)||"--";
  document.getElementById("sunTimes").textContent=`${sr} / ${ss}`;
  const hg=document.getElementById("hourlyForecast"); hg.innerHTML="";
  for(let i=0;i<8;i++){const t=data.hourly?.time?.[i],temp=data.hourly?.temperature_2m?.[i]??0,p=data.hourly?.precipitation_probability?.[i]??0,wi=weatherInfo(data.hourly?.weather_code?.[i]??0);hg.innerHTML+=`<div class="hour-card"><div class="time">${formatHour(t)}</div><div class="weather-icon">${wi[0]}</div><div class="temp">${Math.round(temp)}°</div><div class="rain">💧 ${p}%</div></div>`}
  saveRecent(place); renderRecent();
  if(box)box.textContent="";
}
function renderRecent(){const el=document.getElementById("recentCities");if(!el)return;const arr=JSON.parse(localStorage.getItem("wv_recent")||"[]");el.innerHTML=arr.length?arr.map(c=>`<button class="city-pill" data-city="${esc(c)}">📍 ${esc(c)}</button>`).join(""):`<span style="color:#8290a3;font-size:12px">Your searched cities will appear here.</span>`;el.querySelectorAll("[data-city]").forEach(b=>b.onclick=()=>location.href=`index.html?city=${encodeURIComponent(b.dataset.city)}`)}
async function initHome(){
  const params=new URLSearchParams(location.search);let city=params.get("city")||"Delhi";let place;
  try{place=await geocode(city)}catch(e){place=demo}
  await loadDashboard(place);
  document.getElementById("searchForm").onsubmit=async e=>{e.preventDefault();const input=document.getElementById("cityInput");try{const p=await geocode(input.value.trim());await loadDashboard(p)}catch(err){document.getElementById("searchMessage").textContent="We couldn't find that city. Try a larger city name."}};
  renderRecent();
}
async function initForecast(){
  let city=new URLSearchParams(location.search).get("city")||"Delhi";let place;try{place=await geocode(city)}catch(e){place=demo}
  await renderForecast(place);
  document.getElementById("forecastSearch").onsubmit=async e=>{e.preventDefault();try{const p=await geocode(document.getElementById("forecastCity").value.trim());await renderForecast(p)}catch(err){document.getElementById("forecastStatus").textContent="City not found. Please try again."}}
}
async function renderForecast(place){let data;try{data=await getWeather(place)}catch(e){data=demo}document.getElementById("forecastStatus").textContent=`Showing forecast for ${place.name}, ${place.country||"Demo data"}`;const el=document.getElementById("dailyForecast");el.innerHTML=data.daily.time.map((d,i)=>{const wi=weatherInfo(data.daily.weather_code[i]);return `<div class="forecast-row"><div class="forecast-day">${i===0?"Today":formatDay(d)}</div><div class="weather-icon">${wi[0]}</div><div class="temps"><strong>${Math.round(data.daily.temperature_2m_max[i])}°</strong><span>${Math.round(data.daily.temperature_2m_min[i])}°</span></div><div class="forecast-condition">${wi[1]}</div><div class="forecast-metric">💧 ${data.daily.precipitation_probability_max[i]}% &nbsp; 🌬️ ${Math.round(data.daily.wind_speed_10m_max[i])} km/h</div></div>`}).join("")}
const cities=[["Delhi","India"],["Mumbai","India"],["Ludhiana","India"],["Bengaluru","India"],["London","United Kingdom"],["New York","United States"],["Tokyo","Japan"],["Dubai","United Arab Emirates"],["Singapore","Singapore"],["Sydney","Australia"],["Paris","France"],["Toronto","Canada"]];
async function initCities(){const grid=document.getElementById("cityGrid");const items=await Promise.all(cities.map(async c=>{try{const p=await geocode(c[0]);const d=await getWeather(p);return {n:p.name,c:c[1],t:Math.round(d.current.temperature_2m),code:d.current.weather_code}}catch(e){return {n:c[0],c:c[1],t:"--",code:0}}}));function render(filter=""){const shown=items.filter(x=>(x.n+" "+x.c).toLowerCase().includes(filter.toLowerCase()));document.getElementById("cityCount").textContent=`${shown.length} cities`;grid.innerHTML=shown.map(x=>{const w=weatherInfo(x.code);return `<div class="world-card" data-city="${esc(x.n)}"><div class="city-top"><div><div class="city-name">${esc(x.n)}</div><div class="country">${esc(x.c)}</div></div><span class="weather-icon">${w[0]}</span></div><div class="city-weather"><div><div class="city-temp">${x.t}°</div><div class="city-condition">${w[1]}</div></div><span>→</span></div></div>`}).join("");grid.querySelectorAll(".world-card").forEach(card=>card.onclick=()=>location.href=`index.html?city=${encodeURIComponent(card.dataset.city)}`)}render();document.getElementById("cityFilter").oninput=e=>render(e.target.value)}
const articleData={storm:["Climate","Why thunderstorms can develop so quickly","Thunderstorms can grow when warm, moist air rises into a more unstable layer of the atmosphere. Rising air cools, condensation forms clouds, and energy is released as water vapor changes phase.","Key idea: moisture + instability + lifting are three important ingredients for thunderstorm development."],heat:["Safety","Understanding heat-wave alerts","A heat wave is not just about one very hot afternoon. Forecasters consider how unusual the temperatures are for a location and how long the hot conditions persist. Humidity can also make it harder for the body to cool itself.","Practical idea: during very hot weather, follow local advisories and prioritize hydration, shade and cooler environments."],monsoon:["Seasonal","The science of monsoon rainfall","Monsoons are seasonal wind shifts associated with differences in heating between land and nearby oceans. These large-scale circulation changes can transport moisture and produce sustained rainy seasons.","Key idea: seasonal heating can reshape regional wind patterns and moisture transport."],wind:["Basics","What wind speed really means","Wind is air in motion. Its speed depends on pressure differences, terrain, weather systems and local effects such as buildings. A gust is a short-lived increase above the prevailing wind.","Practical idea: check both sustained wind and gust information when planning outdoor activities."]};
function initArticles(){const modal=document.getElementById("articleModal");document.querySelectorAll(".read-btn").forEach(b=>b.onclick=()=>{const d=articleData[b.dataset.article];document.getElementById("modalTag").textContent=d[0];document.getElementById("modalTitle").textContent=d[1];document.getElementById("modalText").textContent=d[2];document.getElementById("modalFact").textContent=d[3];modal.classList.add("open");modal.setAttribute("aria-hidden","false")});document.querySelector(".modal-close").onclick=()=>{modal.classList.remove("open");modal.setAttribute("aria-hidden","true")};modal.onclick=e=>{if(e.target===modal)document.querySelector(".modal-close").click()}}
function initContact(){document.getElementById("contactForm").onsubmit=e=>{e.preventDefault();document.getElementById("contactResult").textContent="✓ Thanks! Your message has been validated and recorded for this demo.";e.target.reset()}}
document.querySelector(".nav-toggle")?.addEventListener("click",()=>document.querySelector(".nav").classList.toggle("open"));
const page=document.body.dataset.page;
if(page==="home")initHome();
if(page==="forecast")initForecast();
if(page==="cities")initCities();
if(page==="articles")initArticles();
if(page==="contact")initContact();
