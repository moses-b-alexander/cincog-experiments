"""Run both installed studies and replay the selected real C4 trace with sockets blocked.

Install the bundled wheel in a clean environment first, then run this script
with that environment's Python. Outputs go to a fresh temporary directory.
"""
import argparse
from contextlib import contextmanager, redirect_stdout
from importlib import import_module
from io import StringIO
import json
import os
from pathlib import Path
import socket
import sys
import tempfile


def deny(*args, **kwargs):
    raise RuntimeError('Network disabled during qualification')


@contextmanager
def in_directory(path):
    original = Path.cwd()
    try:
        os.chdir(path)
        yield
    finally:
        os.chdir(original)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parent)
    args = parser.parse_args()
    root = args.root.resolve()
    import framework_lab
    if framework_lab.__version__ != '0.1.0':
        raise RuntimeError('Install the exact bundled 0.1.0 replay wheel')
    socket.create_connection = deny
    socket.socket.connect = deny
    socket.socket.connect_ex = deny
    from framework_lab.study import main as run
    with tempfile.TemporaryDirectory(prefix='cincog-011-replay-') as temp, in_directory(temp):
        result = {'runtime': framework_lab.__version__, 'installed_module': framework_lab.__file__, 'network': 'blocked'}
        for name in ('c2', 'c4'):
            captures = []
            for command in (['preview'], ['run', '--output', name + '.json'], ['replay', name + '.json']):
                sink = StringIO()
                with redirect_stdout(sink):
                    if run(name, command) != 0: raise RuntimeError('study failed')
                captures.append(json.loads(sink.getvalue()))
            record = json.loads(Path(name + '.json').read_bytes())
            if captures[0] != record['config']: raise RuntimeError('preview/run differ')
            result[name] = {'replayed': captures[2]['replayed'],
                            'decisions': sum(len(t['decisions']) for t in record['trials'])}
        sink = StringIO()
        with redirect_stdout(sink):
            run('c4', ['replay', str(root / 'evidence/c4-kev.json')])
        result['selected_kev_trace'] = json.loads(sink.getvalue())
        print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
