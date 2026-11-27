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
const conditions = window.CINCOG_DATA.c4.comparison.conditions;
for (const [key, fragment] of [['p', 'base'], ['q', 'bsln']]) {
  const condition = conditions[key];
  assert.equal(condition.fragment, fragment);
  assert.equal(condition.active_rule_disclosed, false);
  assert.equal(window.CINCOG_DATA.c4.receiver[condition.receiver_arm].body.state.observation.fragment, fragment);
}
const methods = fs.readFileSync(path.join(root, 'methods.html'), 'utf8');
assert.match(html, /href="methods.html"/);
assert.match(methods, /href="data.json"/);
assert.match(methods, /id="dark-palette"/);
vm.runInContext(fs.readFileSync(path.join(root, 'app.js'), 'utf8'), context);
const el = id => elements.get(id);
assert.match(el('agent-view').textContent, /Receiver C/);
assert.match(el('agent-view').textContent, /bsln/);
assert.match(el('agent-view').textContent, /baseball/);
assert.equal(el('host-view').hidden, true);
assert.equal(el('host-view').textContent, '');
assert.equal(el('probability-table').children.length, 64);
assert.equal(el('bank').children.length, 64);
assert.equal(window.CINCOG_DATA.c2, undefined);
assert.doesNotMatch(html, /\bC2\b/i);
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
// Start with a previously saved dark setting, then return to the system preference.
const systemMedia = 'screen and (prefers-color-scheme: dark)';
const palette = el('dark-palette');
const theme = el('theme');
const storage = new Map([['cincog-experiments.theme', 'dark']]);
const themeScript = fs.readFileSync(path.join(root, 'theme.js'), 'utf8');
const themeDocument = new Element();
themeDocument.getElementById = document.getElementById;
function loadTheme(localStorage) {
  palette.media = systemMedia;
  vm.runInNewContext(themeScript, { document: themeDocument, localStorage });
  themeDocument.handlers.DOMContentLoaded();
}
loadTheme({
  getItem: key => storage.get(key),
  setItem: (key, value) => storage.set(key, value),
  removeItem: key => storage.delete(key)
});
assert.equal(palette.media, 'screen');
assert.equal(theme.value, 'dark');
theme.value = 'light';
theme.handlers.change();
assert.equal(palette.media, 'not all');
assert.equal(storage.get('cincog-experiments.theme'), 'light');
theme.value = 'system';
theme.handlers.change();
assert.equal(palette.media, systemMedia);
assert.equal(storage.size, 0);

// Browsers may disallow local storage for the offline copy.
loadTheme(undefined);
assert.equal(theme.value, 'system');
theme.value = 'dark';
theme.handlers.change();
assert.equal(palette.media, 'screen');
console.log('PASS: agent views, reveal, evidence, filtering, chart scale, local links and theme preferences.');
