#!/usr/bin/env python3
"""Build one self-contained HTML file (for the Claude artifact) from index.html, style.css, app.js and data/*.json."""
import json, re, glob, os, sys
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
rd = lambda p: open(os.path.join(root, p), encoding="utf-8").read()
html, css, js = rd("index.html"), rd("style.css"), rd("app.js")
idx = json.loads(rd("data/index.json"))
days = {os.path.basename(f)[:-5]: json.load(open(f, encoding="utf-8")) for f in sorted(glob.glob(os.path.join(root, "data", "20*.json")))}
more = {os.path.basename(f)[:-5]: json.load(open(f, encoding="utf-8")) for f in sorted(glob.glob(os.path.join(root, "data", "more", "20*.json")))}
emb = json.dumps({"index": idx, "days": days, "more": more, "live": {os.path.basename(f)[:-5]: json.load(open(f, encoding="utf-8")) for f in sorted(glob.glob(os.path.join(root, "data", "live", "20*.json")))[-7:]}, "calendar": (json.load(open(os.path.join(root,"data","calendar.json"),encoding="utf-8")) if os.path.exists(os.path.join(root,"data","calendar.json")) else None)}, ensure_ascii=False).replace("</", "<\\/")
html = re.sub(r'<meta http-equiv="Content-Security-Policy"[^>]*>\n?', "", html)
html = html.replace('<link rel="stylesheet" href="style.css">', "<style>\n" + css + "\n</style>")
html = html.replace('<script src="app.js"></script>', "<script>window.__EMBED=" + emb + ";</script>\n<script>\n" + js + "\n</script>")
import base64
css_fonts = lambda m: 'url("data:font/woff2;base64,' + base64.b64encode(open(os.path.join(root, m.group(1)),'rb').read()).decode() + '")'
html = re.sub(r'url\("(fonts/[^"]+)"\)', css_fonts, html)
logo = "data:image/svg+xml;base64," + base64.b64encode(rd("logo.svg").encode()).decode()
html = html.replace('href="logo.svg"', 'href="' + logo + '"').replace('src="logo.svg"', 'src="' + logo + '"')
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(root, "single.html")
open(out, "w", encoding="utf-8").write(html)
print(out, len(html))
