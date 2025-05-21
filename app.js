
document.addEventListener('DOMContentLoaded', () => {
    let APP_DATA;
    try { /* ... (JSON parsing) ... */
        const DATA_ELEMENT = document.getElementById('HR_DATA_JSON');
        if (!DATA_ELEMENT) { console.error('CRITICAL: #HR_DATA_JSON not found!'); alert('Ошибка: Не найден элемент данных HR_DATA_JSON.'); return; }
        const jsonDataText = DATA_ELEMENT.textContent || "";
        if (jsonDataText.trim() === "" || jsonDataText.trim() === "%%DATA_JSON%%" || jsonDataText.trim().length < 2) { console.error('CRITICAL: JSON data empty or placeholder. Text:', jsonDataText); alert('Ошибка: Данные для дашборда пусты.'); return; }
        APP_DATA = JSON.parse(jsonDataText);
    } catch (e) { console.error('CRITICAL: Failed to parse APP_DATA JSON.', e); const d = document.getElementById('HR_DATA_JSON')?.textContent.substring(0,500)+"..."; console.error('Problematic JSON (first 500 chars):',d); alert('Критическая ошибка: Не удалось обработать данные. См. консоль (F12). Данные: '+d); return; }
    if (!APP_DATA) { console.error('CRITICAL: APP_DATA undefined.'); alert('Критическая ошибка: APP_DATA не определена.'); return; }

    if (typeof TomSelect === 'undefined') { console.error("CRITICAL: TomSelect library is not loaded! Filters will not work.");}
    if (typeof ChartDataLabels === 'undefined') { console.warn("ChartDataLabels plugin not found."); } 
    else { Chart.register(ChartDataLabels); Chart.defaults.set('plugins.datalabels', { /* ... как в v19.11 ... */ color: function(context) { const bgC = context.dataset.backgroundColor; if (typeof bgC === 'string' && bgC !== 'transparent' && bgC !== 'rgba(0, 0, 0, 0)') { try { let p = bgC.match(/[\d.]+/g); if(p && p.length >= 3) { const r=parseInt(p[0]),g=parseInt(p[1]),b=parseInt(p[2]); const br=(r*299+g*587+b*114)/1000; return br > 125 ? '#444':'#fff';}}catch(e){}} return document.documentElement.getAttribute('data-bs-theme')==='dark'?'#ddd':'#333';}, font: { weight: 'bold', size: 10 }, formatter: function(v) { if (typeof v === 'number') return Math.round(v); return v; }, anchor: 'center', align: 'center', display: function(ctx) { return ctx.dataset.data[ctx.dataIndex] > 0 && ctx.dataset.data[ctx.dataIndex] !== null; }}); }
    
    const qs = (selector, parent = document) => parent.querySelector(selector);
    const qsa = (selector, parent = document) => parent.querySelectorAll(selector);
    const branchCharts = {}; 

    const stickyPageTopPanel = qs('#sticky-page-top-panel');
    const mainTableControlsStickyBlock = qs('#main-table-controls-sticky-block'); 
    const mainContentArea = qs('#main-content-area'); 
    const mainHrTableThead = qs('#main-hr-table thead');
    let isMainTableTabActive = true; 

    function adjustStickyLayout() {
        if (!stickyPageTopPanel || !mainContentArea || !mainHrTableThead || !mainTableControlsStickyBlock) {
            return;
        }
        
        stickyPageTopPanel.classList.remove('sticky-panel-active');
        mainHrTableThead.classList.remove('sticky-thead-active');
        mainContentArea.style.paddingTop = '0px';
        mainHrTableThead.style.top = 'auto';
        // mainTableControlsStickyBlock.style.display = 'none'; // Управляется ниже
        stickyPageTopPanel.style.display = '';


        if (isMainTableTabActive) {
            mainTableControlsStickyBlock.style.display = ''; 
            stickyPageTopPanel.classList.add('sticky-panel-active');
            mainHrTableThead.classList.add('sticky-thead-active');
            
            requestAnimationFrame(() => { 
                const topPanelHeight = stickyPageTopPanel.offsetHeight;
                mainContentArea.style.paddingTop = topPanelHeight + 'px';
                mainHrTableThead.style.top = topPanelHeight + 'px';
            });

        } else { 
            mainTableControlsStickyBlock.style.display = 'none'; 
            stickyPageTopPanel.classList.add('sticky-panel-active'); // Панель с header и nav-tabs остается липкой

            requestAnimationFrame(() => {
                const headerHeight = qs('.header', stickyPageTopPanel)?.offsetHeight || 0;
                const navTabsHeight = qs('.branch-tabs-nav-container', stickyPageTopPanel)?.offsetHeight || 0;
                const reducedStickyHeight = headerHeight + navTabsHeight;
                
                mainContentArea.style.paddingTop = reducedStickyHeight + 'px';
                // Шапка основной таблицы не должна быть sticky, т.к. сама таблица не видна (или не активна)
                mainHrTableThead.classList.remove('sticky-thead-active');
                mainHrTableThead.style.top = 'auto'; 
            });
        }
    }
    
    try { 
        const logoContainer = qs('#logo-container'); if (logoContainer && APP_DATA.svg_logo) logoContainer.innerHTML = APP_DATA.svg_logo;
        // Убедимся, что mainTableControlsStickyBlock существует перед поиском в нем
        const genTimeSpan = mainTableControlsStickyBlock ? qs('#generation-time-span', mainTableControlsStickyBlock) : null; 
        if (genTimeSpan && APP_DATA.generation_time) genTimeSpan.textContent = 'Отчёт: ' + APP_DATA.generation_time;
    } catch(e) { console.error("Error UI setup:", e); }
    
    const themeSwitchCheckbox = qs('#theme-switch-checkbox');
    function applyTheme(theme, updateSwitch = true) { 
        document.documentElement.setAttribute('data-bs-theme', theme); localStorage.setItem('dashboardTheme', theme);
        if (updateSwitch && themeSwitchCheckbox) themeSwitchCheckbox.checked = theme === 'dark';
        Object.values(branchCharts).forEach(cI => { if (cI && cI.ctx) cI.update(); });
        requestAnimationFrame(adjustStickyLayout); 
    }
    const savedTheme = localStorage.getItem('dashboardTheme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    if (themeSwitchCheckbox) themeSwitchCheckbox.checked = savedTheme === 'dark'; 
    applyTheme(savedTheme, false); 
    
    themeSwitchCheckbox?.addEventListener('change', () => { applyTheme(themeSwitchCheckbox.checked ? 'dark' : 'light', false); });
    
    const formatters = { percent: val => (parseFloat(val) * 100).toFixed(1) + '%', decimal: val => parseFloat(val).toFixed(1), integer_ratio: arrVal => Array.isArray(arrVal) && arrVal.length === 2 ? String(arrVal[0]) + ' / ' + String(arrVal[1]) : (arrVal || '·'), integer: val => parseInt(val, 10), default: val => val === null || val === undefined ? '·' : val };
    function getKpiValueDisplay(kpiConfig, value, periodType = 'default') { if (value === null || value === undefined || (typeof value === 'number' && isNaN(value))) return { text: '·', className: '' }; const formatter = formatters[kpiConfig.fmt] || formatters.default; let text = formatter(value); let className = ''; const valToCheck = Array.isArray(value) ? value[0] : parseFloat(value); if (kpiConfig.kls === 'turn') { let limit; if (periodType === 'years') limit = kpiConfig.limit_year_forecast; else if (periodType === 'quarters') limit = kpiConfig.limit_quarter; else if (periodType === 'months') limit = kpiConfig.limit_month; if (limit !== undefined && kpiConfig.higher_is_worse && valToCheck > limit) className = 'kpi-value-bad'; } else if (kpiConfig.kls === 'staff') { if (kpiConfig.limit !== undefined && !kpiConfig.higher_is_worse && valToCheck < kpiConfig.limit) className = 'kpi-value-bad'; } else if (kpiConfig.kls === 'enps') { className = ''; if (kpiConfig.plan !== undefined && kpiConfig.plan !== 0 && value !== null && !isNaN(value)) { const fulfillment = ((value / kpiConfig.plan) * 100).toFixed(0); text += ' (' + fulfillment + '%)'; } } else if (kpiConfig.kls !== 'cr' && kpiConfig.limit !== undefined && kpiConfig.higher_is_worse !== undefined ) { if (kpiConfig.higher_is_worse) { if (valToCheck > kpiConfig.limit) className = 'kpi-value-bad';} else { if (valToCheck < kpiConfig.limit) className = 'kpi-value-bad';} } return { text, className }; }
    function createTomSelectInstance(selector, options, items, placeholder, onChangeCallback) { if (typeof TomSelect === 'undefined') { return null;} const el = qs(selector); if (!el) { return null; } return new TomSelect(el, { plugins: ['remove_button'], options: options.map(v => ({ value: String(v), text: String(v) })), items: items.map(String), placeholder, onChange: onChangeCallback, hideSelected: true, }); }
    function createKpiCheckboxes(containerId, kpisConfig, initialStates, isSingleSelect, onChangeCallback, storageKey, forBranchTab = false) { const container = qs(containerId); if (!container) { return; } container.innerHTML = ''; const activeKpis = { ...initialStates }; const kpisToDisplay = kpisConfig.filter(kpi => !(forBranchTab && kpi.kls === 'enps' && kpi.agg_rules.quarter === 'skip' && kpi.agg_rules.month === 'skip')); kpisToDisplay.forEach((kpi, index) => { let isChecked = false; if (isSingleSelect) { let dKpiIdx = 0; if (forBranchTab && kpisToDisplay.length > 1 && kpisToDisplay[0].kls === 'enps' && kpisToDisplay[0].agg_rules.quarter ==='skip') { const nEIdx = kpisToDisplay.findIndex(k => !(k.kls === 'enps' && k.agg_rules.quarter ==='skip')); if (nEIdx !== -1) dKpiIdx = nEIdx; } isChecked = (Object.keys(activeKpis).length === 0 && index === dKpiIdx) || activeKpis[kpi.kls]; if (isChecked) { Object.keys(activeKpis).forEach(key => activeKpis[key] = false); activeKpis[kpi.kls] = true; } } else { isChecked = activeKpis[kpi.kls] !== false; } const label = document.createElement('label'); label.className = 'cb'; label.innerHTML = '<input type="checkbox" data-kls="' + kpi.kls + '" ' + (isChecked ? 'checked' : '') + '><span>' + kpi.name + '</span>'; container.appendChild(label); }); container.addEventListener('change', e => { if (!e.target.matches('input[type="checkbox"]')) return; const kls = e.target.dataset.kls; if (isSingleSelect) { container.querySelectorAll('input').forEach(inp => { const iKls = inp.dataset.kls; const cur = inp === e.target; inp.checked = cur; activeKpis[iKls] = cur; }); } else { activeKpis[kls] = e.target.checked; } if (storageKey) localStorage.setItem(storageKey, JSON.stringify(activeKpis)); onChangeCallback(activeKpis); requestAnimationFrame(adjustStickyLayout); }); return activeKpis; }
        
    const mainTable = qs('#main-hr-table'); 
    const kpiCheckboxBarMain = mainTableControlsStickyBlock ? qs('#kpi-checkbox-bar', mainTableControlsStickyBlock) : null; 
    const yearSelectMain = mainTableControlsStickyBlock ? qs('#year-select', mainTableControlsStickyBlock) : null; 
    const quarterSelectMain = mainTableControlsStickyBlock ? qs('#quarter-select', mainTableControlsStickyBlock) : null; 
    const monthSelectMain = mainTableControlsStickyBlock ? qs('#month-select', mainTableControlsStickyBlock) : null;
    const antiTopNRadios = mainTableControlsStickyBlock ? qsa('input[name="antiTopN"]', mainTableControlsStickyBlock) : []; 
    const antiTopKpiSourceSelect = mainTableControlsStickyBlock ? qs('#anti-top-kpi-source', mainTableControlsStickyBlock) : null; 
    
    const initialMainKpis = JSON.parse(localStorage.getItem('mainDashboardKpis') || '{}'); 
    let mainFilters = JSON.parse(localStorage.getItem('mainDashboardFilters')) || { years: (APP_DATA.years && APP_DATA.years.length > 0) ? [APP_DATA.years[APP_DATA.years.length - 1]] : [], quarters: [], months: [] }; 
    if (mainFilters.years.length === 0 && APP_DATA.years && APP_DATA.years.length > 0) mainFilters.years = [APP_DATA.years[APP_DATA.years.length - 1]]; 
    let activeMainKpis = {};
    
    let activeAntiTopConfig = { kpiSource: antiTopKpiSourceSelect ? antiTopKpiSourceSelect.value : 'turn', n: 0 };
    const currentAntiTopNRadio = mainTableControlsStickyBlock ? qs('input[name="antiTopN"]:checked', mainTableControlsStickyBlock) : null; 
    if (currentAntiTopNRadio) activeAntiTopConfig.n = parseInt(currentAntiTopNRadio.value, 10);

    function updateAntiTopConfigAndRender() { 
        const selectedNRadio = mainTableControlsStickyBlock ? qs('input[name="antiTopN"]:checked', mainTableControlsStickyBlock) : null; 
        activeAntiTopConfig.n = selectedNRadio ? parseInt(selectedNRadio.value, 10) : 0; 
        activeAntiTopConfig.kpiSource = antiTopKpiSourceSelect ? antiTopKpiSourceSelect.value : 'turn'; 
        if (antiTopKpiSourceSelect) antiTopKpiSourceSelect.disabled = activeAntiTopConfig.n === 0; 
        renderMainTable(); 
    }
    antiTopNRadios.forEach(radio => radio.addEventListener('change', updateAntiTopConfigAndRender));
    if (antiTopKpiSourceSelect) { antiTopKpiSourceSelect.addEventListener('change', updateAntiTopConfigAndRender); antiTopKpiSourceSelect.disabled = activeAntiTopConfig.n === 0; }

    function renderMainTable() { 
        if (!mainTable || !mainHrTableThead) return;
        requestAnimationFrame(adjustStickyLayout); 

        const tHead = mainTable.tHead||mainTable.createTHead(); const tBody = mainTable.tBodies[0]||mainTable.createTBody();
        tHead.innerHTML=''; tBody.innerHTML=''; const cols=[];
        const yIterMain=mainFilters.years.length?mainFilters.years:(APP_DATA.years||[]);
        APP_DATA.kpis.forEach(kC=>{if(!activeMainKpis[kC.kls])return;if(kC.kls==='enps'){yIterMain.forEach(y=>{cols.push({kpi:kC,periodType:'years',periodKey:String(y),header:kC.name+' '+y});});return;}if(mainFilters.months.length){mainFilters.months.forEach(m=>yIterMain.forEach(y=>{cols.push({kpi:kC,periodType:'months',periodKey:m+'_'+y,header:kC.name+' '+m.slice(0,3)+'.'+String(y).slice(2)});}));}else if(mainFilters.quarters.length){mainFilters.quarters.forEach(q=>yIterMain.forEach(y=>{cols.push({kpi:kC,periodType:'quarters',periodKey:q+'_'+y,header:kC.name+' '+q+'.'+String(y).slice(2)});}));}else if(!mainFilters.months.length&&!mainFilters.quarters.length&&yIterMain.length){yIterMain.forEach(y=>{cols.push({kpi:kC,periodType:'years',periodKey:String(y),header:kC.name+' '+y});});}});
        if(!cols.length&&Object.keys(activeMainKpis).some(k=>activeMainKpis[k])&&yIterMain.length>0){const dY=yIterMain.length?yIterMain:(APP_DATA.years&&APP_DATA.years.length>0?[APP_DATA.years[APP_DATA.years.length-1]]:[]);APP_DATA.kpis.forEach(kC=>{if(!activeMainKpis[kC.kls])return;dY.forEach(y=>{cols.push({kpi:kC,periodType:'years',periodKey:String(y),header:kC.name+' '+y});});});}
        let branchesToRender = [...APP_DATA.branches]; 
        if (activeAntiTopConfig.n > 0 && APP_DATA.anti_tops && cols.length > 0) { const qualifyingBranches = new Set(); cols.forEach(colDef => { const kpiForCol = colDef.kpi.kls; const periodTypePlural = colDef.periodType; const periodKey = colDef.periodKey; let kpisToCheckForAntiTop = []; if (activeAntiTopConfig.kpiSource === 'both') kpisToCheckForAntiTop = ['turn', 'staff']; else kpisToCheckForAntiTop = [activeAntiTopConfig.kpiSource]; if (kpisToCheckForAntiTop.includes(kpiForCol)) { const antiTopList = APP_DATA.anti_tops[kpiForCol]?.[periodTypePlural]?.[periodKey]; if (antiTopList) { antiTopList.slice(0, activeAntiTopConfig.n).forEach(item => qualifyingBranches.add(item.branch)); } } }); if (qualifyingBranches.size > 0) { branchesToRender = APP_DATA.branches.filter(b => qualifyingBranches.has(b)); } else { branchesToRender = []; } }
        const headerRow=tHead.insertRow();const thBranch=document.createElement('th');thBranch.textContent='Филиал';thBranch.className='text-center';headerRow.appendChild(thBranch); cols.forEach(c=>{const th=document.createElement('th');th.textContent=c.header;th.className='text-center';headerRow.appendChild(th);});
        if (branchesToRender.length === 0 && (activeAntiTopConfig.n > 0 || (APP_DATA.branches.length > 0 && cols.length > 0 && yIterMain.length > 0) )) { const row = tBody.insertRow(); const cell = row.insertCell(); cell.colSpan = cols.length + 1; cell.textContent = activeAntiTopConfig.n > 0 ? "Нет филиалов, Анти-ТОП." : "Нет данных."; cell.className = 'text-center text-muted p-3'; } else if (branchesToRender.length === 0 && APP_DATA.branches.length === 0 && yIterMain.length > 0 && cols.length > 0 ) { const row = tBody.insertRow(); const cell = row.insertCell(); cell.colSpan = cols.length + 1; cell.textContent = "Нет данных о филиалах."; cell.className = 'text-center text-muted p-3'; } else { branchesToRender.forEach(bN=>{ const row=tBody.insertRow();const tdB=row.insertCell();tdB.textContent=bN;tdB.className='clickable-cell text-start';tdB.onclick=()=>openBranchTab(bN); cols.forEach(cD=>{ const cell=row.insertCell();const kBD=APP_DATA.data[bN]?.[cD.kpi.kls];const val=kBD?.[cD.periodType]?.[cD.periodKey]; const dsp=getKpiValueDisplay(cD.kpi,val,cD.periodType); cell.textContent=dsp.text;cell.className='text-end '+dsp.className; }); }); }
    }

    if (kpiCheckboxBarMain && typeof TomSelect !== 'undefined') activeMainKpis = createKpiCheckboxes('#kpi-checkbox-bar', APP_DATA.kpis, initialMainKpis, false, (nS)=>{activeMainKpis=nS;renderMainTable(); requestAnimationFrame(adjustStickyLayout);},'mainDashboardKpis');
    const tsYMain = (yearSelectMain && typeof TomSelect !== 'undefined') ? createTomSelectInstance('#year-select', APP_DATA.years||[], mainFilters.years, 'Год', (v)=>{mainFilters.years=v.map(Number);localStorage.setItem('mainDashboardFilters',JSON.stringify(mainFilters));renderMainTable();}) : null;
    let tsQMainRef; let tsMMainRef;   
    if(quarterSelectMain && typeof TomSelect !== 'undefined') tsQMainRef = createTomSelectInstance('#quarter-select',APP_DATA.quarters||[],mainFilters.quarters,'Квартал',(v)=>{mainFilters.quarters=v;if(v.length>0&&tsMMainRef)tsMMainRef.clear();localStorage.setItem('mainDashboardFilters',JSON.stringify(mainFilters));renderMainTable();});
    if(monthSelectMain && typeof TomSelect !== 'undefined') tsMMainRef = createTomSelectInstance('#month-select',APP_DATA.months||[],mainFilters.months,'Месяц',(v)=>{mainFilters.months=v;if(v.length>0&&tsQMainRef)tsQMainRef.clear();localStorage.setItem('mainDashboardFilters',JSON.stringify(mainFilters));renderMainTable();});
    
    const resetFiltersButton = mainTableControlsStickyBlock ? qs('#reset-filters-btn', mainTableControlsStickyBlock) : null;
    resetFiltersButton?.addEventListener('click', ()=>{ mainFilters={years:(APP_DATA.years&&APP_DATA.years.length>0)?[APP_DATA.years[APP_DATA.years.length-1]]:[],quarters:[],months:[]};tsYMain?.setValue(mainFilters.years.map(String),true);tsQMainRef?.clear(true);tsMMainRef?.clear(true);localStorage.setItem('mainDashboardFilters',JSON.stringify(mainFilters));const dK={};APP_DATA.kpis.forEach(k=>dK[k.kls]=true);if(kpiCheckboxBarMain)activeMainKpis=createKpiCheckboxes('#kpi-checkbox-bar',APP_DATA.kpis,dK,false,(nS)=>{activeMainKpis=nS;renderMainTable();requestAnimationFrame(adjustStickyLayout);},'mainDashboardKpis');localStorage.setItem('mainDashboardKpis',JSON.stringify(activeMainKpis)); qs('input[name="antiTopN"][value="0"]').checked = true; updateAntiTopConfigAndRender(); });
    
    const excelExportLabel=qs('#excel-export-label');excelExportLabel?.addEventListener('click',()=>{if(excelExportLabel.classList.contains('is-loading')||excelExportLabel.classList.contains('is-done'))return;excelExportLabel.classList.add('is-loading');setTimeout(()=>{if(!mainTable){excelExportLabel.classList.remove('is-loading');return;}const aoa=[];const hCs=mainTable.tHead.rows[0]?.cells;if(hCs)aoa.push(Array.from(hCs).map(c=>c.textContent));Array.from(mainTable.tBodies[0].rows).forEach(r=>{aoa.push(Array.from(r.cells).map(c=>c.textContent.trim()));});try{const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(aoa),"HR Data");XLSX.writeFile(wb,"HR_Dashboard_Export.xlsx");excelExportLabel.classList.remove('is-loading');excelExportLabel.classList.add('is-done');}catch(err){excelExportLabel.classList.remove('is-loading');}setTimeout(()=>{excelExportLabel.classList.remove('is-done');},2500);},700);});
    if(APP_DATA.years&&APP_DATA.years.length>0){renderMainTable();}else{if(mainTable&&mainTable.tBodies[0])mainTable.tBodies[0].innerHTML="<tr><td colspan='100%'>Нет данных.</td></tr>";}
    
    window.addEventListener('load', () => requestAnimationFrame(adjustStickyLayout));
    window.addEventListener('resize', () => requestAnimationFrame(adjustStickyLayout));
    requestAnimationFrame(adjustStickyLayout); 
    
    const branchTabsNavContainer = qs('#branch-tabs-nav'); 
    const dashboardTabContent = qs('#dashboard-tab-content');
    const branchFiltersState={};const branchKpiState={};

    if (branchTabsNavContainer) {
        branchTabsNavContainer.addEventListener('shown.bs.tab', function(event) {
            isMainTableTabActive = (event.target.id === 'main-table-tab');
            requestAnimationFrame(adjustStickyLayout); 
            if (isMainTableTabActive) { renderMainTable(); }
        });
    }

    function openBranchTab(branchName){const tabSafeBranchName=branchName.replace(/[^a-zA-Z0-9-_]/g,'');const tabId='branch-tab-btn-'+tabSafeBranchName;const paneId='branch-pane-'+tabSafeBranchName;if(qs('#'+tabId)){const et=qs('#'+tabId);if(et)bootstrap.Tab.getOrCreateInstance(et).show();return;}const navItem=document.createElement('li');navItem.className='nav-item';navItem.setAttribute('role','presentation');const tabButton=document.createElement('button');tabButton.className='nav-link';tabButton.id=tabId;tabButton.setAttribute('data-bs-toggle','pill');tabButton.setAttribute('data-bs-target','#'+paneId);tabButton.type='button';tabButton.setAttribute('role','tab');tabButton.setAttribute('aria-controls',paneId);tabButton.setAttribute('aria-selected','false');tabButton.textContent=branchName;const closeIcon=document.createElement('i');closeIcon.className='bi bi-x';closeIcon.setAttribute('title','Закрыть вкладку '+branchName);tabButton.appendChild(closeIcon);navItem.appendChild(tabButton);
    if (branchTabsNavContainer) branchTabsNavContainer.appendChild(navItem); 
    else console.error("#branch-tabs-nav not found for new tab button.");
    closeIcon.addEventListener('click',(e)=>{e.stopPropagation();navItem.remove();qs('#'+paneId)?.remove();if(branchCharts[branchName]){branchCharts[branchName].destroy();delete branchCharts[branchName];}delete branchFiltersState[branchName];delete branchKpiState[branchName];const mt=qs('#main-table-tab');if(mt)bootstrap.Tab.getOrCreateInstance(mt).show();requestAnimationFrame(adjustStickyLayout);});const tabPane=document.createElement('div');tabPane.className='tab-pane fade p-3'; tabPane.id=paneId;tabPane.setAttribute('role','tabpanel');tabPane.setAttribute('aria-labelledby',tabId);tabPane.innerHTML='<div class="row g-2 mb-3 mt-0"><div class="col-md-4"><select id="year-select-'+tabSafeBranchName+'" multiple placeholder="Год"></select></div><div class="col-md-4"><select id="quarter-select-'+tabSafeBranchName+'" multiple placeholder="Квартал"></select></div><div class="col-md-4"><select id="month-select-'+tabSafeBranchName+'" multiple placeholder="Месяц"></select></div></div><div class="cb-bar mb-2" id="kpi-cb-bar-'+tabSafeBranchName+'"></div><div class="table-responsive-lg tbl-wrap mb-3"><table id="table-'+tabSafeBranchName+'" class="table table-bordered table-hover table-sm branch-pane-table"><thead></thead><tbody></tbody></table></div><div class="chart-container"><canvas id="chart-'+tabSafeBranchName+'"></canvas></div>';
    if (dashboardTabContent) dashboardTabContent.appendChild(tabPane); 
    else console.error("#dashboard-tab-content not found for new tab pane.");
    branchFiltersState[branchName]={years:(APP_DATA.years&&APP_DATA.years.length>0)?[APP_DATA.years[APP_DATA.years.length-1]]:[],quarters:[],months:[]};const iKpiFB={};let dKpiIdx=0;if(APP_DATA.kpis.length>1){const nEIdx=APP_DATA.kpis.findIndex(k=>!(k.kls==='enps'&&k.agg_rules.quarter==='skip'));if(nEIdx!==-1)dKpiIdx=nEIdx;}if(APP_DATA.kpis.length>0)iKpiFB[APP_DATA.kpis[dKpiIdx].kls]=true;if(typeof TomSelect!=='undefined')branchKpiState[branchName]=createKpiCheckboxes('#kpi-cb-bar-'+tabSafeBranchName,APP_DATA.kpis,iKpiFB,true,(nS)=>{branchKpiState[branchName]=nS;updateBranchTabData(branchName);},null,true);let tsBY,tsBQ,tsBM;if(typeof TomSelect!=='undefined')tsBY=createTomSelectInstance('#year-select-'+tabSafeBranchName,APP_DATA.years||[],branchFiltersState[branchName].years,'Год',(v)=>{branchFiltersState[branchName].years=v.map(Number);updateBranchTabData(branchName);});if(typeof TomSelect!=='undefined')tsBQ=createTomSelectInstance('#quarter-select-'+tabSafeBranchName,APP_DATA.quarters||[],branchFiltersState[branchName].quarters,'Квартал',(v)=>{branchFiltersState[branchName].quarters=v;if(v.length>0&&tsBM)tsBM.clear();updateBranchTabData(branchName);});if(typeof TomSelect!=='undefined')tsBM=createTomSelectInstance('#month-select-'+tabSafeBranchName,APP_DATA.months||[],branchFiltersState[branchName].months,'Месяц',(v)=>{branchFiltersState[branchName].months=v;if(v.length>0&&tsBQ)tsBQ.clear();updateBranchTabData(branchName);});if(APP_DATA.years&&APP_DATA.years.length>0){updateBranchTabData(branchName);}const ntb=qs('#'+tabId);if(ntb)bootstrap.Tab.getOrCreateInstance(ntb).show();requestAnimationFrame(adjustStickyLayout);}
    function updateBranchTabData(branchName){renderBranchTable(branchName);drawBranchChart(branchName);}
    function renderBranchTable(branchName){const tabSafeBranchName=branchName.replace(/[^a-zA-Z0-9-_]/g,'');const table=qs('#table-'+tabSafeBranchName);if(!table)return;const tH=table.tHead||table.createTHead();const tB=table.tBodies[0]||table.createTBody();tH.innerHTML='';tB.innerHTML='';const cF=branchFiltersState[branchName];const cK=branchKpiState[branchName];const aKls=Object.keys(cK).find(kls=>cK[kls]);if(!aKls)return;const kpiConf=APP_DATA.kpis.find(k=>k.kls===aKls);if(!kpiConf)return;const cols=[];const yIter=cF.years.length?cF.years:(APP_DATA.years||[]);if(kpiConf.kls==='enps'){yIter.forEach(y=>{cols.push({pT:'years',pK:String(y),h:String(y)});});}else{if(cF.months.length){cF.months.forEach(m=>yIter.forEach(y=>{cols.push({pT:'months',pK:m+'_'+y,h:m.slice(0,3)+'.'+String(y).slice(2)});}));}else if(cF.quarters.length){cF.quarters.forEach(q=>yIter.forEach(y=>{cols.push({pT:'quarters',pK:q+'_'+y,h:q+'.'+String(y).slice(2)});}));}else if(yIter.length){yIter.forEach(y=>{cols.push({pT:'years',pK:String(y),h:String(y)});});}}const hr=tH.insertRow();const thK=document.createElement('th');thK.textContent=kpiConf.name;hr.appendChild(thK);cols.forEach(c=>{const th=document.createElement('th');th.textContent=c.h;th.className='text-center';hr.appendChild(th);});const dr=tB.insertRow();const tdKN=dr.insertCell();tdKN.textContent=kpiConf.name;tdKN.className='text-start';cols.forEach(cD=>{const cell=dr.insertCell();const kD=APP_DATA.data[branchName]?.[kpiConf.kls];const val=kD?.[cD.pT]?.[cD.pK];const dsp=getKpiValueDisplay(kpiConf,val,cD.pT);cell.textContent=dsp.text;cell.className='text-end '+dsp.className;});}
    function drawBranchChart(branchName){const tabSafeBranchName=branchName.replace(/[^a-zA-Z0-9-_]/g,'');const canvas=qs('#chart-'+tabSafeBranchName);if(!canvas)return;if(branchCharts[branchName]){branchCharts[branchName].destroy();}const cF=branchFiltersState[branchName];const cK=branchKpiState[branchName];const aKls=Object.keys(cK).find(kls=>cK[kls]);if(!aKls){canvas.style.display='none';return;}const kpiConf=APP_DATA.kpis.find(k=>k.kls===aKls);if(!kpiConf||!APP_DATA.data[branchName]?.[kpiConf.kls]){canvas.style.display='none';return;}const kSData=APP_DATA.data[branchName][kpiConf.kls];const lbls=[];const dSets=[];const chPts=[];const yIterCh=cF.years.length?cF.years:((APP_DATA.years&&APP_DATA.years.length>0)?[APP_DATA.years[APP_DATA.years.length-1]]:[]);if(kpiConf.kls==='enps'){yIterCh.forEach(y=>{const k=String(y);if(kSData.years[k]!==undefined){chPts.push({l:k,v:kSData.years[k]});}}); } else {if(cF.months.length){cF.months.forEach(m=>yIterCh.forEach(y=>{const k=m+'_'+y;if(kSData.months[k]!==undefined){chPts.push({l:m.slice(0,3)+'.'+String(y).slice(2),v:kSData.months[k]});}}));}else if(cF.quarters.length){yIterCh.forEach(y=>{cF.quarters.forEach(q=>{const k=q+'_'+y;if(kSData.quarters[k]!==undefined){chPts.push({l:q+'.'+String(y).slice(2),v:kSData.quarters[k]});}});});}else if(yIterCh.length){yIterCh.forEach(y=>{const k=String(y);if(kSData.years[k]!==undefined){chPts.push({l:k,v:kSData.years[k]});}});}} if(!chPts.length){canvas.style.display='none';return;} canvas.style.display='block';chPts.forEach(dp=>lbls.push(dp.l));const chartPlugins={tooltip:{callbacks:{label:function(ctx){let l=ctx.dataset.label||'';if(l)l+=': ';if(ctx.parsed.y!==null){const kCftt=APP_DATA.kpis.find(k=>k.name===ctx.dataset.label||k.chart_datasets_labels?.includes(ctx.dataset.label)||k.name===kpiConf.name);const aKCn=kCftt||kpiConf;let oV=ctx.raw;if(aKCn.fmt==='integer_ratio'){const pD=chPts[ctx.dataIndex];if(pD&&Array.isArray(pD.v))oV=pD.v;}if(aKCn.fmt==='integer_ratio'&&Array.isArray(oV))l+=formatters.integer_ratio(oV);else{let dV=(Array.isArray(oV)&&typeof oV[0]==='number'&&aKCn.fmt!=='integer_ratio')?oV[0]:ctx.parsed.y;l+=formatters[aKCn.fmt]?formatters[aKCn.fmt](dV):dV;}}return l;}}}}; if(kpiConf.chart_type==='bar'&&typeof ChartDataLabels!=='undefined'){chartPlugins.datalabels={display:ctx=>kpiConf.chart_type==='bar'&&ctx.dataset.data[ctx.dataIndex]>0&&ctx.dataset.data[ctx.dataIndex]!==null,color:function(ctx){const bgC=ctx.dataset.backgroundColor;if(typeof bgC==='string'&&bgC!=='transparent'&&bgC!=='rgba(0,0,0,0)'){try{let p=bgC.match(/[\d.]+/g);if(p&&p.length>=3){const r=parseInt(p[0]),g=parseInt(p[1]),b=parseInt(p[2]);const br=(r*299+g*587+b*114)/1000;return br>125?'#444':'#fff';}}catch(e){}}return document.documentElement.getAttribute('data-bs-theme')==='dark'?'#ddd':'#333';},anchor:'center',align:'center',font:{weight:'bold',size:10},formatter:v=>typeof v==='number'?Math.round(v):v};} if(kpiConf.chart_type==='bar'&&Array.isArray(chPts[0]?.v)&&kpiConf.chart_datasets_labels?.length===chPts[0]?.v.length){kpiConf.chart_datasets_labels.forEach((dL,idx)=>{dSets.push({label:dL,data:chPts.map(dp=>Array.isArray(dp.v)?dp.v[idx]:null),backgroundColor:kpiConf.chart_colors[idx]||Chart.defaults.backgroundColor,borderColor:kpiConf.chart_colors[idx]||Chart.defaults.borderColor,borderWidth:1});});}else{const vals=chPts.map(dp=>Array.isArray(dp.v)?dp.v[0]:dp.v);dSets.push({label:kpiConf.name,data:vals,tension:0.2,fill:false,borderColor:kpiConf.chart_colors[0]||Chart.defaults.borderColor,backgroundColor:kpiConf.chart_colors[0]||Chart.defaults.backgroundColor,borderWidth:kpiConf.chart_type==='line'?2:1});} branchCharts[branchName]=new Chart(canvas,{type:kpiConf.chart_type||'line',data:{labels:lbls,datasets:dSets},options:{responsive:true,maintainAspectRatio:false,scales:{y:{beginAtZero:kpiConf.kls!=='enps'}},plugins:chartPlugins}}); }
});