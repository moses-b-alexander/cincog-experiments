(() => {
  const {banks,labels}=window.C4_BANKS;
  const el=id=>document.getElementById(id);
  const node=(tag,text)=>{const e=document.createElement(tag);e.textContent=text;return e};
  const svg=(tag,attrs)=>{const e=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);return e};
  function fill(id,items){el(id).replaceChildren(...items.map(([v,l])=>new Option(l,v)))}
  const current=()=>banks.find(b=>b.id===el('bank-choice').value);
  function render(){
    const b=current(),rule=el('graph-rule').value,f=el('focus').value;
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
      const t=svg('title',{});t.textContent=w;c.append(t);c.addEventListener('click',()=>{el('focus').value=w;render()});group.append(c);
    }
    for(const w of b.words){
      if(!(w===f||(f&&neighbors.has(w))||(!f&&b.labels.includes(w))))continue;
      const [cx,cy]=b.positions[w],right=cx>798;const text=svg('text',{x:cx+(right?-8:8),y:cy-8,'text-anchor':right?'end':'start'});
      text.textContent=w;group.append(text);
    }
    el('neighbors').textContent=f?(f+' · '+neighbors.size+' neighbors in this view'+(neighbors.size?' · '+[...neighbors].sort().join(', '):'')):'Select a point or focus word to inspect its clues. Dashed edges connect words that collide only across different rules.';
    const details=el('clue-detail');details.replaceChildren();
    if(f)for(const r of b.rules){
      const clue=b.clues[f][r],known=b.words.filter(w=>b.clues[w][r]===clue);
      const sources=b.words.map(w=>({w,rs:b.rules.filter(k=>b.clues[w][k]===clue)})).filter(s=>s.rs.length);
      const count=sources.reduce((n,s)=>n+s.rs.length,0);
      const hidden=sources.map(s=>s.w+' '+s.rs.length+'/'+count+' ('+s.rs.map(k=>labels[k]).join(', ')+')');
      const card=node('article','');card.append(node('strong',labels[r]+' · '+clue),node('p','Rule shown · '+known.join(', ')+' · 1/'+known.length+' each'),node('p','Rule hidden · '+hidden.join(', ')));details.append(card);
    }
    const tb=el('bank-metrics');tb.replaceChildren();
    for(const r of b.rules){const m=b.metrics[r],tr=node('tr','');for(const v of [labels[r],m.clues,m.edges,m.clue_bits.toFixed(3),m.disclosure_bits.toFixed(3)])tr.append(node('td',v));tb.append(tr)}
    el('disclosure').textContent='Mean disclosure gain · '+b.disclosure_bits.toFixed(3)+' bits per assignment. Lowest rule-specific mean · '+Math.min(...Object.values(b.metrics).map(m=>m.disclosure_bits)).toFixed(3)+' bits.';
    el('bank-notes').textContent=b.notes;
  }
  function bank(){
    const b=current();fill('graph-rule',[['hidden','Rule hidden'],['shown','Same rule'],...b.rules.map(r=>[r,labels[r]])]);
    fill('focus',[['','All words'],...[...b.words].sort().map(w=>[w,w])]);render();
  }
  function family(){fill('bank-choice',banks.filter(b=>b.family===el('family').value).map(b=>[b.id,b.name]));bank()}
  fill('family',[...new Set(banks.map(b=>b.family))].map(f=>[f,f]));
  el('family').addEventListener('change',family);el('bank-choice').addEventListener('change',bank);
  el('graph-rule').addEventListener('change',render);el('focus').addEventListener('change',render);family();
  const query=new URLSearchParams(location.search),linked=banks.find(b=>b.id===query.get('bank'));
  if(linked){
    el('family').value=linked.family;family();el('bank-choice').value=linked.id;bank();
    if(linked.words.includes(query.get('word')))el('focus').value=query.get('word');
    if(['hidden','shown',...linked.rules].includes(query.get('rule')))el('graph-rule').value=query.get('rule');
    render();
  }
})();
