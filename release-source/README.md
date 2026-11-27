# Cincog v0.1.1 — one decision, different information

This is a presentation and evidence release for the C4 word experiment. It pins the unmodified
`cincog-framework-lab` **0.1.0** runtime so its original registered records can
be replayed exactly. The presentation release number and runtime version are
different. Python 3.10+ is required; the runtime has no third-party dependencies.

## Reconstruct the published numbers

Extract this kit into a new directory and run:

```console
python verify.py
```

This verifies the file manifest, the original C4 record hash and response/action
bindings, the matched fragment change and both 64-word probability vectors.
For the recorded pair, Jensen–Shannon divergence is **0.0022420995274336298
bits**, total variation is **0.044753119849064715**, and the change in target
probability is **−1.4310 percentage points**.

## Install and replay independently

From the extracted kit, create a new environment and install the bundled wheel
with the package index disabled. On Windows:

```console
python -m venv env
env\Scripts\python -m pip install --no-index --no-deps wheel/cincog_framework_lab-0.1.0-py3-none-any.whl
env\Scripts\python -I -B replay_offline.py
```

The replay script changes into a new temporary directory outside the sources,
previews, runs and replays the scripted C4 fixture, then replays the recorded
Kev C4 episode. Each contains five decisions. The script blocks network
connections during both checks.

The equivalent ordinary installed commands are:

```console
python -m studies.c4 preview
python -m studies.c4 run --output words.json
python -m studies.c4 replay words.json
python -m studies.c4 replay evidence/c4-kev.json
```

On macOS/Linux, replace `env\Scripts\python` with `env/bin/python`. Those
platforms have not been qualified for this release. No model weights are included.

The pinned wheel contains the Python sources used for replay. Its original
SHA-256 and source revision are recorded in `provenance.json`.

## What the records mean

C4 anchors trial `c4/1`, decision `C4/C/alternating`. A chose `baseline` once.
Fresh C instances saw `base` and `bsln` in matched conditions and selected
`baseline` and `baseball` respectively. The host used argmax; the probabilities
are native model-assigned action weights, not frequencies across runs. Its
separate `confidence` field is not an action probability.

JS uses base-2 logarithms and M=(P+Q)/2. Each zero-weight term contributes zero;
no smoothing is applied. Vectors are normalized only for floating-point total
error. A positive numerator against a zero denominator makes directed KL infinite.
The full 64-word bank contributes even when a chart displays a subset.

The selected C4 record contains the model tag but no weight digest or server
identity. Exact saved-record replay is qualified. A fresh request may differ.
New prompts, menu order, bank contents, strategic B choices and downstream
histories need new requests. Larger menus and population claims remain open.

`provenance.json` identifies the source revisions and original record hashes.
`manifest.json` hashes the files in this kit; it detects accidental changes,
not an attacker who can rewrite both evidence and manifest. The historical C4
trace also has a separately pinned original digest in `verify.py`.
No new software license grant is added by this presentation release.
