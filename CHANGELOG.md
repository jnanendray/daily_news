# Change log

## 2.4 - 2026-11-06
- More details tab on every story: a longer summary combined from other outlets (English and Kannada) with linked outlet names, and a link to find more reports. Filled in where other outlets' reports could be confirmed.
- Source line (outlet name and link) at the end of every story. Karnataka stories only from Karnataka-based outlets.

## 2.3 - 2026-11-06
- Daily reminder (Android): switch it on and pick a time; a notification "Your briefing is ready" opens the app. Asks for the notification permission once, only when switched on. Restored after restart or update.
- Update check in the app, and builds now use one permanent signing key so updates install over the old version.
- Fonts bundled: Inter (English) and Noto Sans Kannada, both SIL Open Font License 1.1. About 140 KB.
- Step-by-step help when Google speech or the Kannada voice is missing, with buttons; rechecks when you come back to the app.
- Automatic daily briefing run restored (06:42 India time).

## 2.1 - 2026-11-06
- Speaking animation: an animated speaker with moving bars shows on the story being read, and a Speaking indicator stays in the top bar.
- Android voice: the app now asks for Google Speech Services (com.google.android.tts) first, picks the best installed voice for the language, and offers a "Get Google voice" button if it is missing.
- New logo (news page with sound waves): app icon, web favicon and page header.
- Important stories carry an "Important" badge and a highlighted card.
- Source policy added (SOURCES.md): Indian channels and newspapers for India, Karnataka local channels and newspapers for Karnataka.
- The open page refreshes itself if a newer file for the same day is published.

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
