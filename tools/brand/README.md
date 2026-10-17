# ESSTRAPIS logo

`build_logo.py` draws the logo from the font: «ESS» in white inside a rounded box with a
speech-bubble tail, «TRAPIS» beside it in `currentColor`. It uses Nunito Black (the app's
font), turned into outlines, so the SVGs don't need the font.

```bash
python3 -m venv /tmp/logo-venv && /tmp/logo-venv/bin/pip install fonttools uharfbuzz
curl -sL -o /tmp/Nunito.ttf "https://github.com/google/fonts/raw/main/ofl/nunito/Nunito%5Bwght%5D.ttf"
mkdir -p /tmp/logo-out && /tmp/logo-venv/bin/python tools/brand/build_logo.py /tmp/Nunito.ttf /tmp/logo-out
```

It writes:

- `esstrapis-logo.svg`: the whole logo → `public/esstrapis-logo.svg`
- `esstrapis-mark.svg`: the bubble alone → `public/esstrapis-mark.svg`
- `logo.json`: the same paths → paste them into `src/components/BrandLogo.vue`
- `Nunito-Black.ttf`: the instance used (not needed afterwards)

To change the margin around «ESS», the tracking or the colour, edit `PADX`/`PADY`, `TRACK`
or `BOX` in the script. The favicon and app icons (`public/favicon*`,
`public/img/icons/`) are a square «ESS» in the same green; they're made separately.
For the public website, copy `esstrapis-logo.svg` with `currentColor` replaced by the text
colour (`images/esstrapis-dark.svg`: #1F2A2E; `images/esstrapis.svg`: #ffffff).
