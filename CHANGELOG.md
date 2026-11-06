# Change log

## 2.5 - 2026-11-06
- Keyword highlights (a few per day, dotted underline): tap one for a floating window with its meaning in English and Kannada, related recent stories from the saved days, and a Deep search button that opens the phone's browser.
- Problem reports: Report a problem or request (footer), a local log of failures (errors, voice problems, load failures), and a prompt to send a report after the app closes unexpectedly. Reports are shared only when the user chooses, by the share sheet or a prefilled GitHub issue.
- Noto Sans Kannada is the Kannada font (full weight range 100 to 900).

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

## 2.6
- Categories: Top, Students (school, college, civil services), General (technology, government schemes, farmers, science, medical), Sports, Foreign affairs, and a Summary tab listing every article. Stories carry `c` (category codes), `x:1` (category-only, hidden from Top) and a third section `wd` (world).
- The number of stories per section now follows the news (up to 40) instead of a fixed 10.
- More details load on demand from `data/more/<date>.json` with a loading spinner and a retry button. Inline `d`/`kd`/`ds` still work.
- Removed the Google News search links. They triggered a "are you a human" check in the in-app reader. Only direct report links and outlet home pages are shown. The in-app reader has a Browser button for sites that still ask for a human check.
- Settings: text size, themes (Auto uses system text and background colours, Light, Dark, Eye comfort), reminder. Pinch zoom works. Voice speed uses numbers (0.5x to 2x) and is remembered, as are the theme, text size and category.
- Refresh button, pull down to refresh, and a refresh when the app returns after 30 minutes.
- Share-app and settings buttons moved to the top corner.

## 2.7
- Update check runs on every open and every time the app comes forward (at most once per 20 seconds), retries 3 times, and falls back to the release page if GitHub's data service refuses. The pop-up names the new and installed versions.
- A toast says "App is up to date" or "Could not check for updates". Settings has App updates with the result, time checked and a Check for updates button.

## 2.8
- Weather pop-up (one window): asks once for approximate location (coarse permission, only when Weather is tapped), or search a place by name. Shows temperature, feels like, humidity, wind speed and direction, rain chance, rainfall, cloud cover, rain outlook for 48 hours, next 12 hours and next 5 days. Cached 15 minutes. Data by Open-Meteo (CC BY 4.0). CSP allows only api.open-meteo.com and geocoding-api.open-meteo.com.
- Calendar pop-up: reads data/calendar.json only when tapped (`{"source":{"n","u"},"events":[{"d","t","k"}]}`). Content from Sabhadi Mutt, Gadag must be added with the mutt's permission.
- Icons on every category tab and sub-tab.
- Default theme is Eye comfort (new setting key, so existing installs switch once; the choice is still changeable).

## 2.9
- Any day in the last 90 days can be opened from the calendar, with the arrows or by swiping. Days with a written briefing show it first; every day then gets live headlines collected at that moment from Indian and Karnataka news sites (GDELT Project index), clustered by topic, ranked by how many outlets reported them, and sorted automatically into India, Karnataka, World, Sports, Students and General categories. Live items carry a "Live headline" badge, an outlet name and a link to the original report only. Cached 30 minutes for today and 24 hours for earlier days. The app opens on Today. A status bar shows progress, the result, or a retry button.
- Android: new `liveGet` bridge (https api.gdeltproject.org only) so the app does not depend on browser cross-site rules.
