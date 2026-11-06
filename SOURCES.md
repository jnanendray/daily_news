# Source policy

Every briefing is gathered from Indian news organisations, and each story names its sources.

**India (national).** Indian news channels and newspapers, for example NDTV, India Today, News18, ABP News, Zee News, DD News, The Hindu, The Indian Express, Hindustan Times, The Times of India, Business Standard, Mint.

**Karnataka (state).** Only reputed Karnataka-based channels and newspapers, for example Prajavani, Vijay Karnataka, Udayavani, Kannada Prabha, Vijayavani, Samyukta Karnataka, Deccan Herald, Bangalore Mirror, TV9 Kannada, Asianet Suvarna News, Public TV, Zee Kannada. Do not use national aggregators or national outlets for Karnataka stories.

**Rules.**
- Every story must name its source outlet(s) in `s`; the page shows them as a small linked line at the end of the story. Use the exact outlet names listed above so the link is added.
- Summaries and headlines are written in original words; no photographs or full articles are copied.
- Prefer stories from the last 24 hours; show the real date in the `w` field when older.
- Set `"p": 1` on a story that is both recent and important to many people. It shows an Important badge.
- Skip graphic crime detail and suicide reports.
- A briefing is written only on a day the app is opened and one is requested.

**More details tab.** For every story, search other outlets that report the same story and write a short combined summary in your own words (`d` in English, `kd` in Kannada, 3 to 5 sentences) with the other outlets as `ds`: a list of {"n": outlet name, "u": https link to that outlet's report}. Only use facts that those reports confirm; say when reports differ or when you could not confirm a date. If nothing more can be confirmed, leave `d`, `kd` and `ds` out; the page then shows a link to find more reports.

**Keywords.** On at most half of the stories, add 1 or 2 `kw` entries for terms an ordinary reader may not know (an institution, a technical word, an idiom). Format: {"w": the term exactly as it appears in `t` (English summary), "m": one or two sentence English meaning, "kw": the same term as it appears in the Kannada summary `k` (omit if it does not appear exactly), "km": Kannada meaning}. Do not highlight names of people, places or common words, and never more than 2 per story.

**Data format** (`data/YYYY-MM-DD.json`): `in` and `ka` arrays of up to 10 stories with `h`, `t` (English), `kh`, `k` (Kannada), `s` (sources), `w` (when), `ic` (icon), `tn` (tone t1 to t5), optional `p` (1 = important), `u` (https link to the original report), the More details fields `d`, `kd`, `ds`, and keyword entries `kw`.

## Format update (2.6)
- `data/<date>.json`: `{"date","in":[],"ka":[],"wd":[]}`. Number of stories follows importance (about 6 to 25 per section; fewer when little happened).
- Each story may add `c`: up to 3 of school, college, civil, tech, gov, farm, sci, med, sport, world, politics, business, environment, entertainment. Add `x:1` for stories that should appear only in their category and not in Top.
- `wd` holds foreign-affairs stories from reputed outlets (The Hindu, Indian Express, NDTV, DD News and similar).
- More details go in `data/more/<date>.json` as `{"in-0":{"d","kd","ds":[{"n","u"}]}}` keyed by section and index. Keep each `u` a real link seen in results. Never add search-engine links.

## Live headlines (2.11)
- data/live/<date>.json is written by .github/workflows/collect-news.yml using tools/collect.py. Rules for sections and categories are kept in tools/collect.py and in app.js (buildLive); change both together.
- The written briefing (data/<date>.json) stays the richer source with summaries and Kannada.
