(() => {
  const study=window.C4_PILOT;
  const el=id=>document.getElementById(id);
  const percent=n=>n>0&&n<.001?'<0.1%':(n>.999&&n<1?'>99.9%':(100*n).toFixed(2)+'%');
  function row(parent,values){
    const tr=document.createElement('tr');
    values.forEach(value=>{const td=document.createElement('td');td.textContent=value;tr.append(td)});
    parent.append(tr);
  }
  const {products,summary,decisions,arms}=study;
  for(const product of products){
    for(const select of [el('model'),el('case-model')]) select.add(new Option(product,product));
  }
  const counts=Object.keys(arms).map(arm=>{
    const trials=decisions.filter(r=>r.arm===arm);
    return arms[arm]+' '+trials.filter(r=>r.correct).length+'/'+trials.length;
  });
  el('headline').textContent='Exact recovery on the three selected words · '+counts.join(' · ');
  summary.forEach(r=>row(el('cells'),[r.product,arms[r.arm],percent(r.mean_target_weight),r.hits+' / '+r.n,r.mean_brier.toFixed(3)]));
  el('bit-values').textContent=Object.entries(study.mean_target_surprisal_bits).map(([arm,n])=>arms[arm]+' '+(n===null?'∞':n.toFixed(2))+' bits').join(' · ');
  el('tags').textContent='Checkpoints · '+products.map(p=>decisions.find(r=>r.product===p).tag).join(', ');
  function plot(){
    const model=el('model').value, kind=el('measure').value;
    const label=el('measure').selectedOptions[0].textContent;
    const n=decisions.filter(r=>r.arm==='whole'&&(model==='All'||r.product===model)).length;
    el('rank-chart').src=kind+'-'+model+'.svg';
    el('rank-chart').alt=label+' by delivered clue, '+model+', '+n+' responses per arm.';
    el('curve-caption').textContent=(model==='All'?'All products':model)+' · '+n+' responses per curve · three distinct targets.';
    const tb=el('curve-points');tb.replaceChildren();
    for(const k of [1,3,5,10,20,32,64])row(tb,[k,...Object.keys(arms).map(arm=>percent(study.curve_points[model][arm][kind][k]))]);
  }
  function cases(){
    el('case-rows').replaceChildren();
    for(const r of decisions.filter(r=>el('case-model').value==='All'||r.product===el('case-model').value)){
      row(el('case-rows'),[r.product,r.target,arms[r.arm],r.clue,r.choice,r.rank,percent(r.target_weight)]);
    }
  }
  el('model').addEventListener('change',plot);el('measure').addEventListener('change',plot);
  el('case-model').addEventListener('change',cases);plot();cases();
})();
