(() => {
  const {banks,labels}=window.C4_BANKS;
  const el=id=>document.getElementById(id);
  const node=(tag,text)=>{const e=document.createElement(tag);e.textContent=text;return e};
  const svg=(tag,attrs)=>{const e=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);return e};
  function fill(id,items){el(id).replaceChildren(...items.map(([v,l])=>new Option(l,v)))}
  const current=()=>banks.find(b=>b.id===el('bank-choice').value);
  const styles = {first:1, last:2, odd:3, even:4, delete_first:1, delete_middle:3, delete_last:2};
  function mark(rule) {
    const symbol = node('i','');
    symbol.className = 'rule-mark rule-' + styles[rule];
    symbol.setAttribute('aria-hidden','true');
    return symbol;
  }
  function wordList(card, condition, sources, total) {
    const section = node('div','');
    section.className = 'condition-words';
    section.append(node('h4', condition));
    const weights = [...new Set(sources.map(s => s.rs.length))].sort((a,b) => b-a);
    for (const weight of weights) {
      const entries = sources.filter(s => s.rs.length === weight);
      const group = node('div','');
      group.className = 'word-group';
      const chance = node('small',weight + '/' + total + (entries.length > 1 ? ' each' : ''));
      group.append(chance);
      for (const {w,rs} of entries) {
        const entry = node('span','');
        entry.className = 'source-word rule-' + styles[rs[0]];
        entry.title = rs.map(k => labels[k]).join(' + ');
        for (const k of rs) entry.append(mark(k));
        entry.append(node('span',w), Object.assign(node('span',' ('+entry.title+')'), {className:'sr-only'}));
        group.append(entry);
      }
      section.append(group);
    }
    card.append(section);
  }
  let linkReady = false;
  function updateLink(bank, rule, focus) {
    if (!linkReady || location.protocol === 'file:') return;
    const url = new URL(location.href);
    url.searchParams.set('bank',bank);
    if (focus) url.searchParams.set('word',focus); else url.searchParams.delete('word');
    if (rule !== 'hidden') url.searchParams.set('rule',rule); else url.searchParams.delete('rule');
    history.replaceState(null,'',url);
  }
  function reset() {
    el('focus').value = '';
    el('graph-rule').value = 'hidden';
    render();
  }
  function render(){
    const b=current(),rule=el('graph-rule').value,f=el('focus').value;
    el('reset-graph').disabled = !f && rule === 'hidden';
    updateLink(b.id,rule,f);
    const edges=b.edges.filter(e=>rule==='hidden'||(rule==='shown'?e.same.length:e.same.includes(rule)));
    const neighbors=new Set(edges.filter(e=>e.a===f||e.b===f).map(e=>e.a===f?e.b:e.a));
    el('bank-purpose').textContent=b.purpose;
    el('words').textContent=b.words.join(', ');
    const pair=banks.find(other=>other.family===b.family&&other.name==='Default');
    el('swaps').textContent=(b.name==='Rare included'&&pair)?'Changed slots · '+b.words.flatMap((w,i)=>pair.words[i]===w?[]:[pair.words[i]+' → '+w]).join(', '):'';
    el('graph-summary').textContent=b.words.length+' words · '+edges.length+' linked pairs · '+(rule==='hidden'?'Rule hidden':rule==='shown'?'Same-rule links':labels[rule]);
    const chart=el('network');chart.querySelector('g')?.remove();
    const group=svg('g',{});chart.append(group);
    for(const e of edges){
      const [x1,y1]=b.positions[e.a],[x2,y2]=b.positions[e.b];
      const selected=e.a===f||e.b===f;
      group.append(svg('line',{x1,y1,x2,y2,class:'edge'+(!e.same.length?' cross':'')+(selected?' incident':(f?' dim':''))}));
    }
    for(const w of b.words.filter(w=>w!==f).concat(f?[f]:[])){
      const [cx,cy]=b.positions[w];const on=w===f||neighbors.has(w);
      const c=svg('circle',{cx,cy,r:w===f?8:5.5,class:'dot'+(w===f?' chosen':(f&&!on?' dim':''))});
      const t=svg('title',{});t.textContent=w;c.append(t);c.addEventListener('click',event=>{
        event.stopPropagation();el('focus').value=w===f?'':w;render();
      });group.append(c);
    }
    for(const w of b.words){
      if(!(w===f||(f&&neighbors.has(w))||(!f&&b.labels.includes(w))))continue;
      const [cx,cy]=b.positions[w],right=cx>798;const text=svg('text',{x:cx+(right?-8:8),y:cy-8,'text-anchor':right?'end':'start'});
      text.textContent=w;group.append(text);
    }
    el('neighbors').textContent=f?(f+' · '+neighbors.size+(neighbors.size===1?' neighbor':' neighbors')+' in this view'+(neighbors.size?' · '+[...neighbors].sort().join(', '):'')):'Select a point or focus word to inspect its clues. Dashed edges connect words that collide only across different rules.';
    const details=el('clue-detail');details.replaceChildren();
    el('rule-key').hidden = !f;
    el('clue-detail').closest('aside').hidden = !f;
    el('network').closest('.graph-workspace').classList.toggle('has-focus',Boolean(f));
    el('rule-legend').replaceChildren(...b.rules.map(k => {
      const item = node('li','');
      item.className = 'rule-' + styles[k];
      item.append(mark(k),document.createTextNode(labels[k]));
      return item;
    }));
    if(f)for(const r of b.rules){
      const clue=b.clues[f][r],known=b.words.filter(w=>b.clues[w][r]===clue);
      const sources=b.words.map(w=>({w,rs:b.rules.filter(k=>b.clues[w][k]===clue)})).filter(s=>s.rs.length);
      const count=sources.reduce((n,s)=>n+s.rs.length,0);
      const card=node('article','');
      const heading=node('h3','');
      heading.append(mark(r),document.createTextNode(clue));
      heading.title=labels[r];
      heading.setAttribute('aria-label',clue+' · '+labels[r]);
      card.append(heading);
      wordList(card,'Rule shown',known.map(w=>({w,rs:[r]})),known.length);
      wordList(card,'Rule hidden',sources,count);
      details.append(card);
    }
    const tb=el('bank-metrics');tb.replaceChildren();
    for(const r of b.rules){const m=b.metrics[r],tr=node('tr','');for(const v of [labels[r],m.clues,m.edges,m.clue_bits.toFixed(3),m.disclosure_bits.toFixed(3)])tr.append(node('td',v));tb.append(tr)}
    el('disclosure').textContent='Mean disclosure gain · '+b.disclosure_bits.toFixed(3)+' bits per assignment. Lowest rule-specific mean · '+Math.min(...Object.values(b.metrics).map(m=>m.disclosure_bits)).toFixed(3)+' bits.';
    el('bank-notes').textContent=b.notes;
    el('deletion-comparison').hidden = !b.ideal_recovery;
    if (f) {
      const scroll=el('graph-scroll');
      const focusX=b.positions[f][0]*chart.getBoundingClientRect().width/880;
      scroll.scrollLeft=focusX-scroll.clientWidth/2;
    }
  }
  function bank(){
    const b=current();fill('graph-rule',[['hidden','Rule hidden'],['shown','Same rule'],...b.rules.map(r=>[r,labels[r]])]);
    fill('focus',[['','All words'],...[...b.words].sort().map(w=>[w,w])]);render();
  }
  function family(){fill('bank-choice',banks.filter(b=>b.family===el('family').value).map(b=>[b.id,b.name]));bank()}
  fill('family',[...new Set(banks.map(b=>b.family))].map(f=>[f,f]));
  el('family').addEventListener('change',family);el('bank-choice').addEventListener('change',bank);
  el('reset-graph').addEventListener('click',reset);
  el('network').addEventListener('click',reset);
  document.addEventListener('keydown',e=>{if(e.key==='Escape' && !el('reset-graph').disabled) reset()});
  el('graph-rule').addEventListener('change',render);el('focus').addEventListener('change',render);family();
  const query=new URLSearchParams(location.search);
  const linked=banks.find(b=>b.id===query.get('bank')) || banks.find(b=>b.id==='six32');
  if(linked){
    el('family').value=linked.family;family();el('bank-choice').value=linked.id;bank();
    const word=query.size ? query.get('word') : 'surety';
    if(linked.words.includes(word))el('focus').value=word;
    if(['hidden','shown',...linked.rules].includes(query.get('rule')))el('graph-rule').value=query.get('rule');
    render();
  }
  linkReady = true;
})();
