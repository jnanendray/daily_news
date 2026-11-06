# Change log

## 2.0 - 2026-11-06
- Day-wise archive: one JSON file per day, `data/index.json` lists dates, calendar to pick any day, previous/next day, swipe, deep links (`#2026-11-06/in-3`).
- Briefings are written only on days the app is opened and a briefing is requested. No automatic daily run.
- Device cache keeps a briefing for 24 hours after it was last opened, then deletes it. Re-opening that day fetches it again.
- Share button on every story (system share sheet, or copy link) and a link to find the original report. Share/download link for the Android app.
- Android: voice now uses the phone's text-to-speech directly (works inside the app), asks Android to install missing Kannada voice data, reference links open in an in-app reader, share sheet, bundled offline copy is the current site.
- Smaller and faster: no web fonts (system fonts), no third-party requests, strict Content-Security-Policy, DOM built without innerHTML.
- Glossy redesign, light and dark themes, reduced-motion support.
- Added copyright, privacy and removal-request notice.

## 1.0 - 2026-10-28
- First version: top 10 India and Karnataka stories in English and Kannada, spoken playback, Android app.
