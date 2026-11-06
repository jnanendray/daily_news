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

**Data format** (`data/YYYY-MM-DD.json`): `in` and `ka` arrays of up to 10 stories with `h`, `t` (English), `kh`, `k` (Kannada), `s` (sources), `w` (when), `ic` (icon), `tn` (tone t1 to t5), optional `p` (1 = important) and `u` (https link to the original report).
