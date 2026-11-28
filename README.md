# Cincog · C4 word experiment

Inspect what sender A chose, what receiver C could see, and how two different
clues changed the probabilities assigned to all 64 words. The page contains
the recorded decisions and an offline reproduction kit.
[Open the interactive walkthrough](https://moses-b-alexander.github.io/cincog-experiments/)

The [five-product receiver pilot](https://moses-b-alexander.github.io/cincog-experiments/pilot/)
compares whole words, first halves and last halves on three matched targets.
Its evidence ZIP contains the five registered records and an offline replay
entry point. The [word graphs](https://moses-b-alexander.github.io/cincog-experiments/word-graphs.html)
describe the original menu and candidate banks using exact clue enumeration.

## Inspect locally

Open `site/index.html`, or run `python -m http.server 8769 --directory site`
and visit `http://localhost:8769/`. All page assets are local to the site.

## Rebuild and publish

Extract the linked C4 reproduction kit into `kit/`. It supplies both inputs
to the build. From the repository root, run:

```console
python release-source/build.py --wheel kit/wheel/cincog_framework_lab-0.1.0-py3-none-any.whl --c4 kit/evidence/c4-kev.json --output build
node release-source/test_ui.cjs build/site
```

Choose a fresh output directory for each build. The packager checks the
original wheel and trace hashes, builds the kit and emits the curated
repository tree under `build/github-pages/`. The kit README explains how to
verify all displayed probabilities and replay the recorded episode.

To publish an update, commit the reviewed tree in this presentation repository
and dispatch **Publish Cincog evidence** with Pages configured for GitHub
Actions. Check the returned URL on desktop and mobile, switch A/C, reveal the
host state, filter the full table, and verify the downloaded kit checksum.
The presentation uses runtime 0.1.0. Its provenance is in
`site/evidence/provenance.json`.
