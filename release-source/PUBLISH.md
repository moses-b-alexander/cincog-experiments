# Publish the Cincog v0.1.1 presentation on GitHub Pages

Target: **November 29, 2026, noon America/New_York (17:00 UTC)**.
This folder is a curated public repository package. It is not the private
research checkout. It contains only the static site, selected public evidence,
offline reproduction kit, release source, and deployment workflow.

1. Create a dedicated **public** GitHub repository (suggested name:
   `cincog-experiments`) and place this folder's contents at its root, including
   `.github/workflows/pages.yml` and `site/`. Do not change the private research
   repository's visibility.
2. In repository Settings → Pages, select **GitHub Actions** as the source.
3. Run the **Publish Cincog evidence** workflow from Actions when ready to publish.
   It uploads the existing `site/` directory. There is no package installation,
   build service, database or model backend.
4. Inspect the workflow result and its returned Pages URL. Test that URL at a
   narrow mobile width and a desktop width, switch A/C, reveal/hide host state,
   filter the full table, inspect a legal QB source, and download the kit.
5. Publish release tag `v0.1.1` in this presentation repository with the static
   Pages ZIP, reproduction ZIP and checksums. This presentation release retains
   the separately versioned, qualified runtime wheel 0.1.0.

GitHub Free supports Pages from public repositories and standard Actions runners
are free for public repositories. See the official documentation:

- https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
- https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site

## Local inspection

Open `site/index.html` directly; its interaction data is bundled, with no fetch,
CDN or server dependency. Alternatively, `python -m http.server 8769 --directory site`
serves it locally. The site cannot execute models or send visitor data.

The prepared package passed offline evidence reconstruction and semantic UI
checks. **Rendered browser QA and a live GitHub Pages deployment were not possible
in the preparation session**, whose browser tools were unavailable and GitHub
connection failed. A successful package build is not evidence of a published site.

## Source preparation

`release-source/` holds the presentation source and packager. The reproduction
download holds the original records and runtime source. The build accepts explicit
paths to a clean baseline source export, the original qualified wheel, the
registered C4 trace, the before/after C2 directories and final qualification
archive. It requires a new output directory and never overwrites earlier builds.

```console
python release-source/build.py --baseline BASELINE --wheel WHEEL --c4 C4_TRACE --c2-before BEFORE --c2-after AFTER --c2-archive FINAL_ARCHIVE --output OUTPUT
node release-source/test_ui.cjs OUTPUT/site
```

The exact implementation base and record hashes are in
`site/evidence/provenance.json`. The selected C4 record lacks an exact weight
digest. This package adds no new software license grant.
