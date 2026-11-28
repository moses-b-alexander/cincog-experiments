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
    for(const select of [el('model'),el('case-model'),el('heat-model')]) select.add(new Option(product,product));
  }
  const counts=Object.keys(arms).map(arm=>{
    const trials=decisions.filter(r=>r.arm===arm);
    return arms[arm]+' '+trials.filter(r=>r.correct).length+'/'+trials.length;
  });
  el('headline').textContent='Exact recovery on the three selected words · '+counts.join(' · ');
  summary.forEach(r=>row(el('cells'),[r.product,arms[r.arm],percent(r.mean_target_weight),r.hits+' / '+r.n,r.mean_brier.toFixed(3)]));
  el('bit-values').textContent=Object.entries(study.mean_target_surprisal_bits).map(([arm,n])=>arms[arm]+' '+(n===null?'∞':n.toFixed(2))+' bits').join(' · ');
  el('tags').textContent='Checkpoints · '+products.map(p=>decisions.find(r=>r.product===p).tag).join(', ');
  function element(tag, text) {
    const item = document.createElement(tag);
    item.textContent = text;
    return item;
  }
  const assignments = decisions.filter(r => r.product === products[0]);
  for (const target of new Set(assignments.map(r => r.target))) {
    const group = document.createElement('optgroup');
    group.label = target;
    for (const r of assignments.filter(r => r.target === target)) {
      group.append(new Option(r.clue + ' · ' + arms[r.arm], r.target + '/' + r.arm));
    }
    el('heat-clue').append(group);
  }
  const example = assignments.find(r => r.clue === 'fish') || assignments[0];
  el('heat-clue').value = example.target + '/' + example.arm;
  el('heat-model').value = products.includes('Kev') ? 'Kev' : products[0];

  const ramp = [[34,36,73],[115,52,101],[189,70,88],[239,135,91],[255,227,195]];
  function shade(cell, probability) {
    const position = Math.min(1, Math.max(0, probability)) * (ramp.length - 1);
    const index = Math.min(Math.floor(position), ramp.length - 2);
    const rgb = ramp[index].map((x, j) => Math.round(x + (ramp[index+1][j] - x) * (position-index)));
    const linear = rgb.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
    const luminance = .2126 * linear[0] + .7152 * linear[1] + .0722 * linear[2];
    cell.style.backgroundColor = 'rgb(' + rgb.join(',') + ')';
    cell.style.color = luminance > .179 ? '#000' : '#fff';
  }
  function heatmap() {
    const [target, arm] = el('heat-clue').value.split('/');
    const compare = el('heat-compare').checked;
    const model = el('heat-model').value;
    const k = Number(el('heat-k').value);
    const area = el('word-heatmaps');
    area.replaceChildren();
    el('heat-status').textContent = 'Target · ' + target + '   /   Selected clue · ' +
      assignments.find(r => r.target === target && r.arm === arm).clue;
    for (const product of model === 'All' ? products : [model]) {
      const trials = decisions.filter(r => r.product === product && r.target === target && (compare || r.arm === arm));
      trials.sort((a,b) => Number(b.arm === arm) - Number(a.arm === arm));
      const table = document.createElement('table');
      table.className = 'word-heatmap';
      table.createCaption().textContent = product;
      const headings = table.createTHead().insertRow();
      for (const label of ['Rule · clue', ...Array.from({length:k}, (_, i) => '#' + (i+1)), 'Other']) {
        const th = element('th', label);
        th.scope = 'col';
        headings.append(th);
      }
      const body = table.createTBody();
      for (const r of trials) {
        const line = body.insertRow();
        const header = element('th', arms[r.arm]);
        header.scope = 'row';
        header.append(element('strong', r.clue));
        line.append(header);
        const p = r.probabilities;
        const ranked = study.bank.slice().sort((a,b) => p[b] - p[a] || Number(b === r.choice) - Number(a === r.choice));
        for (const word of ranked.slice(0,k)) {
          const cell = line.insertCell();
          cell.append(element('strong', word), element('span', percent(p[word])));
          cell.title = word + ' · ' + (100 * p[word]) + '%';
          shade(cell, p[word]);
        }
        const tail = ranked.slice(k).reduce((sum, word) => sum + p[word], 0);
        const other = line.insertCell();
        other.className = 'heat-tail';
        other.append(element('strong', percent(tail)), element('span', (ranked.length-k) + ' words'));
        other.title = (100 * tail) + '%';
      }
      const scroll = document.createElement('div');
      scroll.className = 'table-scroll';
      scroll.tabIndex = 0;
      scroll.setAttribute('role', 'region');
      scroll.setAttribute('aria-label', product + ' ranked word probabilities for ' + target);
      scroll.append(table);
      area.append(scroll);
    }
  }
  for (const id of ['heat-clue','heat-model','heat-k','heat-compare']) el(id).addEventListener('change', heatmap);
  heatmap();
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
