(() => {
  'use strict';
  const APP_ROOT = new URL('../', document.currentScript.src);
  const appUrl = path => new URL(path, APP_ROOT).toString();
  const CHIMAYOY = [1.2624081, -77.2850228];
  const BOUNDS = [[0.94, -77.55], [1.44, -77.05]];
  const monthNames = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const datasets = {};
  const metadata = {};
  let gridData = null;
  let humidityData = null;
  let charts = {main:null, season:null, anomaly:null};
  const el = id => document.getElementById(id);
  const mean = arr => arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : null;
  const fmt = n => Number(n).toLocaleString(activeLanguage==='en'?'en-US':'es-CO',{maximumFractionDigits:3});
  const configs = {
    precip_grid:{title:'Precipitación regional · cuadrícula 5×5',short:'Precipitación regional',unit:'mm/h',source:'GPM IMERG V07B · cuadrícula regional 5×5',grid:true,color:'#64b9e8'},
    precip:{title:'Precipitación acumulada mensual',short:'Precipitación mensual',unit:'mm/mes',source:'GPM IMERG 3IMERGM V07B',file:'gpm_monthly.json',color:'#42c5d4'},
    ndvi:{title:'Índice de vegetación NDVI',short:'NDVI',unit:'índice',source:'MODIS Terra MOD13Q1.061',file:'modis_ndvi_16day.json',color:'#9cdb78'},
    evi:{title:'Índice de vegetación EVI',short:'EVI',unit:'índice',source:'MODIS Terra MOD13Q1.061',file:'modis_evi_16day.json',color:'#67cfae'},
    temp:{title:'Temperatura superficial diurna',short:'LST diurna',unit:'°C',source:'MODIS Terra MOD11A2.061',file:'modis_lst_day_8day.json',color:'#f2a56f'},
    lstnight:{title:'Temperatura superficial nocturna',short:'LST nocturna',unit:'°C',source:'MODIS Terra MOD11A2.061',file:'modis_lst_night_8day.json',color:'#a9a2ed'},
    power_t2m:{title:'Temperatura del aire a 2 m',short:'Temperatura del aire',unit:'°C',source:'NASA POWER Point Monthly · MERRA-2',power:'T2M',color:'#f1b36c'},
    power_t2m_max:{title:'Temperatura máxima del aire a 2 m',short:'Temperatura máxima del aire',unit:'°C',source:'NASA POWER Point Monthly · MERRA-2',power:'T2M_MAX',color:'#e58f73'},
    power_t2m_min:{title:'Temperatura mínima del aire a 2 m',short:'Temperatura mínima del aire',unit:'°C',source:'NASA POWER Point Monthly · MERRA-2',power:'T2M_MIN',color:'#80b9df'},
    power_rh2m:{title:'Humedad relativa a 2 m',short:'Humedad relativa',unit:'%',source:'NASA POWER Point Monthly · MERRA-2',power:'RH2M',color:'#61c5c0'},
    power_precip:{title:'Precipitación corregida',short:'Precipitación NASA POWER',unit:'mm/día',source:'NASA POWER Point Monthly · MERRA-2',power:'PRECTOTCORR',color:'#4cb4db'},
    power_ws10m:{title:'Velocidad del viento a 10 m',short:'Velocidad del viento',unit:'m/s',source:'NASA POWER Point Monthly · MERRA-2',power:'WS10M',color:'#b2c4db'},
    power_solar:{title:'Radiación solar descendente',short:'Radiación solar',unit:'MJ/m²/día',source:'NASA POWER Point Monthly · CERES',power:'ALLSKY_SFC_SW_DWN',color:'#d9cb73'},
    soil_top:{title:'Humedad superficial del suelo (0–5 cm)',short:'Humedad superficial',unit:'fracción (1)',source:'NASA POWER · MERRA-2 · GWETTOP',humidity:'GWETTOP',color:'#83c9a7'},
    soil_root:{title:'Humedad de la zona radicular (0–100 cm)',short:'Humedad zona radicular',unit:'fracción (1)',source:'NASA POWER · MERRA-2 · GWETROOT',humidity:'GWETROOT',color:'#68bda2'},
    soil_profile:{title:'Humedad del perfil del suelo',short:'Humedad del perfil',unit:'fracción (1)',source:'NASA POWER · MERRA-2 · GWETPROF',humidity:'GWETPROF',color:'#9bc9a4'}
  };
  const chartBase = {
    responsive:true, maintainAspectRatio:false, interaction:{intersect:false,mode:'index'},
    plugins:{legend:{display:false},tooltip:{backgroundColor:'#101e32',padding:11,titleFont:{family:'Plus Jakarta Sans'},bodyFont:{family:'JetBrains Mono'}}},
    scales:{x:{grid:{display:false},ticks:{color:'#91a1b8',maxRotation:0,autoSkip:true,maxTicksLimit:12,font:{size:9}},border:{color:'#27364c'}},y:{grid:{color:'#26374d'},ticks:{color:'#91a1b8',font:{size:9}},border:{display:false}}}
  };
  const maps = {};
  let activeLanguage = 'en';
  const englishVariableNames={precip:['Monthly accumulated precipitation','Monthly precipitation'],precip_grid:['Regional precipitation · 5×5 grid','Regional precipitation'],ndvi:['NDVI vegetation index','NDVI'],evi:['EVI vegetation index','EVI'],temp:['Daytime land surface temperature','Daytime LST'],lstnight:['Nighttime land surface temperature','Nighttime LST'],power_t2m:['Air temperature at 2 m','Air temperature'],power_t2m_max:['Maximum air temperature at 2 m','Maximum air temperature'],power_t2m_min:['Minimum air temperature at 2 m','Minimum air temperature'],power_rh2m:['Relative humidity at 2 m','Relative humidity'],power_precip:['Corrected precipitation','NASA POWER precipitation'],power_ws10m:['Wind speed at 10 m','Wind speed'],power_solar:['Downward solar radiation','Solar radiation'],soil_top:['Surface soil wetness (0–5 cm)','Surface soil wetness'],soil_root:['Root-zone soil wetness (0–100 cm)','Root-zone wetness'],soil_profile:['Soil profile wetness','Profile wetness']};
  const monthsEN=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  function createSatelliteMap(id, zoom, withBounds=false) {
    const node=el(id); if(!node||!window.L)return null;
    const isHero=id==='hero-map';
    const map=L.map(id,{zoomControl:!isHero,scrollWheelZoom:false,attributionControl:true,worldCopyJump:true}).setView(isHero?[18,-35]:CHIMAYOY,isHero?2:zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{subdomains:'abc',maxZoom:19,attribution:'© OpenStreetMap contributors'}).addTo(map);
    if(!isHero){
      L.circleMarker(CHIMAYOY,{radius:6,color:'#f0f7ff',weight:2,fillColor:'#c8f36a',fillOpacity:1}).bindPopup('Centro de referencia · Chimayoy, Pasto, Nariño').addTo(map);
    }
    maps[id]=map;
    if(isHero){
      setTimeout(()=>map.flyTo(CHIMAYOY,14,{duration:4,easeLinearity:.22}),900);
    }
    return map;
  }
  ['hero-map','study-map','chimayoy-map','results-map'].forEach((id,i)=>createSatelliteMap(id,[2,14,14,14][i],i!==0));
  window.addEventListener('resize',()=>Object.values(maps).forEach(m=>m?.invalidateSize()));
  window.addEventListener('load',()=>requestAnimationFrame(()=>Object.values(maps).forEach(m=>m?.invalidateSize(true))));
  document.querySelectorAll('.risk-light[data-risk]').forEach(button=>button.addEventListener('click',()=>{const level=button.dataset.risk;document.querySelectorAll('.risk-light[data-risk]').forEach(b=>b.classList.toggle('active',b===button));document.querySelectorAll('[data-risk-description]').forEach(card=>card.classList.toggle('selected',card.dataset.riskDescription===level));}));
  const menuButton=document.querySelector('.menu-toggle'), nav=document.querySelector('.main-nav');
  menuButton?.addEventListener('click',()=>{const open=nav.classList.toggle('open');menuButton.setAttribute('aria-expanded',String(open));});
  nav?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('open');menuButton?.setAttribute('aria-expanded','false');}));

  function dateObj(raw){const d=new Date(`${String(raw).slice(0,10)}T00:00:00Z`);return Number.isNaN(d.getTime())?null:d;}
  function setEmpty(id,visible){el(id)?.classList.toggle('hidden',!visible);}
  function selectedSeries(){const id=el('variable-select').value;const mode=el('time-mode')?.value||'range';const start=Number(el('year-start').value),end=Number(el('year-end').value),year=mode==='year'||mode==='month'?start:null,month=Number(el('month-select')?.value||0);return (datasets[id]||[]).filter(d=>{const y=d.date.getUTCFullYear();const inYears=mode==='all'||(mode==='year'?y===year:y>=Math.min(start,end)&&y<=Math.max(start,end));return Number.isFinite(d.value)&&inYears&&(mode!=='month'||d.date.getUTCMonth()===month);});}
  function setStatus(message){if(el('file-status'))el('file-status').textContent=message;}
  function render(){
    const id=el('variable-select').value,cfg=configs[id],series=selectedSeries(),names=activeLanguage==='en'?(englishVariableNames[id]||[cfg.title,cfg.short]):[cfg.title,cfg.short],months=activeLanguage==='en'?monthsEN:monthNames;
    el('grid-point-control')?.classList.toggle('hidden',id!=='precip_grid');
    el('selected-variable-name').textContent=names[0];el('selected-variable-meta').textContent=`${cfg.source} · ${cfg.unit}`;
    el('chart-main-title').textContent=`${names[1]} · Chimayoy`;el('chart-source-label').textContent=`${cfg.source} · ${cfg.unit}`;
    el('series-title').textContent=activeLanguage==='en'?`Time series of ${names[1].toLowerCase()}`:`Evolución temporal de ${names[1].toLowerCase()}`;
    ['series-unit','season-unit','anomaly-unit'].forEach(x=>el(x).textContent=cfg.unit);
    el('record-count').textContent=series.length?(activeLanguage==='en'?`${series.length} VALID OBSERVATIONS`:`${series.length} OBSERVACIONES VÁLIDAS`):(activeLanguage==='en'?'NO OBSERVATIONS IN THIS PERIOD':'SIN OBSERVACIONES EN EL PERIODO');
    if(!series.length){Object.values(charts).forEach(c=>c?.destroy());charts={main:null,season:null,anomaly:null};['chart-empty','season-empty','anomaly-empty'].forEach(x=>setEmpty(x,true));
      el('data-summary').textContent=activeLanguage==='en'?(`There are no valid ${names[0].toLowerCase()} observations in the selected period. Available coverage may start after 2015 or include dates without valid data.`):(`No hay observaciones válidas de ${cfg.title} dentro del intervalo seleccionado. La cobertura disponible puede comenzar después de 2015 o contener fechas sin datos válidos.`);
      el('table-range').textContent='Sin datos';el('data-table-body').innerHTML=`<tr><td colspan="4">${activeLanguage==='en'?'No valid records for this selection.':'No hay registros válidos para esta selección.'}</td></tr>`;return;}
    const labels=series.map(d=>`${months[d.date.getUTCMonth()]} ${d.date.getUTCFullYear()}`),values=series.map(d=>d.value);
    const climatology=months.map((_,m)=>mean(series.filter(d=>d.date.getUTCMonth()===m).map(d=>d.value)));
    const anomalies=series.map(d=>climatology[d.date.getUTCMonth()]===null?null:d.value-climatology[d.date.getUTCMonth()]);
    const common=structuredClone(chartBase),mainOpts=structuredClone(common),seasonOpts=structuredClone(common),anomalyOpts=structuredClone(common);
    if(id==='precip'||id==='power_precip')mainOpts.scales.y.beginAtZero=true;
    Object.values(charts).forEach(c=>c?.destroy());
    const color=cfg.color;
    charts.main=new Chart(el('precip-chart'),{type:'line',data:{labels,datasets:[{data:values,borderColor:color,backgroundColor:color+'22',fill:true,tension:.22,pointRadius:1.8,pointHoverRadius:5,borderWidth:2,spanGaps:false}]},options:mainOpts});
    charts.season=new Chart(el('season-chart'),{type:'bar',data:{labels:months,datasets:[{data:climatology,backgroundColor:color+'bb',borderRadius:3,maxBarThickness:22}]},options:seasonOpts});
    charts.anomaly=new Chart(el('anomaly-chart'),{type:'bar',data:{labels,datasets:[{data:anomalies,backgroundColor:anomalies.map(v=>v===null?'#64748b':v>=0?'#72c9a3':'#df987e'),borderRadius:2,maxBarThickness:18}]},options:anomalyOpts});
    ['chart-empty','season-empty','anomaly-empty'].forEach(x=>setEmpty(x,false));
    const avg=mean(values),max=series.reduce((a,b)=>b.value>a.value?b:a,series[0]),min=series.reduce((a,b)=>b.value<a.value?b:a,series[0]);
    const nMissing=(datasets[id]||[]).filter(d=>d.date.getUTCFullYear()>=Math.min(Number(el('year-start').value),Number(el('year-end').value))&&d.date.getUTCFullYear()<=Math.max(Number(el('year-start').value),Number(el('year-end').value))).length-series.length;
    const meta=metadata[id]||{};
    const contextNote=id.startsWith('soil_')
      ?(activeLanguage==='en'
        ?'NASA POWER / MERRA-2 regional modeled/assimilated estimates; not in-situ measurements. GWET values are dimensionless wetness fractions, not volumetric water content and not SMAP observations.'
        :'Estimaciones regionales modeladas/asimiladas de NASA POWER / MERRA-2; no son mediciones in situ. Los valores GWET son fracciones adimensionales de humedad, no contenido volumétrico de agua ni observaciones SMAP.')
      :(meta.note||'');
    el('data-summary').textContent=activeLanguage==='en'?`${series.length} valid observations · ${series[0].date.toISOString().slice(0,10)} to ${series.at(-1).date.toISOString().slice(0,10)} · mean ${fmt(avg)} ${cfg.unit} · maximum ${fmt(max.value)} (${max.date.toISOString().slice(0,10)}) · minimum ${fmt(min.value)} (${min.date.toISOString().slice(0,10)}). ${nMissing>0?`${nMissing} records without valid values are retained as missing. `:''}${contextNote} Anomalies are calculated against the average for the same month within the selected period; they are descriptive and are not a trend test.`:`${series.length} observaciones válidas · ${series[0].date.toISOString().slice(0,10)} a ${series.at(-1).date.toISOString().slice(0,10)} · promedio ${fmt(avg)} ${cfg.unit} · máximo ${fmt(max.value)} (${max.date.toISOString().slice(0,10)}) · mínimo ${fmt(min.value)} (${min.date.toISOString().slice(0,10)}). ${nMissing>0?`${nMissing} registros sin valor válido se conservan como ausentes. `:''}${contextNote} Las anomalías se calculan respecto al promedio del mismo mes dentro del periodo seleccionado; son descriptivas y no equivalen a una prueba de tendencia.`;
    const live=el('interpretation-live');if(live){live.innerHTML=activeLanguage==='en'?`<span>READING: ${(englishVariableNames[id]||[cfg.title,cfg.short])[1].toUpperCase()}</span><p>The selected interval contains <b>${series.length}</b> valid observations, from <b>${series[0].date.toISOString().slice(0,10)}</b> to <b>${series.at(-1).date.toISOString().slice(0,10)}</b>. The mean is <b>${fmt(avg)} ${cfg.unit}</b>; the maximum is <b>${fmt(max.value)} ${cfg.unit}</b> (${max.date.toISOString().slice(0,10)}) and the minimum is <b>${fmt(min.value)} ${cfg.unit}</b> (${min.date.toISOString().slice(0,10)}). This describes the selected records; it is not a trend test and does not establish causality. ${contextNote}</p>`:`<span>LECTURA DE ${cfg.short.toUpperCase()}</span><p>En el intervalo consultado hay <b>${series.length}</b> observaciones válidas, entre <b>${series[0].date.toISOString().slice(0,10)}</b> y <b>${series.at(-1).date.toISOString().slice(0,10)}</b>. El promedio es <b>${fmt(avg)} ${cfg.unit}</b>; el máximo registrado es <b>${fmt(max.value)} ${cfg.unit}</b> (${max.date.toISOString().slice(0,10)}) y el mínimo es <b>${fmt(min.value)} ${cfg.unit}</b> (${min.date.toISOString().slice(0,10)}). Esta es una descripción de los registros seleccionados, no una prueba de tendencia ni evidencia de causalidad. ${contextNote}</p>`;}
    el('table-range').textContent=`${series[0].date.toISOString().slice(0,10)} – ${series.at(-1).date.toISOString().slice(0,10)}`;
    el('data-table-body').innerHTML=series.slice(-24).reverse().map(d=>{const a=climatology[d.date.getUTCMonth()]===null?null:d.value-climatology[d.date.getUTCMonth()];return `<tr><td>${d.date.toISOString().slice(0,10)}</td><td>${fmt(d.value)}</td><td>${cfg.unit}</td><td>${a===null?'—':fmt(a)}</td></tr>`;}).join('');
  }
  function register(id,records,meta={}){datasets[id]=(records||[]).map(r=>({date:dateObj(r.date),value:r.value===null||r.value===undefined?null:Number(r.value),status:r.status})).filter(r=>r.date);metadata[id]=meta;}
  function registerGridPoint(point){if(!point)return;register('precip_grid',point.records,{note:`Punto de cuadrícula regional ${point.lat.toFixed(3)}° N, ${Math.abs(point.lon).toFixed(3)}° O. Campo original precipitation en mm/h; no representa lluvia puntual medida en tierra.`});}
  function updateResultCards(){
    const host=el('result-summary-grid');if(!host)return;
    const ids=['precip','ndvi','evi','temp','lstnight','power_t2m','power_precip','soil_top','soil_root','soil_profile'];
    host.innerHTML=ids.map(id=>{
      const cfg=configs[id],all=datasets[id]||[],valid=all.filter(r=>Number.isFinite(r.value)).sort((a,b)=>a.date-b.date);
      if(!valid.length)return '';
      const vals=valid.map(r=>r.value),avg=mean(vals),min=valid.reduce((a,b)=>b.value<a.value?b:a,valid[0]),max=valid.reduce((a,b)=>b.value>a.value?b:a,valid[0]);
      const first=valid[0].date.toISOString().slice(0,7),last=valid.at(-1).date.toISOString().slice(0,7);
      let note=activeLanguage==='en'?'Descriptive summary of valid records; this is not a trend test.':'Resumen descriptivo de los registros válidos; no constituye una prueba de tendencia.';
      if(id==='precip')note=activeLanguage==='en'?'GPM provides regional context. The series begins in 2020 and retains five months without valid observations.':'GPM aporta contexto regional. La serie inicia en 2020 y conserva cinco meses sin observación válida.';
      if(id==='ndvi'||id==='evi')note=activeLanguage==='en'?'16-day MODIS product; only observations with Pixel Reliability = 0 were retained. The available series is discontinuous.':'Producto MODIS de 16 días; se conservaron únicamente observaciones con Pixel Reliability = 0. La serie disponible es discontinua.';
      if(id==='temp'||id==='lstnight')note=activeLanguage==='en'?'8-day MODIS product at 1 km. Very few valid pixels are available per date, so it is interpreted only as regional thermal context.':'Producto MODIS de 8 días a 1 km. La extracción dispone de muy pocos píxeles válidos por fecha, por lo que se interpreta solo como contexto térmico regional.';
      if(id.startsWith('power_'))note=activeLanguage==='en'?'NASA POWER is a regional modeled/assimilated product; it does not represent a weather station installed in Chimayoy.':'NASA POWER es un producto modelado/asimilado de escala regional; no representa una estación meteorológica instalada en Chimayoy.';
      if(id.startsWith('soil_'))note=activeLanguage==='en'?'NASA POWER / MERRA-2 regional modeled/assimilated estimates; not in-situ measurements. GWET values are dimensionless wetness fractions, not volumetric water content and not SMAP observations.':'Estimaciones regionales modeladas/asimiladas de NASA POWER / MERRA-2; no son mediciones in situ. Los valores GWET son fracciones adimensionales de humedad, no contenido volumétrico de agua ni observaciones SMAP.';
      return `<article><span>${cfg.source.toUpperCase()}</span><h3>${activeLanguage==='en'?(englishVariableNames[id]||[cfg.title,cfg.short])[1]:cfg.short}</h3><div class="result-kpis"><div><small>${activeLanguage==='en'?'OBSERVATIONS':'OBSERVACIONES'}</small><b>${valid.length}</b></div><div><small>${activeLanguage==='en'?'MEAN':'PROMEDIO'}</small><b>${fmt(avg)} <i>${cfg.unit}</i></b></div><div><small>${activeLanguage==='en'?'MINIMUM':'MÍNIMO'}</small><b>${fmt(min.value)} <i>${cfg.unit}</i></b><small>${min.date.toISOString().slice(0,10)}</small></div><div><small>${activeLanguage==='en'?'MAXIMUM':'MÁXIMO'}</small><b>${fmt(max.value)} <i>${cfg.unit}</i></b><small>${max.date.toISOString().slice(0,10)}</small></div></div><p class="result-coverage">${activeLanguage==='en'?'Observed coverage':'Cobertura observada'}: ${first} – ${last}</p><p>${note}</p><a href="#explorador" data-result-variable="${id}">${activeLanguage==='en'?'Open series in explorer':'Abrir serie en el explorador'} ↗</a></article>`;
    }).join('');
    host.querySelectorAll('[data-result-variable]').forEach(a=>a.addEventListener('click',()=>{const select=el('variable-select');if(select){select.value=a.dataset.resultVariable;el('time-mode').value='all';el('year-end').classList.add('hidden');el('year-until').classList.add('hidden');render();}}));
  }
  async function loadDatasets(){
    setStatus(activeLanguage==='en'?'Loading processed GPM, MODIS, NASA POWER and soil-wetness indicators…':'Cargando datos procesados de GPM, MODIS, NASA POWER e indicadores de humedad del suelo…');
    const base=appUrl('data/processed/');
    const tasks=Object.entries(configs).filter(([,c])=>c.file||c.power||c.grid||c.humidity);
    const responses=await Promise.all(tasks.map(async([id,c])=>{
      try{
        if(c.grid){const p=await fetch(base+'gpm_spatial_grid.json');if(!p.ok)throw new Error('GPM grid');gridData=await p.json();const select=el('gpm-grid-point');select.innerHTML=gridData.points.map(pt=>`<option value="${pt.lat},${pt.lon}">${pt.lat.toFixed(3)}° N · ${Math.abs(pt.lon).toFixed(3)}° O</option>`).join('');const central=gridData.points.find(pt=>Math.abs(pt.lat-1.25)<0.001&&Math.abs(pt.lon+77.25)<0.001)||gridData.points[0];select.value=`${central.lat},${central.lon}`;registerGridPoint(central);return id;}
        if(c.power){const p=await fetch(base+'nasa_power_monthly.json');if(!p.ok)throw new Error('POWER');const j=await p.json();const q=j.parameters[c.power];register(id,q.records,{note:`${q.interpretation}. Fuente regional modelada/asimilada; no corresponde a una estación local.`});return id;}
        if(c.humidity){if(!humidityData){const p=await fetch(base+'humidity_indicators.json');if(!p.ok)throw new Error('humidity indicators');humidityData=await p.json();}const q=humidityData.parameters[c.humidity];if(!q)throw new Error(`Missing humidity parameter: ${c.humidity}`);register(id,q.records,{note:`${q.interpretation} ${humidityData.spatial_support}`});return id;}
        const res=await fetch(base+c.file);if(!res.ok)throw new Error(c.file);const j=await res.json();register(id,j.records,{note:j.quality_note||j.qa||j.spatial_support||''});return id;
      }catch(e){console.warn('Dataset no cargado:',id,e);return null;}
    }));
    const ok=responses.filter(Boolean);
    if(!ok.length){
      if(el('file-status')) el('file-status').dataset.loadState='error';
      setStatus(activeLanguage==='en'
        ?'Data files could not be loaded. Run E.N.A. from its project folder using an HTTP server (for example: python -m http.server 8000), then open http://localhost:8000.'
        :'No fue posible cargar los archivos de datos. Ejecuta E.N.A. desde la carpeta del proyecto mediante un servidor HTTP (por ejemplo: python -m http.server 8000) y abre http://localhost:8000.');
    }else{
      setStatus(activeLanguage==='en'
        ?`${ok.length} series connected · GPM, MODIS, NASA POWER and MERRA-2 soil-wetness indicators. SMAP remains a separate complementary source under processing.`
        :`${ok.length} series conectadas · GPM, MODIS, NASA POWER e indicadores de humedad del suelo MERRA-2. SMAP permanece como fuente complementaria independiente en procesamiento.`);
    }
    updateResultCards();render();
  }
  async function loadCatalog(){
    try{const r=await fetch(appUrl('data/manifest.json'));if(!r.ok)return;const m=await r.json();const host=el('dataset-status-grid');if(!host)return;
      host.innerHTML=m.datasets.filter(d=>!['landsat','uav'].includes(d.id)).map(d=>{const status=activeLanguage==='en'?(d.status==='integrated'?'Integrated':d.status==='integrated_context'?'Context data':d.status==='integrated_qa_filtered'?'Integrated · QA filtered':d.status==='processing'?'Complementary source · processing':'Not yet available'):(d.status==='integrated'?'Integrado':d.status==='integrated_context'?'Contexto integrado':d.status==='integrated_qa_filtered'?'Integrado · QA':d.status==='processing'?'Fuente complementaria · en procesamiento':'No disponible todavía');const labels={gpm:'GPM IMERG 3IMERGM V07B',gpm_grid:'GPM IMERG grid 5×5',power:'NASA POWER Point Monthly',ndvi:'MODIS MOD13Q1 NDVI',evi:'MODIS MOD13Q1 EVI',lst_day:'MODIS MOD11A2 LST Day',lst_night:'MODIS MOD11A2 LST Night',smap:'SMAP L4 SPL4SMGP.008',soil_wetness:'NASA POWER / MERRA-2 soil-wetness indicators'};const caveats={gpm:'Regional grid cell; it does not resolve parcel-scale variability.',gpm_grid:'Regional 5×5 grid; original precipitation field in mm/h, shown separately from zonal averages.',power:'Regional modeled/assimilated data; not a local weather station.',ndvi:'Only pixels with Reliability = 0; dates without valid pixels are omitted.',evi:'Only pixels with Reliability = 0; dates without valid pixels are omitted.',lst_day:'Mandatory QA bits = 00; 1 km data provide regional thermal context.',lst_night:'Mandatory QA bits = 00; coverage is reduced because matching QC rasters are unavailable.',smap:'AppEEARS extraction is still processing; data will be integrated after download and validation.',soil_wetness:'GWETTOP, GWETROOT and GWETPROF are regional dimensionless wetness fractions from MERRA-2; not in-situ measurements, volumetric moisture content or SMAP.'};const n=d.observed!==undefined?`${d.observed} ${activeLanguage==='en'?'valid':'válidos'} / ${d.records} ${activeLanguage==='en'?'months':'meses'}`:d.records?`${d.records} ${activeLanguage==='en'?'records':'registros'}`:(activeLanguage==='en'?'No records':'Sin registros');return `<article class="dataset-status-card"><span>${status}</span><b>${activeLanguage==='en'?(labels[d.id]||d.name):d.name}</b><small>${n}${d.coverage?' · '+d.coverage:''}</small><p>${activeLanguage==='en'?(caveats[d.id]||d.caveat||''):(d.caveat||'')}</p></article>`;}).join('');
    }catch(e){console.warn('No se pudo cargar el manifiesto',e);}
  }
  async function addGeospatialLayers(){
    try{
      const r=await fetch(appUrl('data/processed/chimayoy_cadastral_reference.geojson'));
      if(r.ok){
        const gj=await r.json();
        ['study-map','results-map','chimayoy-map'].forEach(id=>{
          if(!maps[id])return;
          const polygon=L.geoJSON(gj,{style:{color:'#c8f36a',weight:3,fillColor:'#c8f36a',fillOpacity:.20,dashArray:'5 4'}})
            .bindPopup('Polígono catastral de referencia · aproximadamente 49,10 ha · no certifica el límite institucional del parque');
          polygon.addTo(maps[id]);
          maps[id].fitBounds(polygon.getBounds(),{padding:[35,35],maxZoom:16});
        });
      }
    }catch(e){console.warn('Geometría de referencia no disponible',e);}
    try{
      const r=await fetch(appUrl('data/processed/gpm_spatial_grid.json'));
      if(r.ok){const g=await r.json();const layer=L.layerGroup();g.points.forEach(p=>L.circleMarker([p.lat,p.lon],{radius:4,color:'#45c5d2',weight:1,fillColor:'#45c5d2',fillOpacity:.8}).bindPopup(`Centro de celda GPM · ${p.lat.toFixed(3)}, ${p.lon.toFixed(3)} · cuadrícula regional 5×5`).addTo(layer));if(maps['results-map'])layer.addTo(maps['results-map']);}
    }catch(e){console.warn('Cuadrícula GPM no disponible',e);}
  }
  function parseDate(row){const raw=row.date||row.time||row.datetime||row.fecha||row.month||row.mes||row.year_month||row.ym;if(!raw)return null;const d=dateObj(raw);return d?new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),1)):null;}
  function getNumber(row,keys){for(const key of keys){if(row[key]!==undefined&&row[key]!==''&&row[key]!==null){let n=Number(String(row[key]).replace(',','.'));if(Number.isFinite(n)){if(['NDVI','EVI','ndvi','evi'].includes(key)&&Math.abs(n)>1)n*=.0001;if(['LST_Day_1km','lst_day_1km'].includes(key))n=n*.02-273.15;return n;}}}return null;}
  ['variable-select','year-start','year-end','month-select','time-mode'].forEach(id=>el(id)?.addEventListener('change',()=>{const mode=el('time-mode')?.value||'range';el('year-start').classList.toggle('hidden',mode==='all');el('year-end').classList.toggle('hidden',mode!=='range');el('year-until').classList.toggle('hidden',mode!=='range');el('month-select').classList.toggle('hidden',mode!=='month');render();}));
  el('gpm-grid-point')?.addEventListener('change',()=>{if(!gridData)return;const [lat,lon]=el('gpm-grid-point').value.split(',').map(Number);registerGridPoint(gridData.points.find(p=>p.lat===lat&&p.lon===lon));render();});
  el('year-start')?.addEventListener('change',()=>{if(Number(el('year-start').value)>Number(el('year-end').value))el('year-end').value=el('year-start').value;render();});
  el('year-end')?.addEventListener('change',()=>{if(Number(el('year-end').value)<Number(el('year-start').value))el('year-start').value=el('year-end').value;render();});

  const translations={
    en:{nav:['Introduction','Scientific context','Problem','Exploration system','Chimayoy','Satellite data','Results','Team','Explore data'],
      heroLead:'E.N.A. combines satellite observation, environmental trend analysis and complementary ground observation to study changes in the Earth system in Chimayoy, Nariño.',
      heroFormal:'ENVIRONMENTAL RESEARCH · CHIMAYOY, NARIÑO',
      heroButton:'Explore the research',heroCase:'View the study area',
      introTitle:'Understanding territorial change through <em>evidence.</em>',
      introLarge:'Territories change through environmental processes reflected in water availability, vegetation behavior and surface thermal conditions.',
      contextTitle:'The environment functions as an <em>interconnected system.</em>',
      problemTitle:'How can we distinguish a fluctuation from a <em>persistent change?</em>',
      dataTitle:'A window<br>into the data.', explorerTitle:'Explore environmental<br>signals.',
      explorerLead:'Select a variable and consult all available records, a specific year or month. Compare periods, explore charts and download the filtered series with its metadata.',
      resultsTitle:'What do the <em>environmental time series</em> tell us?',
      language:'Language'},
    es:{nav:['Introducción','Contexto científico','Problema','Sistema de exploración','Chimayoy','Datos satelitales','Resultados','Equipo','Explorar datos'],
      heroLead:'E.N.A. integra observación satelital, análisis de tendencias ambientales y observación terrestre complementaria para estudiar los cambios del sistema terrestre en Chimayoy, Nariño.',
      heroFormal:'INVESTIGACIÓN AMBIENTAL · CHIMAYOY, NARIÑO',heroButton:'Conocer la investigación',heroCase:'Ver caso de estudio',
      introTitle:'Comprender los cambios del territorio a partir de <em>evidencia.</em>',
      introLarge:'Los territorios cambian a través de procesos ambientales que se manifiestan en la disponibilidad de agua, el comportamiento de la vegetación y las condiciones térmicas de la superficie.',
      contextTitle:'El ambiente funciona como un sistema <em>interconectado.</em>',
      problemTitle:'¿Cómo distinguir una fluctuación de un <em>cambio persistente?</em>',
      dataTitle:'Una ventana<br>hacia los datos.',explorerTitle:'Explorar las señales<br>ambientales.',
      explorerLead:'Selecciona una variable y consulta todos sus registros disponibles, un año o un mes específico. Puedes comparar periodos, explorar las gráficas y descargar la serie filtrada junto con sus metadatos.',
      resultsTitle:'Qué nos cuentan las <em>series ambientales.</em>',language:'Idioma'}
  };
  const headingTranslations={"Explorar para comprender.": "Explore to understand.", "Comprender los cambios del territorio a partir de evidencia.": "Understanding territorial change through <em>evidence.</em>", "El ambiente funciona como un sistema interconectado.": "The environment functions as an <em>interconnected system.</em>", "Precipitación": "Rainfall", "Humedad superficial del suelo": "Surface soil moisture", "Estado de la vegetación": "Vegetation condition", "Temperatura superficial": "Land surface temperature", "Una variable describe una parte del sistema; su análisis conjunto aporta contexto.": "One variable describes one part of the system; joint analysis provides context.", "Del patrón regional a los puntos críticos.": "From regional patterns to local points of interest.", "¿Cómo distinguir una fluctuación de un cambio persistente?": "How can we distinguish a fluctuation from a <em>persistent change?</em>", "Integrar observaciones satelitales y análisis estadístico en una investigación territorial.": "Integrating satellite observations and statistical analysis into territorial research.", "¿Qué está cambiando?": "What is changing?", "¿Dónde está cambiando?": "Where is it changing?", "¿Cuánto está cambiando?": "How much is it changing?", "¿Es significativo?": "Is the change significant?", "De la observación a una conclusión sustentada.": "From observation to a supported conclusion.", "Exploración aérea con análisis visual.": "Aerial exploration with visual analysis.", "Vehículos aéreos no tripulados": "Uncrewed aerial vehicles", "Visión por computador": "Computer vision", "Inteligencia artificial": "Artificial intelligence", "Convertir la información visual en apoyo para la navegación.": "Turning visual information into navigation support.", "Una secuencia de interpretación.": "An interpretation workflow.", "Construcción del conjunto de datos": "Dataset construction", "Procesamiento visual": "Visual processing", "Detección y clasificación": "Detection and classification", "Evaluación del entorno": "Environmental assessment", "Recomendaciones y registro": "Recommendations and logging", "Cuatro categorías para describir la escena.": "Four categories for describing the scene.", "Zona segura": "Safe area", "Obstáculo": "Obstacle", "Zona con agua": "Water area", "Sin clasificar": "Unclassified", "Del fotograma al registro.": "From frame to record.", "Un historial estructurado para cada misión.": "A structured log for every mission.", "Chimayoy: del sistema al territorio.": "Chimayoy: from system to territory.", "De los registros históricos a escenarios futuros.": "From historical records to <em>future scenarios.</em>", "Un territorio real. Una investigación situada.": "A real territory. A place-based study.", "Una ventana hacia los datos.": "A window into the data.", "Humedad del suelo": "Soil moisture", "Vegetación": "Vegetation", "Temperatura de superficie": "Surface temperature", "Condiciones atmosféricas": "Atmospheric conditions", "Del producto global a un área concreta.": "From global products to a defined area.", "Explorar las señales ambientales.": "Explore environmental signals.", "Evolución mensual de precipitación": "Monthly precipitation trend", "Comportamiento por mes": "Monthly pattern", "Anomalías respecto a climatología": "Anomalies relative to climatology", "Observaciones de la serie": "Time-series observations", "Consulta y descarga los archivos.": "Explore and download the files.", "Qué nos cuentan las series ambientales.": "What do the environmental time series tell us?", "Preparando lectura descriptiva": "Preparing descriptive insights", "Equipo de trabajo": "Research team", "Fuentes científicas y documentación técnica": "Scientific sources and technical documentation", "Conectar tecnología, datos y territorio.": "Connecting technology, data and territory."};
  function setLanguage(lang){const t=translations[lang]||translations.en;activeLanguage=lang;document.documentElement.lang=lang;
    document.title=lang==='en'?'E.N.A. | Environmental Research and Observation':'E.N.A. | Investigación y observación ambiental';
    const description=document.querySelector('meta[name="description"]');
    if(description)description.content=lang==='en'?'E.N.A. combines environmental trend analysis, satellite observation and complementary ground exploration in Chimayoy, Pasto, Nariño.':'E.N.A. integra análisis de tendencias ambientales, observación satelital y exploración terrestre complementaria en Chimayoy, Pasto, Nariño.';
    document.querySelector('.language-switch')?.setAttribute('aria-label',lang==='en'?'Language':'Idioma');
    document.querySelector('.main-nav')?.setAttribute('aria-label',lang==='en'?'Main navigation':'Navegación principal');
    document.querySelector('.menu-toggle')?.setAttribute('aria-label',lang==='en'?'Open navigation':'Abrir navegación');
    const navLinks=[...document.querySelectorAll('.main-nav a')];navLinks.forEach((a,i)=>{if(t.nav[i]!==undefined)a.innerHTML=t.nav[i]+(i===8?' <span>↗</span>':'');});
    const english={
      '.hero-lead':t.heroLead,'.project-formal-title':t.heroFormal,'.button-primary':t.heroButton+' <span>↓</span>','.quiet-link':t.heroCase+' <span>↗</span>',
      '.intro-title-block h2':t.introTitle,'.large-copy':t.introLarge,'.context-heading h2':t.contextTitle,'.problem-statement h2':t.problemTitle,
      '.satellite-section .section-heading h2':t.dataTitle,'.charts-section .section-heading h2':t.explorerTitle,'.charts-section .section-heading p':t.explorerLead,'.interpretation-heading h2':t.resultsTitle,
      '.context-heading > p':'Rainfall, soil moisture, vegetation and land surface temperature describe different components of the Earth system. Their joint analysis helps explore temporal patterns without assuming causal relationships.',
      '.intro-text p:nth-of-type(2)':'Recognizing these changes requires looking beyond a single image or measurement. Records from different dates must be combined, consistent analysis criteria maintained, and the evolution of each variable examined. Satellite observation makes it possible to study broad areas and build time series to identify patterns, deviations and possible trends.',
      '.intro-text p:nth-of-type(3)':'E.N.A. was developed for the NASA Space Apps Challenge 2026. Its research focuses on Chimayoy, Nariño, and aims to turn Earth observation information into understandable, verifiable results for interpreting environmental dynamics in the study area.',
      '.context-synthesis h3':'One variable describes one part of the system; joint analysis provides context.',
      '.context-synthesis > p':'The series are examined individually first, respecting their units, spatial resolutions and observation frequencies. Their anomalies and periods of variation are then compared to identify temporal coincidences worth interpreting. A statistical coincidence alone does not demonstrate causality.',
      '.drone-integration-copy h3':'From regional patterns to local points of interest.',
      '.drone-integration-copy p:first-of-type':'The research plans to incorporate a drone as a platform for collecting information in selected areas of Chimayoy. Its georeferenced images and records could provide local detail to document visible ground conditions and support the spatial interpretation of satellite products.',
      '.drone-integration-copy p:last-of-type':'This integration requires matching location, date and observation type. An RGB camera documents visible features but does not directly measure soil moisture or land surface temperature; those variables require dedicated sensors. The drone therefore complements satellite observation rather than replacing product-specific scientific measurements.',
      '.map-data-copy h2':'From global products<br>to a defined area.',
      '.map-data-copy > p':'The map displays the cadastral reference geometry used for extraction and the Chimayoy reference location. The polygon covers approximately 49.10 ha and serves as an operational study boundary; it is not a certification of the Environmental Center’s full institutional perimeter.',
      '.download-center h3':'Explore and download the files.',
      '.download-center p':'Files are available in original or processed formats. Check the manifest for source, units, coverage and limitations before reuse.',
      '.chart-guide summary':'How should these charts be read?',
      '.interpretation-heading > p':'This section summarizes the processed observations currently available. Descriptive indicators update when a variable is selected in the explorer; they do not replace statistical trend tests or demonstrate causal relationships.',
      '.interpretation-caution > span':'INTERPRETATION CRITERIA',
      '.interpretation-caution p':'Observations are interpreted according to their units, resolution, frequency and quality controls. GPM and NASA POWER provide regional context; MODIS NDVI/EVI and LST represent satellite products at different spatial scales. The geometry is an operational cadastral reference, not a certification of the park’s institutional perimeter.'
    };
    // Translate section labels by their original text, never by DOM position.
    const sectionLabelEN={
      'INTRODUCCIÓN · OBSERVACIÓN Y CAMBIO AMBIENTAL':'INTRODUCTION · OBSERVING ENVIRONMENTAL CHANGE',
      'CONTEXTO CIENTÍFICO · VARIABLES Y ESCALAS DE OBSERVACIÓN':'SCIENTIFIC CONTEXT · VARIABLES AND OBSERVATION SCALES',
      'PLANTEAMIENTO DEL PROBLEMA · NASA SPACE APPS CHALLENGE 2026':'PROBLEM STATEMENT · NASA SPACE APPS CHALLENGE 2026',
      'CONTEXTO TERRITORIAL · JUSTIFICACIÓN DEL ÁREA PILOTO':'TERRITORIAL CONTEXT · PILOT AREA RATIONALE',
      'INVESTIGACIÓN · SISTEMA DE EXPLORACIÓN':'RESEARCH · EXPLORATION SYSTEM',
      'ANÁLISIS COMPLEMENTARIO · ESCENARIOS DE PRECIPITACIÓN':'COMPLEMENTARY ANALYSIS · PRECIPITATION SCENARIOS',
      'METODOLOGÍA DE ANÁLISIS':'ANALYSIS METHODOLOGY',
      'CLASIFICACIÓN DEL ENTORNO':'ENVIRONMENT CLASSIFICATION',
      'ARQUITECTURA GENERAL':'SYSTEM ARCHITECTURE',
      'APLICACIÓN DEL ANÁLISIS AMBIENTAL':'ENVIRONMENTAL ANALYSIS IN PRACTICE',
      'REGISTRO VISUAL · CONTEXTO DEL ÁREA PILOTO':'VISUAL RECORD · PILOT AREA CONTEXT',
      'OBSERVACIÓN SATELITAL Y VARIABLES':'SATELLITE OBSERVATION AND VARIABLES',
      'FILTRO GEOGRÁFICO':'SPATIAL FILTER · STUDY AREA',
      'EXPLORADOR DE DATOS · SERIES Y GRÁFICOS':'DATA EXPLORER · TIME SERIES AND CHARTS',
      'RESULTADOS E INTERPRETACIÓN · LECTURA DE LOS DATOS':'RESULTS AND INTERPRETATION · DATA INSIGHTS',
      'EQUIPO DE INVESTIGACIÓN':'RESEARCH TEAM',
      'REFERENCIAS Y DOCUMENTACIÓN':'REFERENCES AND DOCUMENTATION'
    };
    document.querySelectorAll('.section-label').forEach(node=>{
      if(!node.dataset.langOriginalHTML) node.dataset.langOriginalHTML=node.innerHTML;
      const original=node.dataset.langOriginalHTML;
      const number=original.match(/^\s*(<span[^>]*>.*?<\/span>)/i)?.[1]||'';
      const label=original.replace(/^\s*<span[^>]*>.*?<\/span>/i,'').replace(/<[^>]*>/g,' ').replace(/&nbsp;/gi,' ').replace(/\s+/g,' ').trim();
      node.innerHTML=lang==='en'&&sectionLabelEN[label]?(number?number+' ':'')+sectionLabelEN[label]:node.dataset.langOriginalHTML;
    });
    Object.entries(english).forEach(([selector,value])=>{const n=document.querySelector(selector);if(!n)return;if(!n.dataset.originalHtml)n.dataset.originalHtml=n.innerHTML;n.innerHTML=lang==='en'?value:n.dataset.originalHtml;});
    const variableCards=[['Rainfall','Water supplied from the atmosphere. Its time series helps identify wet and dry periods and deviations from typical monthly behavior.','GPM IMERG · mm/month'],['Surface soil moisture','An estimate of water stored in the soil. It provides context on the land response to rainfall at the pixel scale.','SMAP · m³/m³ · complementary source'],['Vegetation condition','Spectral indices used to study changes in vegetation activity and cover, applying quality controls.','MODIS · NDVI / EVI'],['Land surface temperature','Radiometric temperature of the land surface; it is not equivalent to air temperature measured at a weather station.','MODIS · °C']];
    document.querySelectorAll('.variable-card').forEach((card,i)=>{const d=variableCards[i];if(!d)return;const h=card.querySelector('h3'),p=card.querySelector('p'),sm=card.querySelector('.variable-card-copy small');[h,p,sm].forEach(n=>{if(n&&!n.dataset.originalHtml)n.dataset.originalHtml=n.innerHTML;});if(lang==='en'){h.textContent=d[0];p.textContent=d[1];sm.textContent=d[2];}else{h.innerHTML=h.dataset.originalHtml;p.innerHTML=p.dataset.originalHtml;sm.innerHTML=sm.dataset.originalHtml;}});
    const translateNodes=(selector,values)=>document.querySelectorAll(selector).forEach((n,i)=>{if(!n.dataset.originalHtml)n.dataset.originalHtml=n.innerHTML;if(lang==='en'&&values[i]!==undefined)n.innerHTML=values[i];else n.innerHTML=n.dataset.originalHtml;});
    translateNodes('.research-card h3',['Uncrewed aerial vehicles','Computer vision','Artificial intelligence']);

translateNodes('.drone-section .section-heading > p', [
  'Satellite research is complemented by an independent aerial exploration application. This module integrates 3D drone visualization, mission information, traffic-light indicators for observed conditions, and artificial intelligence tools to support operation and decision-making during exploration. Its purpose is to provide a close-range perspective of the terrain that complements, without replacing, satellite-based environmental observation.'
]);

    translateNodes('.research-card p',['UAVs enable remote observation, expand reconnaissance coverage and collect visual information in hard-to-access areas.','Algorithms process images to identify objects, recognize patterns and extract relevant features from each scene.','Detection models locate relevant elements and provide structured information to assess the observed environment.']);
    // Complete translations for the existing drone subsystem and projection module.
    translateNodes('.research-detail .detail-copy p',['The application brings together a 3D view of the drone, navigation support elements, visual classification through traffic-light indicators, and artificial intelligence assistance. This component expands local reconnaissance capabilities and can help document areas that may require a more detailed review. Its results should be interpreted according to the sensors, data and functions actually implemented.']);
    translateNodes('.research-detail .detail-quote > span',['GENERAL OBJECTIVE']);
    translateNodes('.research-detail .detail-quote p',['Design a visual analysis subsystem based on image processing and artificial intelligence to interpret the environment captured by a drone and generate navigation recommendations by identifying risk conditions.']);
    translateNodes('.research-detail .drone-access-row .project-access-button',['Open aerial exploration application']);
    translateNodes('.forecast-section .section-label',['COMPLEMENTARY ANALYSIS · PRECIPITATION SCENARIOS']);
    translateNodes('.forecast-copy .eyebrow',['WHAT COULD HAPPEN?']);
    translateNodes('.forecast-copy > p:not(.eyebrow)',[
      'The complementary analysis page incorporates precipitation projections for 2025–2035, built from historical records. This component extends E.N.A.’s temporal perspective: while the main research describes and assesses the behavior observed in historical sources, the projections explore possible continuities or changes under the method and assumptions used.',
      'The projections should not be confused with operational weather forecasts or certainty about rainfall on a specific date. Their interpretation depends on the historical series, the statistical procedure, the assumptions and the model uncertainty. For this reason, E.N.A. presents them as a complementary module, not as a substitute for observed results.'
    ]);
    translateNodes('.forecast-panel .forecast-range',['PROJECTION HORIZON']);
    translateNodes('.forecast-panel > p',['Precipitation · estimates based on historical data','Future scenarios are kept separate from the 2015–2025 retrospective analysis.']);
    translateNodes('.forecast-panel .project-access-button',['Access precipitation projections']);
    translateNodes('.architecture-node b',['Image capture','Visual processing','Detection','Assessment','Logging']);
    translateNodes('.architecture-node small',['RGB camera','OpenCV','YOLOv8','Risk criteria','CSV history']);
    translateNodes('.tools-line > span',['ENVIRONMENT AND TOOLS']);
    translateNodes('.event-record .eyebrow',['TRACEABILITY']);
    translateNodes('.event-record > div:first-child p',['Consolidated events make it possible to build indicators for objects, obstacles and risk areas identified during exploration.']);
    translateNodes('.event-fields > span',['RECORDED DATA']);
    translateNodes('.event-fields > b',['Date and time','Identified object or element','Confidence level','Associated status','Classification and observations']);
    translateNodes('.problem-answer h3',['Integrating satellite observations and statistical analysis into territorial research.']);
    translateNodes('.problem-answer p',['E.N.A. follows a workflow that selects Earth observation products, defines the Chimayoy study area, organizes records into time series and analyzes their behavior. For each variable, the source, unit, resolution, frequency and quality criteria are documented before statistics are calculated.','The platform makes it possible to explore maps, consult tables and visualize temporal evolution, seasonal cycles and anomalies. Trend direction and magnitude are estimated with appropriate statistical methods; significance is assessed while considering seasonality, autocorrelation and data availability.','Information collected by the drone will be incorporated as complementary observations at selected points, with spatial and temporal metadata to relate it to the scale of satellite products.']);
    translateNodes('.research-questions h3',['What is changing?','Where is it changing?','How much is it changing?','Is the change significant?']);
    translateNodes('.research-questions p',['Identify variables showing variations, anomalies or trends in their time series.','Examine the spatial distribution of records within the study area while respecting each product’s resolution.','Estimate the magnitude and direction of variation using the variable’s units and interpretable rates of change.','Evaluate statistical evidence for trends and report uncertainty alongside analytical limitations.']);
    translateNodes('.problem-method h3',['From observation to a supported conclusion.']);
    translateNodes('.method-steps li',['<b>Select:</b> identify suitable satellite products for each variable and document their technical characteristics.','<b>Define:</b> extract observations corresponding to Chimayoy and preserve the spatial reference of the pixels used.','<b>Prepare:</b> apply quality controls, review units, manage missing data and harmonize series to an appropriate analysis frequency.','<b>Analyze:</b> describe variability, calculate climatologies and anomalies, estimate trends and apply significance tests when assumptions are met.','<b>Compare:</b> relate satellite results to local drone observations when available and comparable by location, date and variable.','<b>Communicate:</b> present maps, charts, tables and interpretations addressing the challenge questions.']);
    translateNodes('.workflow-list article h3',['Build the dataset','Visual processing','Detection and classification','Environment assessment','Recommendations and logging']);
    translateNodes('.workflow-list article p',['Organize representative images according to conditions observed in exploration environments.','Prepare images with OpenCV through acquisition, normalization and operations that support later analysis.','Identify people, vehicles, animals and relevant objects using YOLOv8 and Ultralytics.','Interpret detected elements and assign a risk level using defined criteria.','Generate navigation guidance and store events for later review.']);
    translateNodes('.category-card h3',['Safe area','Obstacle','Water area','Unclassified']);
    translateNodes('.category-card p',['Open areas, clear paths or spaces with sufficient room for movement.','Trees, rocks, structures, poles and other elements that may restrict the flight path.','Rivers, ponds, flooding or water accumulation requiring attention during exploration.','Images that have not yet been labeled or whose category requires validation.']);
    translateNodes('.architecture-node b',['Image capture','Visual processing','Detection','Assessment','Log']);
    translateNodes('.architecture-node small',['RGB camera','OpenCV','YOLOv8','Risk rules','CSV history']);
    translateNodes('.chimayoy-copy > p:not(.eyebrow)',['Chimayoy, near Pasto in Nariño, is the pilot area for E.N.A.’s environmental research. This location makes it possible to define satellite product queries and study the evolution of variables related to water, vegetation and land surface thermal conditions.','Satellite analysis is the foundation of the research. Drone-based ground observation is proposed as a complementary resource to document selected points of interest and add local detail to the interpretation of regional patterns.']);
    translateNodes('.photo-story-head p',['Photographs document the surroundings of the Chimayoy Environmental Center and provide context for the study area. They are not satellite imagery and are not used as quantitative measurements.']);
    translateNodes('.photo-grid figcaption b',['Chimayoy Environmental Center','Aerial view of the surroundings','Environmental Center entrance','Access path','Facilities and surroundings']);
    translateNodes('.photo-grid figcaption span',['Reference photograph provided to the project','Shared reference image; author mark retained','Υ.Γ. · Wikimedia Commons · CC BY-SA 4.0','Υ.Γ. · Wikimedia Commons · CC BY-SA 4.0','Υ.Γ. · Wikimedia Commons · CC BY-SA 4.0']);
    translateNodes('.source-card h3',['Rainfall','Soil moisture','Vegetation','Land surface temperature','Atmospheric conditions']);
    translateNodes('.source-card p',['Monthly GPM IMERG · NASA','SMAP · NASA','MODIS Terra · NDVI / EVI','MODIS Terra · MOD11A2 V061','NASA POWER Point Monthly · 2015–2025']);
    translateNodes('.source-status',['INTEGRATED · 63 VALID / 5 MISSING','COMPLEMENTARY SOURCE · EXTRACTION PROCESSING','INTEGRATED · 63 VALID DATES PER INDEX','INTEGRATED · 97 DAY / 59 NIGHT','INTEGRATED METEOROLOGICAL CONTEXT']);
    translateNodes('.satellite-note p',['The map layer provides satellite imagery for visual orientation of the study area. Quantitative charts are calculated from downloaded scientific files filtered by coordinates; satellite imagery does not replace numerical data.']);
    translateNodes('.photo-credit',['External photographs: Υ.Γ., Centro Ambiental Chimayoy, access and museum, Wikimedia Commons, CC BY-SA 4.0. Attribution and share-alike terms are retained.']);
    translateNodes('.risk-explain b',['Low risk','Moderate risk','High risk']);
    translateNodes('.risk-explain small',['Continue exploration when conditions have been verified.','Proceed with caution and review the flight path.','Stop or reassess the route before continuing.']);
    translateNodes('.recommendation-row span',['SYSTEM RESPONSE']);
    translateNodes('.recommendation-row b',['Proceed','Caution','Avoid','Reroute','Stop']);
    translateNodes('.download-links a',['GPM IMERG · Processed series <span>JSON ↓</span>','GPM · Regional grid <span>JSON ↓</span>','MODIS · NDVI <span>JSON ↓</span>','MODIS · EVI <span>JSON ↓</span>','MODIS · Daytime LST <span>JSON ↓</span>','MODIS · Nighttime LST <span>JSON ↓</span>','NASA POWER · Monthly series <span>JSON ↓</span>','Reference polygon <span>GeoJSON ↓</span>','Data manifest <span>JSON ↓</span>','GPM · Monthly series CSV <span>CSV ↓</span>','GPM · Grid CSV <span>CSV ↓</span>','NASA POWER · Original CSV <span>CSV ↓</span>','Full research document <span>DOCX ↓</span>','Data audit <span>XLSX ↓</span>']);
    translateNodes('.download-center .eyebrow',['PROJECT OPEN DATA']);
    translateNodes('.file-button-wide',['View and download files <span>↓</span>']);
    translateNodes('.quick-downloads summary',['Download datasets']);
    translateNodes('.quick-downloads a',['GPM IMERG · monthly <span>JSON ↓</span>','MODIS · NDVI <span>JSON ↓</span>','MODIS · EVI <span>JSON ↓</span>','MODIS · daytime LST <span>JSON ↓</span>','MODIS · nighttime LST <span>JSON ↓</span>','NASA POWER <span>JSON ↓</span>','Reference polygon <span>GEOJSON ↓</span>']);
    translateNodes('.team-index',['TEAM MEMBER','TEAM MEMBER','TEAM MEMBER']);
    translateNodes('.team-degree',['Electronic Engineering · Seventh semester','Electronic Engineering · Tenth semester','Systems Engineering · Fourth semester']);
    translateNodes('.team-affiliation',['Universidad Nacional Abierta y a Distancia (UNAD) · Pasto Learning Center (CEAD), Nariño','Universidad Nacional Abierta y a Distancia (UNAD) · Zipaquirá Virtual Attention Center (CCAV)','Universidad Nacional Abierta y a Distancia (UNAD) · Santa Marta Learning Center (CEAD)']);
    translateNodes('.team-section h2',['Team members']);
    translateNodes('.explorer-map-foot span',['REFERENCE EXTENT']);
    translateNodes('.selected-layer span',['SELECTED VARIABLE']);
    translateNodes('.explorer-card-title span',['STUDY AREA','ANALYSIS SETTINGS']);
    translateNodes('.chart-card-head > div > span',['01 / TIME SERIES','02 / ANNUAL CYCLE','03 / DEVIATION']);
    translateNodes('.source-card small',['Product 3IMERGM V07B. The original precipitation rate is documented in mm/h; the processed file also preserves monthly accumulation in mm/month. Available coverage runs from January 2020 to August 2025: 63 observed months and five missing months. Its 0.1° resolution (approximately 10 km) provides regional context, not a point measurement of the site.','SMAP L4 SPL4SMGP.008 provides estimates of surface and root-zone soil moisture at approximately 9 km and 3-hour frequency. It is an assimilation and modeling product; the two soil layers must be distinguished.','MOD13Q1 V061 provides NDVI and EVI every 16 days at 250 m. Series were extracted over the cadastral reference geometry, applying the 0.0001 scale factor and retaining only pixels with Pixel Reliability = 0. These indices describe vegetation spectral response, not direct biomass or biodiversity measurements.','Eight-day composites at 1 km. The 0.02 scale factor and conversion to °C were applied; only observations with mandatory QA bits = 00 were retained. Nighttime coverage is lower because matching QC layers are unavailable. This is regional thermal context, not air temperature or parcel-level detail.','Integrated parameters include air temperature at 2 m (mean, maximum and minimum), relative humidity, corrected precipitation, wind speed and solar radiation. These are regional modeling and assimilation products, not measurements from a weather station installed at Chimayoy.']);
    translateNodes('.explorer-controls > label',['Environmental variable']);
    translateNodes('#variable-select option',['Monthly accumulated precipitation · GPM IMERG','Regional precipitation · GPM 5×5 grid','Vegetation · NDVI (MODIS)','Vegetation · EVI (MODIS)','Daytime land surface temperature · LST','Nighttime land surface temperature · LST','Air temperature · NASA POWER','Relative humidity · NASA POWER','Corrected precipitation · NASA POWER','Wind speed · NASA POWER','Solar radiation · NASA POWER','Maximum air temperature · NASA POWER','Minimum air temperature · NASA POWER','Surface soil wetness · MERRA-2 (0–5 cm)','Root-zone soil wetness · MERRA-2 (0–100 cm)','Soil profile wetness · MERRA-2']);
    translateNodes('.data-table-heading > div > span',['04 / PROCESSED RECORD']);
    translateNodes('.chart-card-head > div > span',['01 / TIME SERIES','02 / ANNUAL CYCLE','03 / DEVIATION']);
    translateNodes('.explorer-card-title span',['STUDY AREA','ANALYSIS SETTINGS']);
    translateNodes('.explorer-card-title b',['Chimayoy · Nariño','Research layers']);
    translateNodes('.map-panel-head > div span',['SPATIAL DELIMITATION']);
    translateNodes('.map-panel-head > div b',['Study polygon · Chimayoy']);
    translateNodes('.map-panel-foot span',['BASE MAP · OPENSTREETMAP','GEOJSON · WGS 84']);
    translateNodes('.team-section h2',['Research team']);
    translateNodes('.references-section h2',['Scientific sources and technical documentation']);
    translateNodes('.references-reserved > p',['The complete research document, input-data audit and coverage manifest accompany this platform to support consultation and reproducibility.']);
    translateNodes('.closing-inner h2',['Connecting technology,<br><em>data and territory.</em>']);
    translateNodes('.closing-inner > p',['Satellite observation helps identify regional patterns and long-term changes. The planned UAV subsystem will complement this analysis with georeferenced RGB imagery and localized observations once flights have been conducted and capture conditions documented. E.N.A. will always distinguish field measurements from satellite estimates.']);
    translateNodes('.site-footer > span',['CHIMAYOY · PASTO, NARIÑO · COLOMBIA']);
    translateNodes('.site-footer > a:last-child',['BACK TO TOP ↑']);
    translateNodes('.chart-card-head h3',['Temporal evolution of the selected variable','Monthly behavior','Anomalies relative to climatology']);
    translateNodes('.data-table-heading h3',['Series observations']);
    translateNodes('.data-table thead th',['Date','Value','Unit','Anomaly']);
    translateNodes('#time-mode option',['All available data','Specific year','Specific month','Year range']);
    translateNodes('#month-select option',['January','February','March','April','May','June','July','August','September','October','November','December']);
    translateNodes('.year-controls > label',['Time view']);
    translateNodes('.chart-guide div p',['<b>Time series:</b> shows how the variable changes over time.','<b>Annual cycle:</b> summarizes the average behavior of each month within the selected period.','<b>Anomalies:</b> show the difference from the average for the same month in the selected period; they are descriptive and change when the interval changes.','<b>Table:</b> provides dates, values, units and deviations. The number of observations depends on each product’s coverage and quality filters.']);
    // Translate every visible heading, including the hero H1.
    // Normalize <br> and inline tags so line breaks do not block text matching.
    document.querySelectorAll('h1,h2,h3').forEach(node=>{
      const originalHeading=node.dataset.originalHtml||node.dataset.langOriginalHTML||node.dataset.originalHeadingHtml||node.innerHTML;
      if(!node.dataset.originalHeadingHtml) node.dataset.originalHeadingHtml=originalHeading;
      if(lang==='en'){
        const source=originalHeading
          .replace(/<br\s*\/?\s*>/gi,' ')
          .replace(/<\/(?:em|strong|b|i)>/gi,' ')
          .replace(/<[^>]*>/g,' ')
          .replace(/&nbsp;/gi,' ')
          .replace(/\s+/g,' ')
          .trim();
        if(headingTranslations[source]) node.innerHTML=headingTranslations[source];
      }else{
        node.innerHTML=node.dataset.originalHeadingHtml;
      }
    });
    // Stable language pass for hero text, section eyebrows and map labels.
    // This avoids relying on brittle text matching for the most prominent headings.
    const applyLanguageHTML=(selector,englishHTML)=>{
      document.querySelectorAll(selector).forEach(node=>{
        if(!node.dataset.langOriginalHTML) node.dataset.langOriginalHTML=node.innerHTML;
        node.innerHTML=lang==='en'?englishHTML:node.dataset.langOriginalHTML;
      });
    };
    applyLanguageHTML('.hero h1','Explore to<br><em>understand.</em>');
    // Translate eyebrow labels by original wording, not by their position.
    const eyebrowEN={
      'INVESTIGACIÓN Y OBSERVACIÓN DEL TERRITORIO':'TERRITORY RESEARCH AND OBSERVATION',
      'OBSERVACIÓN AMBIENTAL · CHIMAYOY':'ENVIRONMENTAL OBSERVATION · CHIMAYOY',
      'LECTURA INTEGRADA':'INTEGRATED READING',
      'INTEGRACIÓN CON OBSERVACIÓN TERRESTRE':'INTEGRATION WITH GROUND OBSERVATION',
      'PREGUNTA DE INVESTIGACIÓN':'RESEARCH QUESTION',
      'RESPUESTA DE E.N.A. AL PROBLEMA':'E.N.A. RESPONSE TO THE PROBLEM',
      'ESTRATEGIA DE INVESTIGACIÓN':'RESEARCH STRATEGY',
      '¿POR QUÉ CHIMAYOY?':'WHY CHIMAYOY?',
      'PROPÓSITO DEL SUBSISTEMA':'SUBSYSTEM PURPOSE',
      '¿QUÉ PODRÍA OCURRIR?':'WHAT COULD HAPPEN?',
      'TRAZABILIDAD':'TRACEABILITY',
      'CASO DE ESTUDIO · COLOMBIA':'CASE STUDY · COLOMBIA',
      'DATOS ABIERTOS DEL PROYECTO':'PROJECT OPEN DATA',
      'E.N.A. · INVESTIGACIÓN Y OBSERVACIÓN':'E.N.A. · RESEARCH AND OBSERVATION'
    };
    document.querySelectorAll('.eyebrow').forEach(node=>{
      if(!node.dataset.langOriginalHTML) node.dataset.langOriginalHTML=node.innerHTML;
      const originalText=node.dataset.langOriginalHTML.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
      if(lang==='en'&&eyebrowEN[originalText]){
        const lead=node.querySelector('span.eyebrow-line')?.outerHTML||'';
        node.innerHTML=(lead?lead+' ':'')+eyebrowEN[originalText];
      }else{
        node.innerHTML=node.dataset.langOriginalHTML;
      }
    });

    // Complete bilingual coverage for the Chimayoy territorial rationale section.
    // This section was previously omitted from the EN translation pass.
    applyLanguageHTML('.territory-rationale-section .section-label','TERRITORIAL CONTEXT · PILOT AREA RATIONALE');
    applyLanguageHTML('.territory-rationale-section .eyebrow','WHY CHIMAYOY?');
    applyLanguageHTML('.territory-rationale-section h2','A place-based investigation to <em>understand and preserve.</em>');
    applyLanguageHTML('.territory-rationale-grid > div:first-child > .eyebrow','WHY CHIMAYOY?');
    translateNodes('.territory-rationale-grid > div:first-child > p:not(.eyebrow)',[
      'Chimayoy was selected because it allows the research to focus on a specific Andean territory with environmental, educational and conservation value. Recognized by CORPONARIÑO, the Environmental Center carries out activities related to environmental education, research and ecological conservation. Studying its environmental conditions offers an opportunity to turn Earth observation data into information connected to a place whose protection has local significance.',
      'The mountainous terrain makes it especially important to interpret variables in context. Slope, hillside orientation, altitude, vegetation cover, cloudiness and water circulation can produce environmental differences over short distances. Satellite products do not capture all these contrasts at the same level of detail; E.N.A. therefore reports the resolution and scope of each source without attributing precision to regional pixels that they do not have.'
    ]);
    translateNodes('.territory-rationale-aside article span',[
      '01 · STUDY SCALE','02 · CONSERVATION','03 · GEOLOGICAL CONTEXT'
    ]);
    translateNodes('.territory-rationale-aside article h3',[
      'From global to local','Understanding is essential to protection','An active mountain region'
    ]);
    translateNodes('.territory-rationale-aside article p',[
      'The Earth system trends challenge has a global scope, but applied research requires a defined case study. Chimayoy makes it possible to develop and explain a reproducible procedure, recognize its limits and assess what information is useful for a specific territory.',
      'The purpose is not to claim that the ecosystem is deteriorating or to anticipate a threat. The aim is to establish an environmental baseline that helps recognize variations, formulate monitoring questions and provide information for education and conservation.',
      'The area around Pasto is located in a region with seismic and volcanic activity monitored by the Colombian Geological Survey. This background supports a responsible territorial perspective, but it does not mean that E.N.A. measures earthquakes, assesses geological hazards on the property or predicts earthquakes. Seismic activity is presented as regional context, not as an environmental variable in the analysis.'
    ]);
    applyLanguageHTML('.territory-source-note','Institutional and geological context: CORPONARIÑO (2016) and the Colombian Geological Survey (2026). Seismic and volcanic information does not replace hazard, geotechnical or risk-management studies.');

    applyLanguageHTML('.hero .orbital-label.label-top span:first-child','STUDY AREA LOCATION');
    applyLanguageHTML('.hero .map-location small','1.2624° N · 77.2850° W');

    // Final coverage pass: translate remaining standalone text nodes, including
    // small captions, map labels, chart placeholders, download labels and metadata.
    // Existing section-specific translations above remain authoritative.
    const remainingEN = {
      'EXPLORACIÓN · NATURALEZA · ANÁLISIS':'EXPLORATION · NATURE · ANALYSIS',
      'INVESTIGACIÓN Y OBSERVACIÓN DEL TERRITORIO':'TERRITORY RESEARCH AND OBSERVATION',
      'OBSERVACIÓN AMBIENTAL · CHIMAYOY':'ENVIRONMENTAL OBSERVATION · CHIMAYOY',
      'INVESTIGACIÓN AMBIENTAL · CHIMAYOY, NARIÑO':'ENVIRONMENTAL RESEARCH · CHIMAYOY, NARIÑO',
      'ÁREA DE INVESTIGACIÓN':'RESEARCH AREA',
      'Chimayoy · Pasto, Nariño':'Chimayoy · Pasto, Nariño',
      'Observación regional mediante productos satelitales y análisis territorial.':'Regional observation using satellite products and territorial analysis.',
      'ÁREA PILOTO · CHIMAYOY, NARIÑO':'PILOT AREA · CHIMAYOY, NARIÑO',
      'PERIODO DE ANÁLISIS · 2015–2025':'ANALYSIS PERIOD · 2015–2025',
      'OBSERVACIÓN DE LA TIERRA · NASA':'EARTH OBSERVATION · NASA',
      'COLOMBIA · NARIÑO':'COLOMBIA · NARIÑO',
      'LOCALIZACIÓN DEL ÁREA DE ESTUDIO':'STUDY AREA LOCATION',
      'LECTURA INTEGRADA':'INTEGRATED OVERVIEW',
      'TRAYECTORIA CONCEPTUAL · NO REPRESENTA UN VUELO REAL':'CONCEPTUAL PATH · DOES NOT REPRESENT AN ACTUAL FLIGHT',
      'INTEGRACIÓN CON OBSERVACIÓN TERRESTRE':'INTEGRATION WITH GROUND OBSERVATION',
      'RESPUESTA DE E.N.A. AL PROBLEMA':'E.N.A. RESPONSE TO THE PROBLEM',
      '01 · IDENTIFICACIÓN':'01 · IDENTIFICATION',
      '02 · DISTRIBUCIÓN':'02 · DISTRIBUTION',
      '03 · MAGNITUD':'03 · MAGNITUDE',
      '04 · EVIDENCIA':'04 · EVIDENCE',
      'ESTRATEGIA DE INVESTIGACIÓN':'RESEARCH STRATEGY',
      'PROPÓSITO DEL SUBSISTEMA':'SUBSYSTEM PURPOSE',
      'OBJETIVO GENERAL':'GENERAL OBJECTIVE',
      'Zona segura':'Safe area',
      'Obstáculo':'Obstacle',
      'Zona con agua':'Water area',
      'Sin clasificar':'Unclassified',
      '01 / BAJO':'01 / LOW',
      '02 / MEDIO':'02 / MODERATE',
      '03 / ALTO':'03 / HIGH',
      '04 / PENDIENTE DE REVISIÓN':'04 / PENDING REVIEW',
      'RESPUESTA DEL SISTEMA':'SYSTEM RESPONSE',
      'ENTORNO Y HERRAMIENTAS':'ENVIRONMENT AND TOOLS',
      'TRAZABILIDAD':'TRACEABILITY',
      'DATOS REGISTRADOS':'RECORDED DATA',
      'ÁREA DE ESTUDIO':'STUDY AREA',
      'DEPARTAMENTO':'DEPARTMENT',
      'COORDENADAS DE REFERENCIA':'REFERENCE COORDINATES',
      'Fotografía de referencia aportada al proyecto':'Reference photograph provided to the project',
      'Imagen de referencia compartida; contiene marca de autor':'Shared reference image; author mark retained',
      'DATOS ABIERTOS DEL PROYECTO':'PROJECT OPEN DATA',
      'GEOMETRÍA DE REFERENCIA':'REFERENCE GEOMETRY',
      'DELIMITACIÓN ESPACIAL':'SPATIAL DELIMITATION',
      'MAPA INTERACTIVO':'INTERACTIVE MAP',
      'BASE CARTOGRÁFICA · CARTO / OPENSTREETMAP':'BASE MAP · CARTO / OPENSTREETMAP',
      'RECUADRO DE CONSULTA':'QUERY EXTENT',
      'CONFIGURACIÓN DEL ANÁLISIS':'ANALYSIS SETTINGS',
      'hasta':'to',
      'VARIABLE SELECCIONADA':'SELECTED VARIABLE',
      'SELECCIONA UNA SERIE':'SELECT A SERIES',
      '01 / SERIE TEMPORAL':'01 / TIME SERIES',
      '02 / CICLO ANUAL':'02 / ANNUAL CYCLE',
      '03 / DESVIACIÓN':'03 / DEVIATION',
      '04 / REGISTRO PROCESADO':'04 / PROCESSED RECORD',
      'Sin datos':'No data',
      'DATOS PROCESADOS':'PROCESSED DATA',
      'LECTURA DE LA VARIABLE SELECCIONADA':'SELECTED VARIABLE OVERVIEW',
      'CRITERIO DE INTERPRETACIÓN':'INTERPRETATION CRITERIA',
      'INVESTIGACIÓN Y OBSERVACIÓN':'RESEARCH AND OBSERVATION',
      'CHIMAYOY · PASTO, NARIÑO · COLOMBIA':'CHIMAYOY · PASTO, NARIÑO · COLOMBIA',
      'VOLVER ARRIBA ↑':'BACK TO TOP ↑',
      'Precipitación acumulada · GPM IMERG':'Accumulated precipitation · GPM IMERG',
      'Precipitación · GPM IMERG':'Precipitation · GPM IMERG',
      'Temperatura de superficie':'Land surface temperature',
      'Vegetación · NDVI (MODIS)':'Vegetation · NDVI (MODIS)',
      'Precipitación mensual · Chimayoy':'Monthly precipitation · Chimayoy',
      'Evolución mensual de precipitación':'Monthly precipitation time series',
      'Anomalías respecto a climatología':'Anomalies relative to climatology',
      'Acumulación mensual · mm/mes':'Monthly accumulation · mm/month',
      'valor medio':'mean value',
      'anomalía':'anomaly',
      'Preparando lectura descriptiva':'Preparing descriptive summary',
      'Conectando las series procesadas incluidas en E.N.A.…':'Connecting to the processed series included in E.N.A.…',
      'Consulta y descarga los archivos.':'Browse and download the files.',
      'Construcción del conjunto de datos':'Build the dataset',
      'Recomendaciones y registro':'Recommendations and logging',
      'Del patrón regional a los puntos críticos.':'From regional patterns to local points of interest.',
      'Una investigación situada.':'A place-based investigation.',
      'Convertir la información visual en apoyo para la navegación.':'Turning visual information into navigation support.',
      'Un historial estructurado para cada misión.':'A structured log for every mission.',
      'Delimitación de la investigación.':'Research scope.',
      'APLICACIÓN DEL ANÁLISIS AMBIENTAL':'ENVIRONMENTAL ANALYSIS APPLICATION',
      'VISTA SATELITAL · CHIMAYOY':'SATELLITE VIEW · CHIMAYOY',
      'Fuentes científicas y documentación técnica':'Scientific sources and technical documentation',
      'REFERENCIAS Y DOCUMENTACIÓN':'REFERENCES AND DOCUMENTATION',
      'INVESTIGACIÓN · SISTEMA DE EXPLORACIÓN':'RESEARCH · EXPLORATION SYSTEM',
      'OBSERVACIÓN SATELITAL Y VARIABLES':'SATELLITE OBSERVATION AND VARIABLES',
      'REGISTRO VISUAL · CONTEXTO DEL ÁREA PILOTO':'VISUAL RECORD · PILOT AREA CONTEXT',
      'EXPLORADOR DE DATOS · SERIES Y GRÁFICOS':'DATA EXPLORER · TIME SERIES AND CHARTS',
      'RESULTADOS E INTERPRETACIÓN · LECTURA DE LOS DATOS':'RESULTS AND INTERPRETATION · DATA INSIGHTS',
      'INTRODUCCIÓN · OBSERVACIÓN Y CAMBIO AMBIENTAL':'INTRODUCTION · OBSERVING ENVIRONMENTAL CHANGE',
      'CONTEXTO CIENTÍFICO · VARIABLES Y ESCALAS DE OBSERVACIÓN':'SCIENTIFIC CONTEXT · VARIABLES AND OBSERVATION SCALES',
      'PLANTEAMIENTO DEL PROBLEMA · NASA SPACE APPS CHALLENGE 2026':'PROBLEM STATEMENT · NASA SPACE APPS CHALLENGE 2026',
      'El ciclo anual se calculará al cargar la serie.':'The annual cycle will be calculated when the series is loaded.',
      'Las anomalías se calcularán con respecto al promedio de cada mes.':'Anomalies will be calculated relative to the average for each month.',
      'Carga un archivo para consultar las observaciones procesadas.':'Load a file to view the processed observations.',
      'Selecciona el archivo procesado de esta variable para consultar su evolución temporal.':'Select the processed file for this variable to view its time series.',
      'La metodología organiza el trabajo en etapas conectadas. Cada módulo prepara o interpreta la información que recibe del anterior, manteniendo una arquitectura comprensible y ampliable.':'The methodology organizes the work into connected stages. Each module prepares or interprets the information received from the previous one, maintaining an understandable and extensible architecture.',
      'La organización del conjunto de imágenes establece una referencia para identificar condiciones relevantes durante una misión de exploración.':'The image dataset establishes a reference for identifying relevant conditions during an exploration mission.',
      'El flujo propuesto conserva la separación entre captura, procesamiento, detección, evaluación y almacenamiento. Esta estructura facilita la trazabilidad de la información generada durante cada misión.':'The proposed workflow keeps capture, processing, detection, assessment and storage as separate stages. This structure supports traceability of the information generated during each mission.',
      'Los eventos consolidados permiten construir indicadores sobre objetos, obstáculos y zonas de riesgo identificadas durante la exploración.':'Consolidated events can be used to build indicators for objects, obstacles and risk areas identified during exploration.',
      'Los indicadores se completarán a partir de las series incluidas en el proyecto.':'Indicators will be completed using the time series included in the project.',
      'La lectura de cada serie debe considerar su unidad, resolución espacial, frecuencia de observación y criterios de calidad. La significancia estadística se establece mediante pruebas específicas y no únicamente por la apariencia de la curva.':'Each time series must be interpreted according to its unit, spatial resolution, observation frequency and quality criteria. Statistical significance is established through specific tests, not solely from the appearance of the curve.',
      'El sistema se orienta a identificar obstáculos, zonas seguras, cuerpos de agua y otros elementos relevantes. A partir de estas observaciones, organiza eventos, evalúa condiciones de riesgo y genera recomendaciones de alto nivel. La propuesta no contempla el control directo de los actuadores del dron.':'The system is designed to identify obstacles, safe areas, water bodies and other relevant elements. Based on these observations, it organizes events, assesses risk conditions and generates high-level recommendations. The proposal does not include direct control of the drone actuators.',
      'Como línea complementaria, E.N.A. contempla el desarrollo de un subsistema inteligente que interprete imágenes capturadas por una cámara instalada en un dron. En Chimayoy, esta capacidad podría aportar observaciones localizadas de sectores seleccionados a partir de los patrones identificados en el análisis satelital.':'As a complementary workstream, E.N.A. includes the development of an intelligent subsystem to interpret images captured by a camera mounted on a drone. In Chimayoy, this capability could provide localized observations of selected areas based on patterns identified through satellite analysis.',
      'El aporte de agua desde la atmósfera. Su evolución permite reconocer periodos húmedos y secos y desviaciones respecto al comportamiento mensual.':'Water supplied by the atmosphere. Its evolution helps identify wet and dry periods and deviations from the monthly pattern.',
      'Estimación del agua contenida en el suelo. Aporta contexto sobre la respuesta del terreno a la precipitación a escala de píxel.':'An estimate of the water stored in the soil. It provides context for the land response to precipitation at the pixel scale.',
      'Índices espectrales que permiten estudiar cambios en la actividad y cobertura vegetal, aplicando controles de calidad.':'Spectral indices used to study changes in vegetation activity and cover, applying quality controls.',
      'Temperatura radiométrica de la superficie terrestre; no equivale a la temperatura del aire medida en una estación.':'Radiometric temperature of the land surface; it is not equivalent to air temperature measured at a weather station.',
      'Los UAV permiten realizar observación remota, ampliar la cobertura de reconocimiento y recopilar información visual en zonas de difícil acceso.':'UAVs enable remote observation, expand reconnaissance coverage and collect visual information in hard-to-access areas.',
      'Los algoritmos procesan imágenes para identificar objetos, reconocer patrones y extraer características relevantes de cada escena.':'Algorithms process images to identify objects, recognize patterns and extract relevant features from each scene.',
      'Los modelos de detección permiten localizar elementos de interés y aportar información estructurada para evaluar el entorno observado.':'Detection models locate relevant elements and provide structured information to assess the observed environment.',
      'Áreas abiertas, caminos despejados o espacios con margen suficiente para el desplazamiento.':'Open areas, clear paths or spaces with sufficient room for movement.',
      'Árboles, rocas, estructuras, postes y otros elementos que pueden limitar la trayectoria.':'Trees, rocks, structures, poles and other elements that may restrict the path.',
      'Ríos, lagunas, inundaciones o acumulaciones de agua que requieren atención durante la exploración.':'Rivers, ponds, flooding or water accumulation that require attention during exploration.',
      'Imágenes que aún no han sido etiquetadas o cuya categoría requiere validación.':'Images that have not yet been labeled or whose category requires validation.',
      'Continuar la exploración cuando las condiciones estén verificadas.':'Continue exploration when conditions have been verified.',
      'Actuar con precaución y revisar la trayectoria.':'Proceed with caution and review the flight path.',
      'Detener o reevaluar la ruta antes de continuar.':'Stop or reassess the route before continuing.',
      'Fotografías externas: Υ.Γ.,':'External photographs: Υ.Γ.,',
      ', Wikimedia Commons, licencia':', Wikimedia Commons, license',
      '. Se conserva la atribución y la licencia de compartir igual.':'. Attribution and share-alike terms are retained.',
      'Centro de referencia: 1.2624° N · 77.2850° O':'Reference point: 1.2624° N · 77.2850° W',
      'Polígono catastral empleado para el análisis espacial.':'Cadastral polygon used for spatial analysis.',
      'Centro Ambiental Chimayoy':'Chimayoy Environmental Center',
      'acceso':'access',
      'museo':'museum',
      'Identidad del centro ambiental':'Environmental Center identity',
      'Sendero de acceso':'Access path',
      'Instalaciones y entorno':'Facilities and surroundings',
      'Vista aérea del entorno':'Aerial view of the surroundings',
      'Fotografía de referencia aportada al proyecto':'Reference photograph provided to the project',
      'Imagen de referencia compartida; contiene marca de autor':'Shared reference image; author mark retained',
      'Humedad superficial del suelo':'Surface soil moisture',
      'Temperatura superficial':'Land surface temperature',
      'Precipitación':'Precipitation',
      'Vegetación':'Vegetation',
      'HUMEDAD DEL SUELO':'SOIL MOISTURE',
      'PRECIPITACIÓN':'PRECIPITATION',
      'VEGETACIÓN':'VEGETATION',
      'TEMPERATURA SUPERFICIAL':'LAND SURFACE TEMPERATURE',
      'Fuente complementaria · extracción en proceso':'Complementary source · extraction in progress',
      'INTEGRADO · 63 VÁLIDOS / 5 FALTANTES':'INTEGRATED · 63 VALID / 5 MISSING',
      'FUENTE COMPLEMENTARIA · EXTRACCIÓN EN PROCESO':'COMPLEMENTARY SOURCE · EXTRACTION IN PROGRESS',
      'INTEGRADO · 63 FECHAS VÁLIDAS POR ÍNDICE':'INTEGRATED · 63 VALID DATES PER INDEX',
      'INTEGRADO · 97 DÍA / 59 NOCHE':'INTEGRATED · 97 DAY / 59 NIGHT',
      'CONTEXTO METEOROLÓGICO INTEGRADO':'INTEGRATED METEOROLOGICAL CONTEXT',
      'Acumulación mensual · mm/mes':'Monthly accumulation · mm/month',
      'NASA GPM IMERG · mm/mes':'NASA GPM IMERG · mm/month',
      'Fecha y hora':'Date and time',
      'Objeto o elemento identificado':'Identified object or element',
      'Nivel de confianza':'Confidence level',
      'Estado asociado':'Associated status',
      'Clasificación y observaciones':'Classification and notes',
      'Delimitación de la investigación.':'Research scope.',
      'INVESTIGACIÓN Y OBSERVACIÓN':'RESEARCH AND OBSERVATION',
      'CONTEXTO METEOROLÓGICO INTEGRADO':'INTEGRATED METEOROLOGICAL CONTEXT',
      'E.N.A. INVESTIGACIÓN Y OBSERVACIÓN':'E.N.A. RESEARCH AND OBSERVATION',
      'Centro Ambiental Chimayoy':'Chimayoy Environmental Center',
      'Nariño, Colombia':'Nariño, Colombia',
      'Chimayoy · Nariño':'Chimayoy · Nariño',
      'Chimayoy':'Chimayoy',
      'Zona segura':'Safe area',
      'Obstáculo':'Obstacle',
      'Zona con agua':'Water area',
      'Sin clasificar':'Unclassified',
      'Riesgo bajo':'Low risk',
      'Riesgo medio':'Moderate risk',
      'Riesgo alto':'High risk',
      'Avanzar':'Proceed',
      'Precaución':'Caution',
      'Evitar':'Avoid',
      'Desviar ruta':'Reroute',
      'Detener':'Stop',
      'Captura de imágenes':'Image capture',
      'Procesamiento visual':'Visual processing',
      'Detección':'Detection',
      'Evaluación':'Assessment',
      'Registro':'Log',
      'Cámara RGB':'RGB camera',
      'Reglas de riesgo':'Risk rules',
      'Historial CSV':'CSV log',
      'Polígono de referencia GeoJSON ↓':'Reference polygon GeoJSON ↓',
      'Manifiesto de datos JSON ↓':'Data manifest JSON ↓',
      'GPM · CSV de serie mensual CSV ↓':'GPM · Monthly series CSV ↓',
      'GPM · Cuadrícula CSV CSV ↓':'GPM · Grid CSV ↓',
      'NASA POWER · CSV original CSV ↓':'NASA POWER · Original CSV ↓',
      'Investigación completa DOCX ↓':'Full research document DOCX ↓',
      'Auditoría de datos XLSX ↓':'Data audit XLSX ↓',
      'Descargar investigación completa (DOCX)':'Download full research document (DOCX)',
      'Descargar auditoría de datos (XLSX)':'Download data audit (XLSX)',
      'Consultar manifiesto de datos':'View data manifest',
      'GPM IMERG · mensual JSON ↓':'GPM IMERG · monthly JSON ↓',
      'MODIS · LST diurna JSON ↓':'MODIS · daytime LST JSON ↓',
      'MODIS · LST nocturna JSON ↓':'MODIS · nighttime LST JSON ↓',
      'Polígono de referencia GEOJSON ↓':'Reference polygon GEOJSON ↓',
      'Consultar y descargar archivos ↓':'View and download files ↓',
      'Conocer la investigación ↓':'Explore the research ↓',
      'Ver caso de estudio ↗':'View the case study ↗',
      'Explorar datos ↗':'Explore data ↗',
      'Volver arriba':'Back to top',
      'Variable ambiental':'Environmental variable',
      'Centro de celda GPM':'GPM grid-cell center',
      'Vista temporal':'Time view',
      'Toda la serie disponible':'All available data',
      'Año específico':'Specific year',
      'Mes específico':'Specific month',
      'Intervalo de años':'Year range',
      'Enero':'January','Febrero':'February','Marzo':'March','Abril':'April','Mayo':'May','Junio':'June',
      'Equipo':'Team',
      'Resultados':'Results',
      'Datos satelitales':'Satellite data',
      'Sistema de exploración':'Exploration system',
      'Explorar datos':'Explore data',
      'Equipo de trabajo':'Research team',
      'EQUIPO DE INVESTIGACIÓN':'RESEARCH TEAM',
      'PREGUNTA DE INVESTIGACIÓN':'RESEARCH QUESTION',
      'METODOLOGÍA DE ANÁLISIS':'ANALYSIS METHODOLOGY',
      'CRITERIOS DE RIESGO':'RISK CRITERIA',
      'CLASIFICACIÓN DEL ENTORNO':'ENVIRONMENT CLASSIFICATION',
      'Capas para investigar':'Research layers',
      'Estado de la vegetación':'Vegetation condition',
      'Visión por computador':'Computer vision',
      'Comportamiento por mes':'Monthly pattern',
      'Evaluación del entorno':'Environment assessment',
      'Auditoría de datos':'Data audit',
      'Manifiesto de datos':'Data manifest',
      'Investigación completa':'Full research document',
      'Polígono de referencia':'Reference polygon',
      'GPM IMERG mensual · NASA':'Monthly GPM IMERG · NASA',
      'GPM IMERG · mensual':'GPM IMERG · monthly',
      'GPM IMERG · Serie procesada':'GPM IMERG · Processed series',
      'GPM · CSV de serie mensual':'GPM · Monthly series CSV',
      'Consultar y descargar archivos':'View and download files',
      'Descargar conjuntos de datos':'Download datasets',
      'Observaciones de la serie':'Series observations',
      'Humedad del suelo':'Soil moisture',
      'Humedad relativa · NASA POWER':'Relative humidity · NASA POWER',
      'Precipitación corregida · NASA POWER':'Corrected precipitation · NASA POWER',
      'Temperatura del aire · NASA POWER':'Air temperature · NASA POWER',
      'Velocidad del viento · NASA POWER':'Wind speed · NASA POWER',
      'Temperatura máxima del aire · NASA POWER':'Maximum air temperature · NASA POWER',
      'Temperatura mínima del aire · NASA POWER':'Minimum air temperature · NASA POWER',
      'Precipitación regional · cuadrícula 5×5 GPM':'Regional precipitation · GPM 5×5 grid',
      'Vegetación · EVI (MODIS)':'Vegetation · EVI (MODIS)',
      'Temperatura superficial diurna · LST':'Daytime land surface temperature · LST',
      'Temperatura superficial nocturna · LST':'Nighttime land surface temperature · LST',
      'SMAP · m³/m³ · fuente complementaria':'SMAP · m³/m³ · complementary source',
      'Humedad del suelo · SMAP (pendiente de descarga)':'Soil moisture · SMAP (download pending)',
      'El ambiente funciona como un sistema':'The environment functions as a system',
      'Comprender los cambios del territorio a partir de':'Understanding territorial change through',
      '¿Cómo distinguir una fluctuación de un':'How can we distinguish a fluctuation from a',
      'las series ambientales.':'environmental time series.',
      'de interpretación.':'of interpretation.',
      'hacia los datos.':'into the data.',
      'del sistema al territorio.':'from system to territory.',
      'con análisis visual.':'through visual analysis.',
      'para describir la escena.':'to describe the scene.',
      'a un área concreta.':'to a defined area.',
      'Del fotograma':'From frame',
      'Del producto global':'From global products',
      'Una variable describe una parte del sistema; su análisis conjunto aporta contexto.':'One variable describes one part of the system; joint analysis provides context.',
      'E.N.A. se desarrolla en el marco del desafío':'E.N.A. was developed as part of the',
      'de NASA Space Apps Challenge 2026. Su investigación se concentra en Chimayoy, Nariño, y busca convertir información de observación de la Tierra en resultados comprensibles, verificables y útiles para interpretar la dinámica ambiental del área de estudio.':'NASA Space Apps Challenge 2026. Its research focuses on Chimayoy, Nariño, and aims to turn Earth observation information into understandable, verifiable results for interpreting environmental dynamics in the study area.',
      'Chimayoy, en el municipio de Pasto, Nariño, constituye el área piloto. El periodo de referencia es 2015–2025. Las conclusiones se circunscribirán a las variables, productos, escalas y observaciones efectivamente analizadas.':'Chimayoy, in the municipality of Pasto, Nariño, is the pilot study area. The reference period is 2015–2025. Conclusions will be limited to the variables, products, scales and observations actually analyzed.',
      'La información que pueda recopilarse mediante el dron se incorporará como observación complementaria en puntos críticos, con metadatos espaciales y temporales que permitan relacionarla con la escala de los productos satelitales.':'Information collected by the drone may be incorporated as complementary observations at selected points, with spatial and temporal metadata that allow it to be related to the scale of satellite products.',
      'Julio':'July','Agosto':'August','Septiembre':'September','Octubre':'October','Noviembre':'November','Diciembre':'December',
      'La variabilidad ambiental forma parte del funcionamiento natural del sistema terrestre. Sin embargo, cuando una variable presenta cambios sostenidos, es necesario establecer si su comportamiento refleja una tendencia, dónde se manifiesta y qué magnitud alcanza. La dificultad aumenta porque las variables se miden con distintas resoluciones, escalas temporales y niveles de incertidumbre.':'Environmental variability is part of the Earth system’s natural functioning. However, when a variable shows sustained changes, it is necessary to determine whether its behavior reflects a trend, where it occurs and how large it is. This is challenging because variables are measured at different resolutions, time scales and levels of uncertainty.',
      '¿Qué tendencias y anomalías presentan la precipitación, la humedad superficial del suelo, la vegetación y la temperatura superficial en Chimayoy, Nariño, durante 2015–2025; dónde se manifiestan, cuál es su magnitud y qué evidencia estadística permite evaluar su significancia?':'What trends and anomalies occur in precipitation, surface soil moisture, vegetation and land surface temperature in Chimayoy, Nariño, during 2015–2025; where do they occur, how large are they, and what statistical evidence can be used to assess their significance?',
      'Diseñar un subsistema de análisis visual basado en procesamiento de imágenes e inteligencia artificial que interprete el entorno capturado por un dron y genere recomendaciones de navegación a partir de la identificación de condiciones de riesgo.':'Design a visual analysis subsystem based on image processing and artificial intelligence to interpret the environment captured by a drone and generate navigation recommendations by identifying risk conditions.',
      'Los productos de observación de la Tierra permiten consultar variables ambientales con cobertura espacial y temporal. La selección de cada producto depende de su resolución, periodo disponible, unidades y adecuación a la escala de Chimayoy.':'Earth observation products provide access to environmental variables with spatial and temporal coverage. Product selection depends on resolution, available period, units and suitability for the scale of Chimayoy.',
      'El mapa presenta la geometría catastral de referencia utilizada en las extracciones y el punto de localización de Chimayoy. El polígono tiene aproximadamente 49,10 ha; se utiliza como delimitación operativa de análisis y no como certificación del perímetro institucional completo del Centro Ambiental.':'The map displays the cadastral reference geometry used for data extraction and the reference location of Chimayoy. The polygon covers approximately 49.10 ha and is used as an operational study boundary; it is not a certification of the Environmental Center’s full institutional perimeter.',
      'La investigación completa, la auditoría de los insumos y el manifiesto de cobertura acompañan esta plataforma para permitir la consulta y reproducción del trabajo.':'The full research document, input-data audit and coverage manifest accompany this platform to support consultation and reproducibility.',
      'Los territorios cambian a través de procesos ambientales que se manifiestan en la disponibilidad de agua, el comportamiento de la vegetación y las condiciones térmicas de la superficie.':'Territories change through environmental processes reflected in water availability, vegetation behavior and surface thermal conditions.',
      'Reconocer esos cambios exige observar más allá de una imagen o de una medición aislada. Es necesario reunir registros obtenidos en distintos momentos, mantener criterios consistentes de análisis y estudiar cómo evoluciona cada variable. La observación satelital permite estudiar áreas amplias y construir series temporales para identificar patrones, desviaciones y posibles tendencias.':'Recognizing these changes requires looking beyond a single image or measurement. Records from different dates must be combined, consistent analysis criteria maintained, and the evolution of each variable examined. Satellite observation makes it possible to study broad areas and build time series to identify patterns, deviations and possible trends.',
      'La precipitación, la humedad del suelo, la vegetación y la temperatura superficial describen componentes distintos del sistema terrestre. Analizarlas en conjunto permite formular preguntas sobre sus variaciones temporales y explorar cómo coinciden, sin asumir relaciones causales.':'Rainfall, soil moisture, vegetation and land surface temperature describe different components of the Earth system. Analyzing them together helps formulate questions about temporal variation and explore how they coincide, without assuming causal relationships.',
      'Los indicadores describen la fracción de humedad estimada en capas superficiales y profundas del suelo. Permiten explorar su variación temporal, sin interpretarse como mediciones directas en el terreno.':'The indicators describe the estimated moisture fraction in shallow and deeper soil layers. They make it possible to explore temporal variation, but should not be interpreted as direct field measurements.',
      'Las series se examinarán primero de manera individual, respetando sus unidades, resoluciones y frecuencias de observación. Posteriormente se compararán sus anomalías y periodos de variación para identificar coincidencias temporales que merezcan interpretación. Una coincidencia estadística por sí sola no demuestra causalidad.':'The time series are examined individually first, respecting their units, spatial resolutions and observation frequencies. Their anomalies and periods of variation are then compared to identify temporal coincidences worth interpreting. A statistical coincidence alone does not demonstrate causality.',
      'La investigación contempla incorporar un dron como plataforma de recolección de información en sectores de interés de Chimayoy. Sus imágenes y registros georreferenciados podrían aportar detalle local para documentar condiciones visibles del terreno y respaldar la interpretación espacial de los productos satelitales.':'The research considers incorporating a drone as a platform for collecting information in selected areas of Chimayoy. Its georeferenced images and records could provide local detail to document visible ground conditions and support the spatial interpretation of satellite products.',
      'Esta integración exige correspondencia entre ubicación, fecha y tipo de observación. Una cámara RGB permite documentar elementos visibles, pero no mide directamente humedad del suelo ni temperatura superficial; esas variables requerirían sensores específicos. Por lo tanto, el dron complementa la observación satelital en lugar de reemplazar las mediciones científicas específicas del producto.':'This integration requires matching location, date and observation type. An RGB camera documents visible features but does not directly measure soil moisture or land surface temperature; those variables require dedicated sensors. The drone therefore complements satellite observation rather than replacing product-specific scientific measurements.',
      'ANÁLISIS COMPLEMENTARIO · ESCENARIOS DE PRECIPITACIÓN':'COMPLEMENTARY ANALYSIS · PRECIPITATION SCENARIOS',
      '¿QUÉ PODRÍA OCURRIR?':'WHAT COULD HAPPEN?',
      'De los registros históricos a':'From historical records to',
      'La página de análisis complementaria incorpora proyecciones de precipitación para el periodo 2025–2035, construidas a partir de registros históricos. Este componente amplía la lectura temporal de E.N.A.: mientras la investigación principal describe y evalúa el comportamiento observado en las fuentes históricas, las proyecciones exploran posibles continuidades o cambios bajo el método y los supuestos utilizados.':'The complementary analysis page includes precipitation projections for 2025–2035, built from historical records. This component extends E.N.A.’s temporal perspective: while the main research describes and evaluates the behavior observed in historical sources, the projections explore possible continuities or changes under the method and assumptions used.',
      'Las proyecciones no deben confundirse con pronósticos meteorológicos operativos ni con certezas sobre la lluvia que ocurrirá en una fecha determinada. Su interpretación depende de la serie histórica, el procedimiento estadístico, los supuestos y la incertidumbre del modelo. Por esa razón, E.N.A. las presenta como un módulo complementario y no como sustituto de los resultados observados.':'Projections should not be confused with operational weather forecasts or certainties about rainfall on a specific date. Their interpretation depends on the historical series, statistical procedure, assumptions and model uncertainty. For this reason, E.N.A. presents them as a complementary module, not as a substitute for observed results.',
      'HORIZONTE DE PROYECCIÓN':'PROJECTION HORIZON',
      'Precipitación · estimaciones basadas en datos históricos':'Precipitation · estimates based on historical data',
      'La lectura de escenarios futuros se mantiene diferenciada del análisis retrospectivo 2015–2025.':'Future-scenario interpretation remains separate from the 2015–2025 retrospective analysis.',
      'Acceder a proyecciones de precipitación':'Open precipitation projections',
      'ESTRUCTURA DEL SISTEMA':'SYSTEM ARCHITECTURE',
      'Una investigación situada para':'A place-based investigation of',
      'Chimayoy fue seleccionado porque permite concentrar la investigación en un territorio andino concreto, con valor ambiental, educativo y de conservación. El Centro Ambiental, reconocido por CORPONARIÑO, desarrolla actividades relacionadas con educación ambiental, investigación y conservación.':'Chimayoy was selected because it allows the research to focus on a specific Andean territory with environmental, educational and conservation value. The Environmental Center, recognized by CORPONARIÑO, carries out activities related to environmental education, research and conservation.',
      'El relieve montañoso hace especialmente importante interpretar las variables en su contexto. La pendiente, la orientación de las laderas, la altitud, la cobertura vegetal, la nubosidad y la circulación del agua pueden producir diferencias a escalas locales.':'The mountainous terrain makes it especially important to interpret variables in context. Slope, aspect, altitude, vegetation cover, cloudiness and water movement can produce differences at local scales.',
      'El desafío de tendencias del sistema terrestre tiene alcance global, pero una investigación aplicada necesita un caso delimitado. Chimayoy permite desarrollar y explicar un procedimiento reproducible, reconocer sus límites y evaluar qué información puede obtenerse con los productos disponibles.':'The Earth System Trend Detective challenge has a global scope, but applied research requires a defined case study. Chimayoy makes it possible to develop and explain a reproducible procedure, recognize its limits and assess what information can be obtained from available products.',
      'El propósito no es afirmar que el ecosistema se encuentra en deterioro ni anticipar una amenaza. Se busca establecer una línea de lectura ambiental que ayude a reconocer variaciones, formular preguntas de seguimiento y aportar información para la conservación.':'The purpose is not to claim that the ecosystem is deteriorating or to anticipate a threat. The aim is to establish an environmental baseline for recognizing variations, formulating monitoring questions and contributing information for conservation.',
      'Una región de montaña activa':'An active mountain region',
      'El entorno de Pasto se encuentra en una región con actividad sísmica y volcánica monitoreada por el Servicio Geológico Colombiano. Estos antecedentes justifican mantener una mirada territorial responsable, pero no significan que E.N.A. mida o prediga actividad sísmica.':'The area around Pasto is located in a region with seismic and volcanic activity monitored by the Colombian Geological Survey. This context supports responsible territorial awareness, but it does not mean that E.N.A. measures or predicts seismic activity.',
      'Contexto institucional y geológico: CORPONARIÑO (2016) y Servicio Geológico Colombiano (2026). La información sísmica y volcánica no sustituye estudios de amenaza, geotecnia o gestión del riesgo.':'Institutional and geological context: CORPONARIÑO (2016) and the Colombian Geological Survey (2026). Seismic and volcanic information does not replace hazard, geotechnical or risk-management studies.',
      'Exploración aérea':'Aerial exploration',
      'con análisis visual.':'with visual analysis.',
      'La investigación satelital se complementa con una aplicación independiente de exploración aérea. Este módulo integra visualización tridimensional del dron, información de la misión, semaforización de condiciones observadas y herramientas de asistencia mediante inteligencia artificial.':'Satellite research is complemented by an independent aerial exploration application. This module integrates 3D drone visualization, mission information, traffic-light classification of observed conditions and artificial intelligence assistance tools.',
      'Conectar la observación aérea con la lectura del territorio.':'Connecting aerial observation with territorial analysis.',
      'La aplicación reúne una vista 3D del dron, elementos de apoyo a la navegación, clasificación visual mediante semaforización y asistencia basada en inteligencia artificial. Este componente amplía las posibilidades de reconocimiento local y puede aportar registros complementarios para interpretar sectores específicos.':'The application brings together a 3D view of the drone, navigation support elements, visual classification through traffic-light indicators and AI-based assistance. This component expands local reconnaissance capabilities and can provide complementary records for interpreting specific areas.',
      'Abrir aplicación de exploración aérea':'Open aerial exploration application',
      'Chimayoy, en el entorno de Pasto, Nariño, constituye el área piloto de la investigación ambiental de E.N.A. La selección de esta zona permite delimitar la consulta de productos satelitales y estudiar la evolución temporal de variables relacionadas con la vegetación, la precipitación, la humedad del suelo y la temperatura superficial.':'Chimayoy, near Pasto, Nariño, is the pilot area for E.N.A.’s environmental research. Selecting this area makes it possible to define the satellite-product query area and study the temporal evolution of variables related to vegetation, precipitation, soil moisture and land surface temperature.',
      'El análisis satelital constituye la base de la investigación. La observación terrestre mediante dron se plantea como un recurso complementario para documentar puntos críticos y aportar detalle local a la interpretación de los patrones regionales.':'Satellite analysis is the foundation of the research. Ground observation using a drone is proposed as a complementary resource for documenting points of interest and adding local detail to the interpretation of regional patterns.',
      'Las fotografías documentan el entorno del Centro Ambiental Chimayoy y ayudan a contextualizar el área de estudio. No sustituyen las imágenes satelitales ni se utilizan como mediciones cuantitativas.':'The photographs document the surroundings of the Chimayoy Environmental Center and help provide context for the study area. They do not replace satellite imagery and are not used as quantitative measurements.',
      'La capa del mapa muestra imágenes satelitales para ubicar visualmente el área de estudio. Los gráficos cuantitativos se calculan a partir de los archivos científicos descargados y filtrados por coordenadas; una imagen satelital no sustituye los valores de las series procesadas.':'The map layer displays satellite imagery to help locate the study area visually. Quantitative charts are calculated from scientific files downloaded and filtered by coordinates; a satellite image does not replace the values in the processed time series.',
      'Polígono de estudio · Chimayoy':'Study polygon · Chimayoy',
      'Selecciona una variable y consulta todos sus registros disponibles, un año o un mes específico. Puedes comparar periodos, explorar las gráficas y descargar la serie filtrada junto con sus metadatos.':'Select a variable and view all available records, a specific year or a specific month. Compare periods, explore charts and download the filtered series with its metadata.',
      'Conectar tecnología,':'Connecting technology,',
      'datos y territorio.':'data and territory.',
      'La observación satelital permite reconocer patrones regionales y cambios de largo plazo. El subsistema UAV proyectado complementará ese análisis con imágenes RGB georreferenciadas y observaciones localizadas, una vez se realicen los vuelos y se documenten sus condiciones de captura.':'Satellite observation makes it possible to identify regional patterns and long-term changes. The planned UAV subsystem will complement this analysis with georeferenced RGB images and localized observations once flights have been conducted and their capture conditions documented.',
      'Ingeniería Electrónica · Séptimo semestre':'Electronic Engineering · Seventh semester',
      'Ingeniería Electrónica · Décimo semestre':'Electronic Engineering · Tenth semester',
      'Ingeniería de Sistemas · Cuarto semestre':'Systems Engineering · Fourth semester',
      '¿Cómo interpretar estos gráficos?':'How should these charts be interpreted?',
    };
    {
      const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
      const textNodes=[];
      while(walker.nextNode()) textNodes.push(walker.currentNode);
      textNodes.forEach(node=>{
        if(lang==='en'){
          const raw=node.nodeValue, trimmed=raw.trim();
          if(remainingEN[trimmed]!==undefined){
            if(!Object.prototype.hasOwnProperty.call(node,'__enaOriginalText')) node.__enaOriginalText=raw;
            const original=node.__enaOriginalText;
            const lead=original.match(/^\\s*/)?.[0]||'', tail=original.match(/\\s*$/)?.[0]||'';
            node.nodeValue=lead+remainingEN[trimmed]+tail;
          }
        }else if(Object.prototype.hasOwnProperty.call(node,'__enaOriginalText')){
          node.nodeValue=node.__enaOriginalText;
        }
      });
      const attrEN={
        'aria-label':{'Semáforo de riesgo':'Risk traffic light','Seleccionar centro de celda de la cuadrícula GPM':'Select GPM grid-cell center','Cerrar menú':'Close menu','E.N.A. inicio':'E.N.A. home'},
        'alt':{'Paisaje del Centro Ambiental Chimayoy':'Landscape of the Chimayoy Environmental Center','Vista aérea del entorno de Chimayoy':'Aerial view of the Chimayoy surroundings','Mapa de localización de Chimayoy':'Chimayoy location map'},
        'title':{'Consultar y descargar archivos':'View and download files','Volver arriba':'Back to top'}
      };
      Object.entries(attrEN).forEach(([attr,dict])=>document.querySelectorAll('['+attr+']').forEach(node=>{
        const v=node.getAttribute(attr);
        if(lang==='en'&&dict[v]){
          const originalAttr='data-ena-original-'+attr;
          if(!node.hasAttribute(originalAttr))node.setAttribute(originalAttr,v);
          node.setAttribute(attr,dict[v]);
        }else{
          const originalAttr='data-ena-original-'+attr;
          if(lang==='es'&&node.hasAttribute(originalAttr)){
            node.setAttribute(attr,node.getAttribute(originalAttr));
          }
        }
      }));
    }
    document.querySelectorAll('.lang-option').forEach(b=>{const active=b.dataset.lang===lang;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
    if(el('variable-select')&&Object.keys(datasets).length){updateResultCards();render();}
    const currentStatus=el('file-status');
    if(currentStatus && currentStatus.dataset.loadState==='error'){
      currentStatus.textContent=lang==='en'
        ?'Data files could not be loaded. Run E.N.A. through an HTTP server from the project folder.'
        :'No fue posible cargar los datos. Ejecuta E.N.A. mediante un servidor HTTP desde la carpeta del proyecto.';
    }
  }
  document.querySelectorAll('.lang-option').forEach(b=>b.addEventListener('click',()=>setLanguage(b.dataset.lang)));
  // E.N.A. opens in English by default. The EN/ES controls switch the full interface.
  setLanguage('en');
  const initialMode=el('time-mode')?.value||'all';el('year-start')?.classList.toggle('hidden',initialMode==='all');el('year-end')?.classList.toggle('hidden',initialMode!=='range');el('year-until')?.classList.toggle('hidden',initialMode!=='range');el('month-select')?.classList.toggle('hidden',initialMode!=='month');

  loadDatasets();loadCatalog();addGeospatialLayers();
})();
