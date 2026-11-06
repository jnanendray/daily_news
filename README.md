# Daily News Briefing

Top 10 India and top 10 Karnataka stories, in English and Kannada, with spoken playback.

- `index.html`, `style.css`, `app.js`: the page (strict Content-Security-Policy, no inline script, DOM built with textContent only).
- `data/YYYY-MM-DD.json`: one file per day. `data/index.json` lists the available dates.
- A day's briefing is written only when the app is opened and a briefing is requested ("Brief me today"). Days without a file show a message and a jump to the nearest saved day.
- `tools/build_single.py`: builds one self-contained HTML file (used for the Claude artifact).
