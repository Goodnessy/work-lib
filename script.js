
const DB=window.WORK_LIB;
const $=s=>document.querySelector(s);
const $$=s=>Array.from(document.querySelectorAll(s));
const page=document.body.dataset.page;
const params=new URLSearchParams(location.search);
const NOTE_KEY='worklib_notes_v15';
const FAV_KEY='worklib_favs_v15';
let currentDocId=null;
let pendingSelection=null;
let editingNoteId=null;

const CATEGORY_LABEL={featured:'本周精选',daily:'每日简报',magazine:'半月刊',inspiration:'灵感库',methods:'方法论',management:'管理视角'};
const CATEGORY_PAGE={featured:'index.html',daily:'daily.html',magazine:'magazine.html',inspiration:'inspiration.html',methods:'methods.html',management:'management.html'};

function escapeHtml(str=''){return String(str).replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]))}
function tagUrl(t){return `search.html?tag=${encodeURIComponent(t)}`}
function tagHtml(tags=[]){return tags.map(t=>`<a class="tag" href="${tagUrl(t)}">${escapeHtml(t)}</a>`).join('')}
function miniTags(tags=[]){return `<div class="mini-tags">${tags.slice(0,4).map(t=>`<span>${escapeHtml(t)}</span>`).join('')}</div>`}
function allDocs(){return [
  ...(DB.featured||[]).map(x=>({...x,kind:x.kind||'本周精选',_category:'featured'})),
  ...(DB.issues||[]).map(x=>({...x,kind:x.type||'每日简报',_category:'daily'})),
  ...(DB.magazines||[]).map(x=>({...x,kind:'半月刊',_category:'magazine'})),
  ...(DB.inspirations||[]).map(x=>({...x,kind:'灵感库',_category:'inspiration'})),
  ...(DB.methods||[]).map(x=>({...x,kind:'方法论',_category:'methods'})),
  ...(DB.management||[]).map(x=>({...x,kind:'管理视角',_category:'management'}))
]}
function findDoc(id){return allDocs().find(d=>d.id===id)}
function docCategory(d){if(!d)return 'daily';return d._category||findDoc(d.id)?._category||params.get('category')||'daily'}
function issueLink(id, docOrCategory){
  let category='';
  if(typeof docOrCategory==='string') category=docOrCategory;
  else if(docOrCategory) category=docOrCategory._category || findDoc(docOrCategory.id)?._category || '';
  if(!category) category=findDoc(id)?._category || '';
  return `issue.html?id=${encodeURIComponent(id)}${category?`&category=${encodeURIComponent(category)}`:''}`;
}
function categoryUrl(category){return CATEGORY_PAGE[category]||'index.html'}
function categoryItems(category){return allDocs().filter(d=>d._category===category)}
function categoryGroupFn(category){
  if(category==='daily') return x=>x.month||String(x.date||'').slice(0,7)||'每日简报';
  if(category==='inspiration'||category==='methods'||category==='management') return x=>x.category||CATEGORY_LABEL[category];
  if(category==='magazine') return x=>x.period||'半月刊';
  if(category==='featured') return x=>'本周精选';
  return x=>x.kind||x.type||'文档';
}
function groupBy(arr,fn){return arr.reduce((a,x)=>{const k=fn(x)||'未分类';(a[k]||(a[k]=[])).push(x);return a},{})}
function activeNav(){
  const map={home:'home',daily:'daily',magazine:'magazine',inspiration:'inspiration',methods:'methods',management:'management'};
  const active = page==='issue' ? (params.get('category')||findDoc(params.get('id'))?._category) : map[page];
  $$('.top-nav a').forEach(a=>{if(a.dataset.nav===active)a.classList.add('active')})
}
function getNotes(){try{return JSON.parse(localStorage.getItem(NOTE_KEY)||'[]')}catch(e){return []}}
function setNotes(notes){localStorage.setItem(NOTE_KEY, JSON.stringify(notes))}
function getFavs(){try{return JSON.parse(localStorage.getItem(FAV_KEY)||'[]')}catch(e){return []}}
function setFavs(favs){localStorage.setItem(FAV_KEY, JSON.stringify(favs))}
function showToast(msg){const t=$('#toast');if(!t){alert(msg);return}t.textContent=msg;t.classList.remove('hidden');setTimeout(()=>t.classList.add('hidden'),2400)}

