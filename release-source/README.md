# Cincog v0.1.1 — one decision, different information

This is a presentation and evidence release for C4 and C2. It pins the unmodified
`cincog-framework-lab` **0.1.0** runtime so its original registered records can
be replayed exactly. The presentation release number and runtime version are
different. Python 3.10+ is required; the runtime has no third-party dependencies.

## Reconstruct the published numbers

Extract this kit into a new directory and run:

```console
python verify.py
```

This verifies the file manifest, the original C4 record hash and response/action
bindings, the matched request difference, all 64 probabilities and divergence,
and all 50 C2 records. C2 checks join each free play to an admitted decision,
reconstruct transfers, inspect the revised menus, count empty-source replies,
and preserve missing outcomes. It is a reliability audit, not a causal analysis.

The expected results are C4 JS **0.0022420995274336298 bits**, TV
**0.044753119849064715**, and target probability change **−1.4309505785636445
percentage points**. C2 completion is **8/25** before and **25/25** after.

## Install and replay independently

From the extracted kit, create a new environment and install the bundled wheel
with the package index disabled. On Windows:

```console
python -m venv env
env\Scripts\python -m pip install --no-index --no-deps wheel/cincog_framework_lab-0.1.0-py3-none-any.whl
env\Scripts\python -I -B replay_offline.py
```

The replay script changes into a new temporary directory outside the sources,
previews/runs/replays both registered default fixtures, and replays the real
Kev C4 record. Socket connections are blocked. Expected counts: eight C2
fixture decisions, five C4 fixture decisions, and five original native C4 decisions.
The default fixtures are scripted, not new model experiments.

The equivalent ordinary installed commands are:

```console
python -m studies.c2 preview
python -m studies.c2 run --output football.json
python -m studies.c2 replay football.json
python -m studies.c4 preview
python -m studies.c4 run --output words.json
python -m studies.c4 replay words.json
python -m studies.c4 replay evidence/c4-kev.json
```

On macOS/Linux, replace `env\Scripts\python` with `env/bin/python`. Those
platforms have not been qualified for this release. No model weights are included.

## Source and historical C2 reconstruction

`runtime/` contains the qualified baseline's Python source and tests. From that
directory, using Python with setuptools 68+ installed, an optional offline build is:

```console
python -m pip wheel --no-deps --no-index --no-build-isolation -w ../rebuilt-wheel .
python -B -m unittest discover -q
python -B qualify.py ../evidence/task029-final.zip
```

The inherited runtime README and author guides are preserved from the original
checkout. Some links point to repository documentation or historical archives
outside this kit. Use this top-level guide for the portable reproduction commands.

The final command replays 125 C2 and 125 C4 historical decisions through each of
three comparison implementations. It checks the revised historical C2 actions
and physical outcomes; it does not re-execute the earlier structural-schema
implementation. `verify.py` independently audits the earlier saved commands and
effects to reconstruct the reliability comparison. All original before/after
records are retained byte-for-byte; accompanying historical C4 calibration data
is included to preserve their original hashes. Do not mix those records with
the selected registered Kev episode.

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

C2's earlier schema allowed integer coordinates without guaranteeing an occupied
source. The revised schema enumerated legal transfers and explicit `do_nothing`.
The 8/25 versus 25/25 result supports command reliability on this fixture.
These successive runs do not isolate a causal effect, and strategic improvement
remains untested. Completed final episodes all scored 1.0.

The selected C4 record contains the model tag but no weight digest or server
identity. Exact saved-record replay is qualified. A fresh request may differ.
New prompts, menu order, bank contents, strategic B choices and downstream
histories need new requests. Larger menus and population claims remain open.

`provenance.json` identifies the source revisions and original record hashes.
`manifest.json` hashes the files in this kit; it detects accidental changes,
not an attacker who can rewrite both evidence and manifest. The historical C4
trace also has a separately pinned original digest in `verify.py`.
No new software license grant is added by this presentation release.
