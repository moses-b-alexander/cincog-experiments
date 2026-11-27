"""Reconstruct the v0.1.1 public numbers without inference or third-party packages."""
from copy import deepcopy
from hashlib import sha256
import argparse
import json
import math
from pathlib import Path

C4_SHA = '703a781f63e53d967c9ea65d7d342ded69f7fa2a1a6872be2139a5cc8e8eb07a'
ARMS = ('elide_second', 'alternating')


def read(path):
    return json.loads(Path(path).read_bytes())


def require(condition, message):
    if not condition:
        raise ValueError(message)


def compare(left, right):
    require(list(left) == list(right) and len(left) == 64, 'different ordered menu')
    for vector in (left, right):
        require(all(type(x) in (int, float) and math.isfinite(x) and 0 <= x <= 1
                    for x in vector.values()), 'invalid probability')
        require(abs(math.fsum(vector.values()) - 1) < 1e-9, 'probabilities do not total one')
    p = {w: x / math.fsum(left.values()) for w, x in left.items()}
    q = {w: x / math.fsum(right.values()) for w, x in right.items()}
    def kl(x, y):
        if x == 0:
            return 0.0
        return math.inf if y == 0 else x * math.log2(x / y)
    rows = []
    for w in p:
        mid = (p[w] + q[w]) / 2
        rows.append({'word': w, 'p': p[w], 'q': q[w], 'delta_pp': 100 * (q[w] - p[w]),
                     'js_bits': (kl(p[w], mid) + kl(q[w], mid)) / 2,
                     'tv': abs(p[w] - q[w]) / 2})
    return {'rows': rows, 'js_bits': math.fsum(r['js_bits'] for r in rows),
            'tv': math.fsum(r['tv'] for r in rows),
            'kl_pq_bits': math.fsum(kl(p[w], q[w]) for w in p),
            'input_totals': [math.fsum(left.values()), math.fsum(right.values())]}


def c4_data(path):
    raw = Path(path).read_bytes()
    require(sha256(raw).hexdigest() == C4_SHA, 'C4 original trace hash mismatch')
    record = json.loads(raw)
    require(record['config']['framework_version'] == '0.1.0', 'unexpected runtime')
    trial, = record['trials']
    require(trial['id'] == 'c4/1', 'wrong trial')
    decisions = {d['id']: d for d in trial['decisions']}
    def view(stream, role, decision):
        wire, = trial['receipts'][stream][role]
        answer = json.loads(wire['response'])['answers']['decision']
        d = decisions[decision]
        require(d['status'] == 'accepted' and len(d['attempts']) == 1, 'unexpected decision status')
        require(answer['probabilities'] == wire['probabilities'], 'wire probabilities mismatch')
        require(answer['choice'] == max(answer['probabilities'], key=answer['probabilities'].get), 'not mode')
        require(d['action']['args']['word'] == answer['choice'] == wire['selected_option'], 'argmax mismatch')
        require(json.loads(d['attempts'][0]['raw']) == d['action'], 'admission differs from raw command')
        return {'decision': decision, 'body': wire['body'], 'answer': answer,
                'response_text': wire['response'], 'request': d['attempts'][0]['request'],
                'command': d['action']}
    a = view('shared', 'A', 'C4/A')
    c = {arm: view(arm, 'C', 'C4/C/' + arm) for arm in ARMS}
    bodies = [deepcopy(c[arm]['body']) for arm in ARMS]
    clues = [b['state']['observation'].pop('fragment') for b in bodies]
    require(bodies[0] == bodies[1], 'more than fragment changed between requests')
    require(clues == ['base', 'bsln'], 'wrong clue pair')
    require(a['command']['args']['word'] == trial['result']['word'] == 'baseline', 'wrong shared sender choice')
    require('fragment' not in a['body']['state']['observation'], 'sender received clue')
    for arm in ARMS:
        ob = c[arm]['body']['state']['observation']
        require(set(ob) == {'role', 'possible_deliveries', 'fragment'}, 'unexpected C observation fields')
        require(c[arm]['body']['model'] == 'kev:0.8b-q8_0', 'wrong native model')
    stats = compare(*(c[arm]['answer']['probabilities'] for arm in ARMS))
    require(math.isclose(stats['js_bits'], .0022420995274336298, abs_tol=1e-14), 'JS mismatch')
    require(math.isclose(stats['tv'], .044753119849064715, abs_tol=1e-14), 'TV mismatch')
    require(trial['result']['arms']['alternating']['score'] is False, 'alternating score mismatch')
    require(trial['result']['arms']['elide_second']['score'] is True, 'prefix score mismatch')
    return {'trial': trial['id'], 'anchor': 'C4/C/alternating', 'model': 'kev:0.8b-q8_0',
            'selection': 'argmax', 'sender': a, 'receiver': c, 'comparison': stats,
            'result': trial['result'], 'sha256': C4_SHA,
            'workflow_sha256': record['config']['workflow_sha256']}


def verify_hashes(root):
    manifest = read(Path(root) / 'manifest.json')
    for item in manifest['files']:
        relative = Path(item['path'])
        require(not relative.is_absolute() and '..' not in relative.parts, 'unsafe manifest path')
        raw = (Path(root) / relative).read_bytes()
        require(sha256(raw).hexdigest() == item['sha256'], 'file changed: ' + item['path'])
    return len(manifest['files'])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parent)
    args = parser.parse_args()
    count = verify_hashes(args.root)
    c4 = c4_data(args.root / 'evidence/c4-kev.json')
    print(json.dumps({'verified_files': count, 'c4': {'trial': c4['trial'],
        'decisions': 5, 'JS_bits': c4['comparison']['js_bits'], 'TV': c4['comparison']['tv'],
        'delta_target_pp': next(r['delta_pp'] for r in c4['comparison']['rows'] if r['word'] == 'baseline')}}, indent=2))


if __name__ == '__main__':
    main()
