(function(){
  const {articles,categories,tags,management,meta} = window.WORKLIB;
  const byId = Object.fromEntries(articles.map(a=>[a.id,a]));
  const qs = new URLSearchParams(location.search);
  const page = document.body.dataset.page;
  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));
  function fmtDate(d){return d.replaceAll('-','.');}
  function articleUrl(a){return `issue.html?id=${encodeURIComponent(a.id)}&category=${encodeURIComponent(a.category)}`;}
  function tagUrl(tag){return `collection.html?tag=${encodeURIComponent(tag)}`;}
  function renderTags(list){return (list||[]).map(t=>`<a class="tag" href="${tagUrl(t)}">${t}</a>`).join('');}
  function sortByDate(list){return [...list].sort((a,b)=>b.date.localeCompare(a.date));}
  function setActiveNav(){
    const nav = page==='issue' ? (qs.get('category')||'') : page;
    $$('[data-nav]').forEach(a=>{ if(a.dataset.nav===nav) a.classList.add('active'); });
  }
  function card(a){return `<article class="article-card"><div><h2>${a.title}</h2><p>${a.summary}</p><div class="meta"><span>${fmtDate(a.date)}</span><span class="type-pill">${a.type}</span>${(a.tags||[]).slice(0,3).map(t=>`<a href="${tagUrl(t)}" class="tag">${t}</a>`).join('')}</div></div><a class="read-more" href="${articleUrl(a)}">阅读</a></article>`}
  function renderList(category){
    const list = sortByDate(articles.filter(a=>a.category===category));
    $('#articleList').innerHTML = list.map(card).join('');
    $('#categoryCount').textContent = `${list.length} 篇内容`;
    $('#filterTags').innerHTML = [...new Set(list.flatMap(a=>a.tags||[]))].map(t=>`<a class="tag" href="${tagUrl(t)}">${t}</a>`).join('');
  }
  function initHome(){
    const featured = byId[meta.homeFeatured] || articles[0];
    $('#homeTitle').textContent = featured.title;
    $('#homeSummary').textContent = featured.summary;
    $('#homeTags').innerHTML = renderTags(featured.tags);
    $('#homeIssueLink').href = articleUrl(featured);
    $('#homeWeek').textContent = `更新至 ${fmtDate(meta.updated)}`;
    $('#homeStatsCard').innerHTML = `<div class="mini-list">${sortByDate(articles).slice(0,3).map(a=>`<a class="mini-item" href="${articleUrl(a)}"><b>${a.title}</b><span>${categories[a.category]} · ${fmtDate(a.date)}</span></a>`).join('')}</div>`;
    const counts = Object.keys(categories).map(k=>[categories[k], k==='management' ? management.dynamics.length : articles.filter(a=>a.category===k).length]);
    $('#homeStats').innerHTML = counts.map(([k,v])=>`<div class="stat"><span>${k}</span><strong>${v}</strong></div>`).join('');
    $('#homeHotTags').innerHTML = tags.map(t=>`<a class="tag" href="${tagUrl(t)}">${t}</a>`).join('');
  }
  function initIssue(){
    const id = qs.get('id');
    const a = byId[id] || articles[0];
    document.title = `${a.title}｜Work-Lib`;
    $('#readerRoot').innerHTML = `<p class="kicker">${categories[a.category]} · ${a.type}</p><h1>${a.title}</h1><p class="lead">${a.summary}</p><div class="tag-row">${renderTags(a.tags)}</div>${a.body}`;
    const same = sortByDate(articles.filter(x=>x.category===a.category));
    $('#treeRoot').innerHTML = same.map(x=>`<a class="tree-link ${x.id===a.id?'active':''}" href="${articleUrl(x)}">${x.title}</a>`).join('');
    initAnnotation(a);
  }
  function initCollection(){
    const tag = qs.get('tag') || tags[0];
    $('#collectionTitle').textContent = `标签：${tag}`;
    const list = sortByDate(articles.filter(a=>(a.tags||[]).includes(tag)));
    $('#collectionCount').textContent = `${list.length} 篇相关内容`;
    $('#articleList').innerHTML = list.length ? list.map(card).join('') : '<p class="lead">暂未收录相关内容。</p>';
    $('#allTags').innerHTML = tags.map(t=>`<a class="tag" href="${tagUrl(t)}">${t}</a>`).join('');
  }
  function initSearch(){
    const input = $('#searchInput');
    const box = $('#articleList');
    const render = (q='')=>{
      q = q.trim();
      const list = sortByDate(articles.filter(a=>!q || [a.title,a.summary,a.type,categories[a.category],...(a.tags||[])].join(' ').toLowerCase().includes(q.toLowerCase())));
      $('#searchCount').textContent = `${list.length} 条结果`;
      box.innerHTML = list.map(card).join('');
    };
    input.addEventListener('input',()=>render(input.value));
    render(qs.get('q')||'');
    input.value = qs.get('q')||'';
  }
  function initManagement(){
    $('#mgmtDynamics').innerHTML = `<h2>动态｜2026 年公开动态</h2><div class="timeline">${management.dynamics.map(d=>`<div class="timeline-item"><h3>${d.date}｜${d.title}</h3><p>${d.content}</p><p><strong>管理表达：</strong>${d.expression}</p><p><strong>内部传播转化：</strong>${d.internal}</p><p class="source">来源：<a href="${d.url}" target="_blank" rel="noopener noreferrer">${d.source}</a></p></div>`).join('')}</div>`;
    $('#mgmtSpeech').innerHTML = `<h2>${management.speech.title}</h2><div class="quote-note">${management.speech.status}</div><ul>${management.speech.points.map(p=>`<li>${p}</li>`).join('')}</ul>`;
  }
  function initAnnotation(article){
    let selectedText = '';
    const toolbar = $('#noteToolbar'), toast = $('#toast');
    const askTpl = () => `我正在阅读这篇文章：\n\n标题：《${article.title}》\n链接：${location.href}\n\n我选中的原文是：\n‘${selectedText}’\n\n请你帮我做两件事：\n1. 先用更通俗的话解释这段话是什么意思；\n2. 如果结合这篇文章的上下文，让你来回答或补充这段话，你会怎么说？\n\n如果你无法读取链接，就只根据我提供的划线原文来回答。\n请回答得清楚、直接一点，不要展开太多无关内容。`;
    function showToast(t){toast.textContent=t;toast.classList.remove('hidden');setTimeout(()=>toast.classList.add('hidden'),1600)}
    document.addEventListener('selectionchange',()=>{
      const t = window.getSelection().toString().trim();
      if(t && t.length>1){ selectedText=t; toolbar.classList.remove('hidden'); }
    });
    $('#cancelSelectBtn').onclick=()=>{window.getSelection().removeAllRanges();toolbar.classList.add('hidden')};
    $('#askAIBtn').onclick=async()=>{try{await navigator.clipboard.writeText(askTpl());showToast('已复制问 AI 内容');}catch(e){showToast('复制失败，可手动复制')}};
    $('#favBtn').onclick=()=>{localStorage.setItem('wl:fav:'+article.id,'1');showToast('已收藏')};
    $('#exportNotesBtn').onclick=()=>{
      const data = localStorage.getItem('wl:note:'+article.id)||'[]';
      const blob = new Blob([data],{type:'application/json'});
      const a = document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`${article.id}-notes.json`;a.click();
    };
    $('#makeNoteBtn').onclick=()=>{$('#noteQuote').textContent=selectedText;$('#noteText').value='';$('#noteModal').classList.remove('hidden')};
    $('#cancelNoteBtn').onclick=()=>$('#noteModal').classList.add('hidden');
    $('#saveNoteBtn').onclick=()=>{
      const arr = JSON.parse(localStorage.getItem('wl:note:'+article.id)||'[]');
      arr.push({title:article.title,category:article.category,quote:selectedText,note:$('#noteText').value,time:new Date().toISOString()});
      localStorage.setItem('wl:note:'+article.id,JSON.stringify(arr,null,2));
      $('#noteModal').classList.add('hidden');showToast('已保存批注');
    };
  }
  setActiveNav();
  if(page==='home') initHome();
  if(['daily','magazine','inspiration','methods'].includes(page)) renderList(page);
  if(page==='issue') initIssue();
  if(page==='collection') initCollection();
  if(page==='search') initSearch();
  if(page==='management') initManagement();
})();
