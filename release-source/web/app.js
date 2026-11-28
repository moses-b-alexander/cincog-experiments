/* All interaction changes inspection state only. No inference or experiment steps. */
(function () {
  'use strict';
  const data = window.CINCOG_DATA;
  if (!data || !data.c4) throw new Error('Verified presentation data is missing.');
  const c4 = data.c4;
  const state = { agent: 'C', revealed: false, filter: '' };
  const byId = id => document.getElementById(id);
  const pct = value => (100 * value).toFixed(4) + '%';
  const signed = value => (value > 0 ? '+' : '') + value.toFixed(4);
  const pretty = value => JSON.stringify(value, null, 2);
  function element(tag, text, className) {
    const el = document.createElement(tag);
    if (text !== undefined) el.textContent = text;
    if (className) el.className = className;
    return el;
  }
  function appendText(parent, tag, text, className) {
    const el = element(tag, text, className); parent.append(el); return el;
  }
  function renderAgent() {
    const a = state.agent === 'A';
    const view = a ? c4.sender : c4.receiver.alternating;
    const panel = byId('agent-view'); panel.replaceChildren();
    byId('view-a').setAttribute('aria-pressed', String(a));
    byId('view-c').setAttribute('aria-pressed', String(!a));
    appendText(panel, 'p', a ? 'Sender A · preceding recorded turn' : 'Receiver C · anchored decision', 'eyebrow');
    appendText(panel, 'p', a ? 'Clue received' : 'Delivered fragment', 'field-label');
    appendText(panel, 'div', a ? 'No clue' : view.body.state.observation.fragment, a ? 'signal no-clue' : 'signal');
    appendText(panel, 'p', 'Objective', 'field-label');
    appendText(panel, 'p', 'Maximize exact recovery · horizon 1');
    appendText(panel, 'p', 'Recorded instruction', 'field-label');
    appendText(panel, 'p', view.body.questions.decision.instructions, 'instruction');
    const response = element('div', undefined, 'response');
    appendText(response, 'p', 'Recorded response · argmax', 'field-label');
    const word = view.command.args.word;
    appendText(response, 'strong', word);
    appendText(response, 'p', pct(view.answer.probabilities[word]) + ' native action weight', 'small');
    if (a) appendText(response, 'p', 'The host reused this word for each receiver.', 'small muted');
    panel.append(response);
    byId('raw-request').textContent = pretty(view.body);
    byId('raw-response').textContent = pretty(JSON.parse(view.response_text));
    byId('raw-command').textContent = pretty(view.command);
  }
  function renderReveal() {
    const el = byId('host-view'); el.hidden = !state.revealed;
    byId('reveal').setAttribute('aria-expanded', String(state.revealed));
    byId('reveal').textContent = state.revealed ? 'Hide experimenter information' : 'Reveal experimenter information';
    el.replaceChildren();
    if (!state.revealed) return;
    appendText(el, 'p', 'Host’s recorded state', 'eyebrow');
    appendText(el, 'p', 'Decision C4/C/alternating · trial c4/1', 'small');
    appendText(el, 'p', 'A chose baseline. The host delivered letters 1, 3, 5 and 7: bsln.');
    appendText(el, 'p', 'C chose baseball. Exact recovery: false.', 'reveal-result');
    appendText(el, 'p', 'In the matched first-four arm, C saw base and chose baseline. Exact recovery: true.');
    const target = c4.comparison.rows.find(r => r.word === c4.result.word);
    appendText(el, 'p', 'Target probability · ' + pct(target.p) + ' to ' + pct(target.q)
      + ' (' + signed(target.delta_pp) + ' percentage points).', 'small');
    appendText(el, 'p', 'Alternating minus whole-word recovery · −1 on this trial.', 'small');
  }
  function renderBars() {
    const ranked = [...c4.comparison.rows].sort((a, b) => Math.abs(b.delta_pp) - Math.abs(a.delta_pp));
    const choices = new Set([c4.receiver.elide_second.command.args.word, c4.receiver.alternating.command.args.word]);
    const visible = ranked.filter((r, i) => i < 6 || choices.has(r.word));
    const panel = byId('bars'); panel.replaceChildren();
    for (const row of visible) {
      const item = element('div', undefined, 'bar-row');
      item.setAttribute('aria-label', row.word + ': base ' + pct(row.p) + ', bsln ' + pct(row.q)
        + ', change ' + signed(row.delta_pp) + ' percentage points');
      appendText(item, 'div', row.word, 'bar-word');
      const tracks = element('div', undefined, 'tracks'); tracks.setAttribute('aria-hidden', 'true');
      for (const [cls, value] of [['p', row.p], ['q', row.q]]) {
        const track = element('div', undefined, 'track ' + cls);
        const fill = element('div', undefined, 'fill'); fill.style.width = (100 * value) + '%';
        track.append(fill); tracks.append(track);
      }
      item.append(tracks);
      const values = element('div', undefined, 'bar-values');
      appendText(values, 'span', pct(row.p), 'p-key-text');
      appendText(values, 'span', pct(row.q), 'q-key-text');
      appendText(values, 'span', signed(row.delta_pp) + ' pp', 'delta');
      item.append(values); panel.append(item);
    }
  }
  function renderTable() {
    const rows = c4.comparison.rows.filter(r => r.word.includes(state.filter.toLowerCase().trim()));
    const table = byId('probability-table'); table.replaceChildren();
    for (const r of rows) {
      const tr = element('tr');
      for (const value of [r.word, pct(r.p), pct(r.q), signed(r.delta_pp), r.js_bits.toFixed(9)])
        appendText(tr, 'td', value);
      table.append(tr);
    }
    byId('filter-status').textContent = rows.length + ' of 64 words displayed. Divergence still uses all 64.';
  }
  byId('view-c').addEventListener('click', () => { state.agent = 'C'; renderAgent(); });
  byId('view-a').addEventListener('click', () => { state.agent = 'A'; renderAgent(); });
  byId('reveal').addEventListener('click', () => { state.revealed = !state.revealed; renderReveal(); });
  byId('filter').addEventListener('input', event => { state.filter = event.target.value; renderTable(); });
  byId('p-choice').textContent = c4.receiver.elide_second.command.args.word;
  byId('q-choice').textContent = c4.receiver.alternating.command.args.word;
  byId('js-value').textContent = c4.comparison.js_bits.toFixed(6);
  byId('tv-value').textContent = c4.comparison.tv.toFixed(6);
  byId('kl-note').textContent = 'For reference, directed KL(P‖Q) = ' + c4.comparison.kl_pq_bits.toFixed(9)
    + ' bits. Positive P against a zero Q would make this directed divergence infinite; that does not occur in this pair.';
  for (const word of Object.keys(c4.receiver.alternating.answer.probabilities)) appendText(byId('bank'), 'span', word);
  renderAgent(); renderReveal(); renderBars(); renderTable();
})();
