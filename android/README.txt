DAILY NEWS BRIEFING - ANDROID APP (build once, free)

WHAT IT IS
A small app that opens your LIVE news page full-screen, so it shows each day's news and audio automatically.
Its only permission is INTERNET, used only for your own page. If you are offline or the page is down, it shows the
bundled copy of the news instead. Outside links open in your browser, never inside the app. No storage, camera,
microphone, location or contacts access.

The live address is already set to https://jnanendray.github.io/daily_news/ in app/src/main/res/values/strings.xml (no edit needed unless you rename the repository). Turn on GitHub Pages first (see below). Original note: replace the live_url address with your own GitHub Pages
address (https://YOUR-NAME.github.io/YOUR-REPO/). Until you do, the app shows the bundled copy.

BUILD IT (about 10 minutes, free GitHub account)
1. Create a signing key (keep this file and password SAFE; it proves updates come from you).
   On your laptop (needs Java):
     keytool -genkeypair -v -keystore release.jks -alias newskey -keyalg RSA -keysize 2048 -validity 10000
   Choose a strong password. Never share release.jks or upload it anywhere public.
2. Make the key text:   (Windows PowerShell)  [Convert]::ToBase64String([IO.File]::ReadAllBytes("release.jks"))
                        (Mac/Linux)           base64 -w0 release.jks
3. On github.com create a NEW PRIVATE repository and upload everything in this folder.
4. Repository > Settings > Secrets and variables > Actions > New repository secret. Add four secrets:
     KEYSTORE_BASE64    (the long text from step 2)
     KEYSTORE_PASSWORD  (your password)
     KEY_ALIAS          newskey
     KEY_PASSWORD       (your key password; same as above if you pressed Enter)
5. Actions tab > "Build signed APK" > Run workflow. When it finishes, download the artifact "DailyNewsBriefing-apk".
6. Copy the APK to your phone and install it (allow "install unknown apps" for your file manager once).

UPDATING
You do NOT rebuild for daily news; the app loads the live page. Rebuild only if you change the app itself
(raise versionCode in app/build.gradle by 1 and run the workflow again).
