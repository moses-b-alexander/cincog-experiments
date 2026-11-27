"""Build the static presentation and offline kit from explicitly named local inputs."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import zipfile

from verify import ARMS, c4_data, require

HERE = Path(__file__).resolve().parent
BASE = '8b677f65b10e8248bcd57c075354a0bd03f5cb46'
HANDOFF = 'bc1327f0aed03d09f6946709f771b1f77f48f374'
WHEEL_SHA = '09883a0a5e29a5e6ecf386ec0cf512e08783601368195c0009b0d208e02b344c'


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False, allow_nan=False) + '\n', encoding='utf8')


def copy(src, dst):
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(src, dst)


def zip_tree(folder, destination):
    with zipfile.ZipFile(destination, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for p in sorted(folder.rglob('*')):
            if p.is_file():
                info = zipfile.ZipInfo(p.relative_to(folder).as_posix(), (2026, 11, 26, 0, 0, 0))
                info.compress_type = zipfile.ZIP_DEFLATED
                info.external_attr = 0o100644 << 16
                z.writestr(info, p.read_bytes())


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ('wheel', 'c4', 'output'):
        parser.add_argument('--' + name, type=Path, required=True)
    a = parser.parse_args()
    # No deletes: each build starts in a new directory, preserving previous candidates.
    require(not a.output.exists(), 'Choose a new output directory; previous builds are preserved.')
    a.output.mkdir(parents=True)
    site, kit = a.output / 'site', a.output / 'reproduce'
    site.mkdir(); kit.mkdir()
    require(sha(a.wheel) == WHEEL_SHA, 'not the qualified 0.1.0 wheel')
    copy(a.wheel, kit / 'wheel' / a.wheel.name)
    copy(a.c4, kit / 'evidence/c4-kev.json')
    c4 = c4_data(a.c4)
    for name in ('verify.py', 'replay_offline.py', 'README.md'):
        copy(HERE / name, kit / name)
    write(kit / 'provenance.json', {'release': '0.1.1', 'runtime_version': '0.1.0',
        'runtime_base_commit': BASE, 'handoff_commit': HANDOFF,
        'c4_record_sha256': c4['sha256'], 'c4_workflow_sha256': c4['workflow_sha256'],
        'runtime_wheel_sha256': WHEEL_SHA,
        'c4_model': 'kev:0.8b-q8_0', 'c4_model_digest': None,
        'c4_digest_note': 'The selected registered record preserves the tag but does not contain a weight digest.',
        'scope': 'Presentation/evidence release. Runtime and original records unchanged.'})
    files = [{'path': p.relative_to(kit).as_posix(), 'sha256': sha(p), 'bytes': p.stat().st_size}
             for p in sorted(kit.rglob('*')) if p.is_file()]
    write(kit / 'manifest.json', {'version': 1, 'release': '0.1.1', 'files': files})
    # The browser uses derived data, while the original records stay available.
    c4['comparison']['conditions'] = {
        label: {'receiver_arm': arm, 'fragment': c4['receiver'][arm]['body']['state']['observation']['fragment'],
                'active_rule_disclosed': False}
        for label, arm in zip(('p', 'q'), ARMS)
    }
    data = {'c4': c4, 'release': '0.1.1', 'runtime_version': '0.1.0'}
    for p in (HERE / 'web').iterdir():
        if p.is_file(): copy(p, site / p.name)
    (site / 'data.js').write_text('window.CINCOG_DATA = ' + json.dumps(data, ensure_ascii=True, allow_nan=False)
                                .replace('<', '\\u003c') + ';\n', encoding='utf8')
    write(site / 'data.json', data)
    copy(a.c4, site / 'evidence/c4-kev.json')
    copy(kit / 'manifest.json', site / 'evidence/manifest.json')
    copy(kit / 'provenance.json', site / 'evidence/provenance.json')
    (site / '.nojekyll').write_text('', encoding='utf8')
    (site / 'downloads').mkdir()
    zip_tree(kit, site / 'downloads/cincog-c4-reproduce.zip')
    (site / 'downloads/SHA256SUMS.txt').write_text(sha(site / 'downloads/cincog-c4-reproduce.zip')
        + '  cincog-c4-reproduce.zip\n', encoding='utf8')
    write(site / 'site-manifest.json', {'release': '0.1.1', 'files': [
        {'path': p.relative_to(site).as_posix(), 'sha256': sha(p), 'bytes': p.stat().st_size}
        for p in sorted(site.rglob('*')) if p.is_file()]})
    zip_tree(site, a.output / 'cincog-v0.1.1-pages.zip')
    # A separate clean repository package avoids publishing the private research tree.
    repo = a.output / 'github-pages'
    shutil.copytree(site, repo / 'site')
    copy(HERE / 'deploy-pages.yml', repo / '.github/workflows/pages.yml')
    copy(HERE / 'PUBLISH.md', repo / 'README.md')
    for name in ('build.py', 'verify.py', 'replay_offline.py', 'test_ui.cjs', 'README.md'):
        copy(HERE / name, repo / 'release-source' / name)
    shutil.copytree(HERE / 'web', repo / 'release-source/web')
    copy(HERE / 'deploy-pages.yml', repo / 'release-source/deploy-pages.yml')
    copy(HERE / 'PUBLISH.md', repo / 'release-source/PUBLISH.md')
    zip_tree(repo, a.output / 'cincog-v0.1.1-github-pages.zip')
    archives = sorted(a.output.glob('*.zip'))
    (a.output / 'SHA256SUMS.txt').write_text(''.join(sha(p) + '  ' + p.name + '\n' for p in archives), encoding='utf8')
    print(json.dumps({'site': str(site), 'kit': str(kit), 'pages_zip': str(a.output / 'cincog-v0.1.1-pages.zip'),
                      'JS_bits': c4['comparison']['js_bits'], 'TV': c4['comparison']['tv']}, indent=2))


if __name__ == '__main__':
    main()
