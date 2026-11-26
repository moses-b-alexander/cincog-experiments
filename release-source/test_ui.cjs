/* Semantic interaction checks without a browser; not a rendering/accessibility audit. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = process.argv[2];
if (!root) throw new Error('Pass the built site directory.');
class Element {
  constructor(tag = 'div') { this.tag = tag; this.children = []; this.attrs = {}; this.handlers = {}; this.style = {}; this._text = ''; this.hidden = false; }
  set textContent(v) { this._text = String(v); this.children = []; }
  get textContent() { return this._text + this.children.map(c => c.textContent).join(' '); }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this._text = ''; this.children = children; }
  setAttribute(k,v) { this.attrs[k] = v; }
  addEventListener(k,v) { this.handlers[k] = v; }
  click() { if (!this.disabled) this.handlers.click?.({target:this}); }
}
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
assert.equal(ids.length, new Set(ids).size, 'duplicate HTML IDs');
const elements = new Map(ids.map(id => [id, new Element()]));
const document = {createElement: tag => new Element(tag), getElementById: id => {
  assert(elements.has(id), 'missing HTML ID: ' + id); return elements.get(id);
}};
const window = {};
const context = vm.createContext({window, document, console});
vm.runInContext(fs.readFileSync(path.join(root, 'data.js'), 'utf8'), context);
const original = JSON.stringify(window.CINCOG_DATA);
vm.runInContext(fs.readFileSync(path.join(root, 'app.js'), 'utf8'), context);
const el = id => elements.get(id);
assert.match(el('agent-view').textContent, /Receiver C/);
assert.match(el('agent-view').textContent, /bsln/);
assert.match(el('agent-view').textContent, /baseball/);
assert.equal(el('host-view').hidden, true);
assert.equal(el('host-view').textContent, '');
assert.equal(el('probability-table').children.length, 64);
assert.equal(el('bank').children.length, 64);
const comparisonBefore = el('bars').textContent;
el('view-a').click();
assert.match(el('agent-view').textContent, /preceding recorded turn/);
assert.match(el('agent-view').textContent, /No clue/);
assert.match(el('agent-view').textContent, /baseline/);
assert.equal(el('bars').textContent, comparisonBefore, 'agent switch altered comparison');
assert.equal(el('host-view').hidden, true, 'agent switch revealed experimenter panel');
el('reveal').click();
assert.equal(el('host-view').hidden, false);
assert.match(el('host-view').textContent, /Exact recovery: false/);
assert.match(el('host-view').textContent, /−1/);
el('view-c').click();
assert.match(el('agent-view').textContent, /anchored decision/);
assert.equal(el('host-view').hidden, false, 'agent switch reset reveal preference');
el('reveal').click();
assert.equal(el('host-view').hidden, true);
el('filter').handlers.input({target:{value:'base'}});
assert.equal(el('probability-table').children.length, 3);
assert.match(el('filter-status').textContent, /still uses all 64/);
el('filter').handlers.input({target:{value:'<script>'}});
assert.equal(el('probability-table').children.length, 0);
const cells = el('board').children;
assert.equal(cells.filter(x => !x.disabled).length, 3);
cells[8].click();
assert.equal(el('board').children[8], cells[8], 'selection replaced the active keyboard control');
assert.equal(cells[8].attrs['aria-pressed'], 'true');
assert.equal(cells[0].attrs['aria-pressed'], 'false');
assert.match(el('destinations').textContent, /From cell 8: destinations 0, 1, 2, 3, 4, 5, 6, 7/);
for (const row of el('bars').children) {
  for (const track of row.children[1].children) {
    const percentage = Number.parseFloat(track.children[0].style.width);
    assert(percentage >= 0 && percentage <= 100, 'invalid shared scale');
  }
}
assert.equal(JSON.stringify(window.CINCOG_DATA), original, 'inspection mutated original data');
assert.equal(window.CINCOG_DATA.c4.anchor, 'C4/C/alternating');
for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
  const ref = match[1];
  if (ref.startsWith('#')) assert(elements.has(ref.slice(1)), 'broken anchor: ' + ref);
  else if (!/^[a-z]+:/.test(ref)) assert(fs.existsSync(path.join(root, ref)), 'missing local asset: ' + ref);
}
console.log('PASS: fixed-decision A/C views, independent reveal, immutable evidence, full-menu filtering, legal-source inspector, shared scale and local links. Rendered browser QA not performed.');
