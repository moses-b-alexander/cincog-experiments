"""Check C2 completion, commands and revised menus in the original saved trials.

This reconstructs the public reliability claims. Full revised-world replay is
provided separately by runtime/qualify.py; this audit does not claim causal validity.
"""
from collections import Counter
import json
from pathlib import Path
from verify import require


def legal(command, board):
    if not isinstance(command, dict) or set(command) != {'action', 'args'}:
        return False
    if command['action'] == 'do_nothing':
        return command['args'] == {}
    args = command['args']
    if command['action'] != 'move_person' or not isinstance(args, dict) or set(args) != {'from_cell', 'to_cell'}:
        return False
    s, d = args['from_cell'], args['to_cell']
    return type(s) is int and type(d) is int and 0 <= s < 9 and 0 <= d < 9 and s != d and board[s] > 0


def audit(root, details=False):
    output = {}
    example = None
    for cohort in ('before', 'after'):
        files = sorted((Path(root) / cohort).glob('m*-t*.json'))
        require(len(files) == 25, 'expected 25 ' + cohort + ' records')
        counts = Counter(planned=25)
        by_model = {}
        for path in files:
            record = json.loads(path.read_bytes())
            trial = record['trial']; ep = trial['c2']
            require(type(ep['complete']) is bool, 'completion must be boolean')
            events = [e for e in trial['events'] if '/C2/' in e['id']]
            plays = {p['decision_id']: p for p in ep['plays']}
            free = [e for e in events if '/C2/free/' in e['id']]
            completed = len(plays) == 4 and len(free) == 4 and all(e['status'] == 'accepted' for e in free)
            require(completed == ep['complete'], 'completion does not match admitted plays')
            counts['completed'] += completed
            counts['assigned_matched'] += bool(ep['calibration'])
            model = by_model.setdefault(record['model'], {'planned': 0, 'completed': 0})
            model['planned'] += 1; model['completed'] += completed
            for e in events:
                board = e['view']['offense']
                require(len(board) == 9 and sum(board) == 5, 'wrong QB roster')
                counts['c2_decisions'] += 1
                counts['first_valid'] += e['attempts'][0]['verdict'] == 'accepted'
                accepted = []
                for attempt in e['attempts']:
                    require(attempt['ticket'] == attempt['received_ticket'], 'ticket mismatch')
                    require(attempt['request'] == attempt['received_request'], 'request mismatch')
                    req = json.loads(attempt['request'])
                    raw = json.loads(attempt['wire'])['message']['content']
                    try:
                        cmd = json.loads(raw)
                    except json.JSONDecodeError:
                        cmd = None
                    if attempt['verdict'] == 'accepted':
                        require(legal(cmd, board), 'accepted illegal command')
                        accepted.append(cmd)
                    if attempt.get('reason') == 'source cell is unoccupied':
                        counts['empty_source_rejections'] += 1
                        require(cmd['action'] == 'move_person' and board[cmd['args']['from_cell']] == 0,
                                'empty-source rejection does not match raw reply')
                        if example is None:
                            example = {'id': e['id'], 'model': record['model'], 'board': board,
                                       'raw': raw, 'reason': attempt['reason'], 'request': req}
                    if cohort == 'after':
                        schema = req['format']
                        forms = schema['$defs']['MoveArgs']['oneOf']
                        offered = {(f['properties']['from_cell']['const'], d) for f in forms
                                   for d in f['properties']['to_cell']['enum']}
                        expected = {(s, d) for s, n in enumerate(board) if n for d in range(9) if s != d}
                        require(offered == expected, 'revised menu differs from legal transfers')
                        require(schema['$defs']['DoNothing']['properties']['action']['const'] == 'do_nothing',
                                'explicit hold missing')
                if e['status'] == 'accepted':
                    require(accepted == [e['command']], 'command differs from raw accepted answer')
                    if e['assigned'] is None:
                        p = plays[e['id']]
                        require(p['command'] == e['command'] and p['before'] == board, 'effect binding mismatch')
                        expected = list(board)
                        if e['command']['action'] == 'move_person':
                            args = e['command']['args']; expected[args['from_cell']] -= 1; expected[args['to_cell']] += 1
                        require(expected == p['after'], 'transfer effect mismatch')
                else:
                    require(not accepted and e['command'] is None, 'failed decision became command')
            if completed:
                yards = [p['play']['yards'] for p in ep['plays']]
                score = float(sum(yards) >= 10)
                require(ep['objective'] == score, 'four-play objective mismatch')
            else:
                require(ep['objective'] is None, 'missing outcome became a score')
        output[cohort] = {**dict(counts), 'by_model': by_model}
    require(output['before']['completed'] == 8 and output['after']['completed'] == 25, 'headline mismatch')
    require(output['before']['empty_source_rejections'] == 41, 'empty-source count mismatch')
    require(output['after']['assigned_matched'] == 25, 'assigned actions mismatch')
    if details:
        output['example'] = example
    return output
