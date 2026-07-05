
const DB = window.WORK_LIB;
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
const params = new URLSearchParams(location.search);
const page = document.body.dataset.page;
function tagHtml(tags=[]){return tags.map(t=>`<span class="tag">${t}</span>`).join('')}
function miniTags(tags=[]){return `<div class="mini-tags">${tags.slice(0,4).map(t=>`<span>${t}</span>`).join('')}</div>`}
function activeNav(){ $$('[data-nav]').forEach(a=>{ if(a.dataset.nav===page) a.classList.add('active') }) }
function issueLink(id){return `issue.html?id=${encodeURIComponent(id)}`}
function groupBy(arr,key){return arr.reduce((m,x)=>{const k=typeof key==='function'?key(x):x[key];(m[k]||(m[k]=[])).push(x);return m},{})}
function allDocs(){
  return [
    ...DB.issues.map(x=>({...x, kind:'每日简报', url:issueLink(x.id)})),
    ...DB.magazines.map(x=>({...x, kind:'半月刊', date:x.period, url:`issue.html?id=${x.id}`})),
    ...DB.inspirations.map(x=>({...x, kind:'灵感库', date:x.category, url:`issue.html?id=${x.id}`})),
    ...DB.methods.map(x=>({...x, kind:'方法论', date:x.category, url:`issue.html?id=${x.id}`})),
    ...DB.management.map(x=>({...x, kind:'管理视角', url:`issue.html?id=${x.id}`}))
  ]
}
function findDoc(id){return allDocs().find(x=>x.id===id)}
function renderHome(){
  const issue = DB.issues.find(x=>x.id===DB.meta.homeIssue) || DB.issues[0];
  $('#homeTitle').textContent = issue.title; $('#homeSummary').textContent = issue.summary; $('#homeTags').innerHTML = tagHtml(issue.tags); $('#homeIssueLink').href = issueLink(issue.id);
  $('#homeWeek').innerHTML = `${DB.meta.week}<br><small>${DB.meta.weekRange}</small>`;
  $('#homeStatsCard').innerHTML = Object.entries(DB.meta.weeklyStats).map(([k,v])=>`<div><b>${v}</b><span>${k}</span></div>`).join('');
  $('#homeNext').textContent = `下次更新：${DB.meta.nextUpdate}`;
  $('#homeStats').innerHTML = Object.entries(DB.meta.weeklyStats).map(([k,v])=>`<div><b>${v}</b><span>${k}</span></div>`).join('');
  const tags = [...new Set(allDocs().flatMap(d=>d.tags||[]))].slice(0,16); $('#homeHotTags').innerHTML = tags.map(t=>`<span>${t}</span>`).join('');
}
function renderTree(items, getGroup, currentId){
  const root = $('#treeRoot'); if(!root) return;
  const groups = groupBy(items, getGroup);
  root.innerHTML = Object.entries(groups).map(([g,docs])=>`<div class="tree-group"><p class="tree-group-title">${g}</p>${docs.map(d=>`<a class="tree-link ${d.id===currentId?'active':''}" href="${issueLink(d.id)}">${d.date?String(d.date).replace('2026-','').replace('2026年',''):''} ${d.title}</a>`).join('')}</div>`).join('');
}
function row(d){return `<a class="doc-row" href="${issueLink(d.id)}"><div class="doc-date">${d.date||d.period||d.category||''}<br>${d.type||d.kind||''}</div><div><h2 class="doc-title">${d.title}</h2><p class="doc-summary">${d.summary||''}</p>${miniTags(d.tags||[])}</div><div class="doc-meta">${d.readTime||'查看'} →</div></a>`}
function renderList(items, groupFn){
  renderTree(items, groupFn);
  $('#contentRoot').innerHTML = `<div class="doc-list">${items.map(row).join('')}</div>`;
}
function normalizeItem(item, kind){
  return {...item, date:item.date||item.period||item.category, type:item.type||kind, kind};
}
function renderLibrary(){
  if(page==='daily') renderList(DB.issues, x=>x.month);
  if(page==='magazine') renderList(DB.magazines.map(x=>normalizeItem(x,'半月刊')), x=>'半月刊');
  if(page==='inspiration') renderList(DB.inspirations.map(x=>normalizeItem(x,'灵感库')), x=>x.category);
  if(page==='methods') renderList(DB.methods.map(x=>normalizeItem(x,'方法论')), x=>x.category);
  if(page==='management') renderList(DB.management.map(x=>normalizeItem(x,'管理视角')), x=>x.category);
}
function renderSection(sec){
  let html = `<section class="reader-section"><h2>${sec.heading}</h2>`;
  if(sec.body) html += sec.body.map(p=>`<p>${p}</p>`).join('');
  if(sec.items) html += sec.items.map(it=>`<div class="insight-item"><h3>${it.title}</h3><p>${it.body}</p>${it.takeaway?`<p class="takeaway"><strong>可转化：</strong>${it.takeaway}</p>`:''}</div>`).join('');
  html += `</section>`; return html;
}
function renderReader(){
  const id = params.get('id') || DB.meta.homeIssue; const doc = findDoc(id);
  renderTree(allDocs(), x=>x.kind || x.type || '文档', id);
  if(!doc){ $('#readerRoot').innerHTML='<p class="empty">没有找到这条内容。</p>'; return; }
  let sections = doc.sections || [];
  let sourceHtml = '';
  if(doc.sources && doc.sources.length) sourceHtml = `<div class="source-list"><strong>资料来源 / 参考线索：</strong>${doc.sources.map(s=>`<p>${s}</p>`).join('')}</div>`;
  if(doc.steps){sections=[{heading:'方法步骤', body:doc.steps}]}
  if(doc.content){sections=[{heading:'内容说明', body:doc.content}]}
  $('#readerRoot').innerHTML = `<div class="reader-top"><span class="reader-type">${doc.kind||doc.type||doc.category||'文档'} · ${doc.date||doc.period||''}</span><h1>${doc.title}</h1><p class="reader-summary">${doc.summary||''}</p><div class="tag-row">${tagHtml(doc.tags||[])}</div>${doc.mainLine?`<p class="takeaway"><strong>今日主线：</strong>${doc.mainLine}</p>`:''}</div>${sections.map(renderSection).join('')}${sourceHtml}`;
}
function renderSearch(){
  const input=$('#searchInput'), root=$('#searchResults');
  const docs=allDocs();
  function go(q=''){
    q=q.trim().toLowerCase();
    const filtered = q?docs.filter(d=>JSON.stringify(d).toLowerCase().includes(q)):docs.slice(0,12);
    root.innerHTML = filtered.length?`<div class="doc-list">${filtered.map(row).join('')}</div>`:`<p class="empty">没有找到相关内容。</p>`;
  }
  input.addEventListener('input',()=>go(input.value)); go('');
}
activeNav();
if(page==='home') renderHome();
if(['daily','magazine','inspiration','methods','management'].includes(page)) renderLibrary();
if(page==='issue') renderReader();
if(page==='search') renderSearch();