function renderHome(){
  const issue=(DB.featured||[]).find(x=>x.id===DB.meta.homeFeature)||(DB.featured||[])[0]||DB.issues[0];
  $('#homeTitle').textContent=issue.title;
  $('#homeSummary').textContent=issue.summary;
  $('#homeTags').innerHTML=tagHtml(issue.tags);
  $('#homeIssueLink').href=issueLink(issue.id, 'featured');
  $('#homeWeek').innerHTML=`${DB.meta.week}<br><small>${DB.meta.weekRange}</small>`;
  $('#homeStatsCard').innerHTML=Object.entries(DB.meta.weeklyStats).map(([k,v])=>`<div><b>${escapeHtml(v)}</b><span>${escapeHtml(k)}</span></div>`).join('');
  $('#homeNext').textContent=`下次更新：${DB.meta.nextUpdate}`;
  $('#homeStats').innerHTML=Object.entries(DB.meta.weeklyStats).map(([k,v])=>`<div><b>${escapeHtml(v)}</b><span>${escapeHtml(k)}</span></div>`).join('');
  $('#homeHotTags').innerHTML=(DB.meta.hotTags||[]).map(t=>`<a href="${tagUrl(t)}">${escapeHtml(t)}</a>`).join('')
}

function renderTree(items,getGroup,currentId,category){
  const root=$('#treeRoot');
  if(!root)return;
  items=sortDocs(items);
  const groups=groupBy(items,getGroup);
  const label=CATEGORY_LABEL[category]||'当前栏目';
  const inner=Object.entries(groups).map(([g,docs])=>`<div class="tree-group"><p class="tree-group-title">${escapeHtml(g)}</p>${docs.map(d=>`<a class="tree-link ${d.id===currentId?'active':''}" href="${issueLink(d.id,d)}"><span class="tree-date">${escapeHtml(d.date?String(d.date).replace('2026-','').replace('2026年',''):(d.period||''))}</span>${escapeHtml(d.title)}</a>`).join('')}</div>`).join('');
  const returnLink=category?`<a class="tree-return" href="${categoryUrl(category)}">← 返回${escapeHtml(label)}</a>`:'';
  root.innerHTML=`${returnLink}<details class="tree-details"><summary>展开${escapeHtml(label)}目录</summary>${inner}</details>`
}
function row(d){return `<a class="doc-row" href="${issueLink(d.id,d)}"><div class="doc-date">${escapeHtml(d.date||d.period||d.category||'')}<br>${escapeHtml(d.type||d.kind||'')}</div><div><h2 class="doc-title">${escapeHtml(d.title)}</h2><p class="doc-summary">${escapeHtml(d.summary||'')}</p>${miniTags(d.tags||[])}</div><div class="doc-meta">${escapeHtml(d.readTime||'查看')} →</div></a>`}
function normalizeItem(item,kind,category){return {...item,date:item.date||item.period||item.category,type:item.type||kind,kind,_category:category}}
function sortDocs(items){return [...items].sort((a,b)=>String(b.date||b.period||b.timelineDate||'').localeCompare(String(a.date||a.period||a.timelineDate||'')))}
function compactFilters(items){
  const themes=[...new Set(items.flatMap(x=>x.tags||[]))].slice(0,12);
  const months=[...new Set(items.map(x=>String(x.date||x.period||'').slice(0,7)).filter(Boolean))].slice(0,10);
  const types=[...new Set(items.map(x=>x.type||x.kind||x.category||'文档'))].slice(0,10);
  const pills=a=>a.map(t=>`<a href="search.html?tag=${encodeURIComponent(t)}">${escapeHtml(t)}</a>`).join('');
  return `<div class="library-tools"><div><strong>最近更新</strong><span> 最新内容在最上方</span></div><details><summary>按主题 / 按月份 / 按类型</summary><div class="filter-group"><b>按主题</b>${pills(themes)}</div><div class="filter-group"><b>按月份</b>${months.map(m=>`<a href="search.html?q=${encodeURIComponent(m)}">${escapeHtml(m)}</a>`).join('')}</div><div class="filter-group"><b>按类型</b>${types.map(t=>`<a href="search.html?q=${encodeURIComponent(t)}">${escapeHtml(t)}</a>`).join('')}</div></details></div>`
}
function renderList(items,groupFn,category){items=sortDocs(items);renderTree(items,groupFn,null,category);$('#contentRoot').innerHTML=compactFilters(items)+`<div class="doc-list">${items.map(row).join('')}</div>`}
function renderManagement(){
  const items=DB.management.map(x=>normalizeItem(x,'管理视角','management'));
  renderTree(items,x=>x.category,null,'management');
  const timeline=items.filter(x=>x.category==='动态').sort((a,b)=>String(b.timelineDate||b.date).localeCompare(String(a.timelineDate||a.date)));
  const timelineHtml=`<div class="timeline-card"><h2>动态时间轴</h2><p>只收公开可核验信息；没有新增就明确标注，不用旧内容凑数。</p><div class="timeline">${timeline.map(x=>`<a href="${issueLink(x.id,x)}"><b>${escapeHtml(x.timelineDate||x.date)}</b><span>${escapeHtml(x.event||x.title)}</span></a>`).join('')}</div></div>`;
  const groups=['资料','动态','发言'];
  const groupHtml=groups.map(g=>{const docs=items.filter(x=>x.category===g);return `<section class="mgmt-block"><h2>${g}</h2><div class="doc-list">${docs.map(row).join('')}</div></section>`}).join('');
  $('#contentRoot').innerHTML=compactFilters(items)+timelineHtml+groupHtml
}
function renderLibrary(){
  if(page==='daily')renderList((DB.issues||[]).map(x=>normalizeItem(x,x.type||'每日简报','daily')),x=>x.month,'daily');
  if(page==='magazine')renderList((DB.magazines||[]).map(x=>normalizeItem(x,'半月刊','magazine')),x=>x.period||'半月刊','magazine');
  if(page==='inspiration')renderList((DB.inspirations||[]).map(x=>normalizeItem(x,'灵感库','inspiration')),x=>x.category,'inspiration');
  if(page==='methods')renderList((DB.methods||[]).map(x=>normalizeItem(x,'方法论','methods')),x=>x.category,'methods');
  if(page==='management')renderManagement()
}
function renderSection(sec){
  let html=`<section class="reader-section"><h2>${escapeHtml(sec.heading)}</h2>`;
  if(sec.body)html+=sec.body.map(p=>`<p>${escapeHtml(p)}</p>`).join('');
  if(sec.items)html+=sec.items.map(it=>`<div class="insight-item"><h3>${escapeHtml(it.title)}</h3><p>${escapeHtml(it.body)}</p>${it.takeaway?`<p class="takeaway"><strong>可转化 / 提醒：</strong>${escapeHtml(it.takeaway)}</p>`:''}</div>`).join('');
  html+=`</section>`;
  return html
}
function renderReader(){
  const id=params.get('id')||DB.meta.homeFeature;
  currentDocId=id;
  const doc=findDoc(id);
  if(!doc){$('#readerRoot').innerHTML='<p class="empty">没有找到这条内容。</p>';return}
  const category=params.get('category')||doc._category||'daily';
  const items=categoryItems(category);
  const label=CATEGORY_LABEL[category]||'当前栏目';
  const head=$('.tree-head');
  if(head){head.querySelector('p').textContent='CURRENT SECTION';head.querySelector('h2').textContent=`${label}目录`}
  renderTree(items.length?items:[doc],categoryGroupFn(category),id,category);
  let sections=doc.sections||[];
  let sourceHtml='';
  if(doc.sources&&doc.sources.length)sourceHtml=`<div class="source-list"><strong>资料来源 / 参考线索：</strong>${doc.sources.map(s=>`<p>${escapeHtml(s)}</p>`).join('')}</div>`;
  $('#readerRoot').innerHTML=`<div class="reader-top"><a class="back-link" href="${categoryUrl(category)}">← 返回${escapeHtml(label)}</a><span class="reader-type">${escapeHtml(doc.kind||doc.type||doc.category||'文档')} · ${escapeHtml(doc.date||doc.period||'')}</span><h1>${escapeHtml(doc.title)}</h1><p class="reader-summary">${escapeHtml(doc.summary||'')}</p><div class="tag-row">${tagHtml(doc.tags||[])}</div>${doc.mainLine?`<p class="takeaway"><strong>主线：</strong>${escapeHtml(doc.mainLine)}</p>`:''}</div>${sections.map(renderSection).join('')}${sourceHtml}`;
  setupFavorite();
  setTimeout(applyAnnotations,0)
}
function renderSearch(){
  const input=$('#searchInput'),root=$('#searchResults');
  const docs=sortDocs(allDocs());
  let activeTag=params.get('tag')||'';
  const q0=params.get('q')||'';
  function go(q=''){
    q=q.trim().toLowerCase();
    let filtered=docs;
    if(activeTag){filtered=filtered.filter(d=>(d.tags||[]).includes(activeTag));}
    else if(q){filtered=filtered.filter(d=>JSON.stringify(d).toLowerCase().includes(q));}
    else{filtered=docs.slice(0,18)}
    root.innerHTML=(activeTag?`<div class="search-context">标签聚合：<strong>${escapeHtml(activeTag)}</strong> <button class="clear-tag" id="clearTagBtn">清除</button></div>`:'')+(filtered.length?`<div class="doc-list">${filtered.map(row).join('')}</div>`:`<p class="empty">没有找到相关内容。</p>`);
    $('#clearTagBtn')?.addEventListener('click',()=>{activeTag='';input.value='';history.replaceState(null,'','search.html');go('')})
  }
  if(activeTag){input.value='#'+activeTag}else if(q0){input.value=q0}
  input.addEventListener('input',()=>{activeTag='';history.replaceState(null,'','search.html');go(input.value.replace(/^#/,''))});
  go(activeTag||q0)
}
function renderCollection(){const favs=getFavs();const docs=favs.map(findDoc).filter(Boolean);$('#favoriteRoot').innerHTML=docs.length?`<div class="doc-list">${docs.map(row).join('')}</div>`:'<p class="empty">还没有收藏文章。打开文章后点击“收藏”，这里会显示。</p>'}
function setupFavorite(){const btn=$('#favBtn');if(!btn)return;const update=()=>{const favs=getFavs();btn.textContent=favs.includes(currentDocId)?'★ 已收藏':'☆ 收藏'};btn.onclick=()=>{let favs=getFavs();favs=favs.includes(currentDocId)?favs.filter(x=>x!==currentDocId):[...favs,currentDocId];setFavs(favs);update()};update()}
function setupAnnotationEvents(){const reader=$('#readerRoot'), toolbar=$('#noteToolbar');if(!reader||!toolbar)return;document.addEventListener('selectionchange',()=>{if(page!=='issue')return;setTimeout(()=>{const sel=window.getSelection();if(!sel||sel.isCollapsed){toolbar.classList.add('hidden');return}const text=sel.toString().trim();if(!text||text.length<2||!reader.contains(sel.anchorNode)||!reader.contains(sel.focusNode)){toolbar.classList.add('hidden');return}pendingSelection={text, docId:currentDocId};toolbar.classList.remove('hidden')},80)});$('#makeNoteBtn')?.addEventListener('click',()=>{if(!pendingSelection)return;editingNoteId=null;openNoteModal({quote:pendingSelection.text,note:''})});$('#askAIBtn')?.addEventListener('click',askAI);$('#cancelSelectBtn')?.addEventListener('click',()=>{pendingSelection=null;window.getSelection()?.removeAllRanges();toolbar.classList.add('hidden')});reader.addEventListener('click',e=>{const mark=e.target.closest('.annotation-mark');if(!mark)return;const note=getNotes().find(n=>n.id===mark.dataset.noteId);if(note){editingNoteId=note.id;openNoteModal(note)}});$('#cancelNoteBtn')?.addEventListener('click',closeNoteModal);$('#saveNoteBtn')?.addEventListener('click',saveCurrentNote);$('#deleteNoteBtn')?.addEventListener('click',deleteCurrentNote);$('#exportNotesBtn')?.addEventListener('click',exportNotes)}
function aiPromptFor(text){const doc=findDoc(currentDocId)||{};const link=location.href;return `我正在阅读这篇文章：

标题：《${doc.title||''}》
链接：${link}

我选中的原文是：
“${text}”

请你帮我做两件事：
1. 先用更通俗的话解释这段话是什么意思；
2. 如果结合这篇文章的上下文，让你来回答或补充这段话，你会怎么说？

如果你无法读取链接，就只根据我提供的划线原文来回答。
请回答得清楚、直接一点，不要展开太多无关内容。`}
async function askAI(){if(!pendingSelection)return;const prompt=aiPromptFor(pendingSelection.text);try{await navigator.clipboard.writeText(prompt);showToast('已复制提问，可粘贴到你的 AI 侧栏或对话框。')}catch(e){const ta=document.createElement('textarea');ta.value=prompt;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();showToast('已复制提问，可粘贴到你的 AI 侧栏或对话框。')}$('#noteToolbar')?.classList.add('hidden')}
function openNoteModal(note){$('#noteModalTitle').textContent=editingNoteId?'编辑批注':'批注';$('#noteQuote').textContent=note.quote||'';$('#noteText').value=note.note||'';$('#deleteNoteBtn').classList.toggle('hidden',!editingNoteId);$('#noteModal').classList.remove('hidden');$('#noteToolbar').classList.add('hidden');setTimeout(()=>$('#noteText').focus(),50)}
function closeNoteModal(){$('#noteModal').classList.add('hidden');pendingSelection=null;editingNoteId=null;window.getSelection()?.removeAllRanges()}
function saveCurrentNote(){const quote=$('#noteQuote').textContent.trim();const note=$('#noteText').value.trim();if(!quote||!note){alert('请先写下批注内容。');return}let notes=getNotes();if(editingNoteId){notes=notes.map(n=>n.id===editingNoteId?{...n,note,updatedAt:new Date().toISOString()}:n)}else{notes.push({id:'note-'+Date.now()+'-'+Math.random().toString(16).slice(2),docId:currentDocId,quote,note,createdAt:new Date().toISOString()})}setNotes(notes);closeNoteModal();renderReader()}
function deleteCurrentNote(){if(!editingNoteId)return;if(!confirm('删除这条批注吗？'))return;setNotes(getNotes().filter(n=>n.id!==editingNoteId));closeNoteModal();renderReader()}
function exportNotes(){const notes=getNotes();const payload=notes.map(n=>{const doc=findDoc(n.docId)||{};return {...n,docTitle:doc.title||n.docId,docType:doc.kind||doc.type||doc.category||'',docDate:doc.date||doc.period||''}});const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='work-lib-批注备份.json';a.click();URL.revokeObjectURL(a.href)}
function applyAnnotations(){const reader=$('#readerRoot');if(!reader)return;const notes=getNotes().filter(n=>n.docId===currentDocId).sort((a,b)=>b.quote.length-a.quote.length);notes.forEach(note=>highlightQuote(reader,note))}
function highlightQuote(root,note){const quote=note.quote;if(!quote)return;const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(node){if(!node.nodeValue.includes(quote))return NodeFilter.FILTER_REJECT;if(node.parentElement.closest('.annotation-mark'))return NodeFilter.FILTER_REJECT;return NodeFilter.FILTER_ACCEPT}});const node=walker.nextNode();if(!node)return;const text=node.nodeValue;const idx=text.indexOf(quote);if(idx<0)return;const frag=document.createDocumentFragment();frag.append(document.createTextNode(text.slice(0,idx)));const mark=document.createElement('mark');mark.className='annotation-mark';mark.dataset.noteId=note.id;mark.title=note.note;mark.textContent=quote;frag.append(mark);frag.append(document.createTextNode(text.slice(idx+quote.length)));node.parentNode.replaceChild(frag,node)}

activeNav();
if(page==='home')renderHome();
if(['daily','magazine','inspiration','methods','management'].includes(page))renderLibrary();
if(page==='issue'){renderReader();setupAnnotationEvents()}
if(page==='search')renderSearch();
if(page==='collection')renderCollection();
