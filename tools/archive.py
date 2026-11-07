"""Past days from the newspapers' own public archives (no search engine, no API key).
Deccan Herald, Prajavani and Kannada Prabha publish a sitemap for every single day with the real article links;
Times of India publishes a day-by-day archive page. Headlines are read from each article page (og:title)."""
import html, re
from concurrent.futures import ThreadPoolExecutor

SKIP = re.compile(r'horoscope|astro|vastu|photo|video|gallery|cartoon|puzzle|crossword|panchanga|rashi|bhavishya|quiz|web-stories', re.I)
SITEMAPS = [
    # (outlet, daily sitemap pattern, language, section hint, how many)
    ('Deccan Herald', 'https://www.deccanherald.com/sitemap/sitemap-daily-%s.xml', 'en', '', 45),
    ('Prajavani', 'https://www.prajavani.net/sitemap/sitemap-daily-%s.xml', 'kn', 'ka', 40),
    ('Kannada Prabha', 'https://www.kannadaprabha.com/sitemap/sitemap-daily-%s.xml', 'kn', 'ka', 35),
]
OG = [re.compile(r'<meta[^>]+property=["\']og:title["\'][^>]+content=["\']([^"\']+)', re.I),
      re.compile(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:title["\']', re.I),
      re.compile(r'<title[^>]*>([^<]+)</title>', re.I)]
TAIL = re.compile(r'\s*[\|\-–—]\s*(Deccan Herald|Prajavani|ಪ್ರಜಾವಾಣಿ|Kannada Prabha|ಕನ್ನಡ ಪ್ರಭ|The New Indian Express|Times of India|[A-Za-z ]{0,25}News)\s*$', re.I)


def clean(t):
    t = re.sub(r'\s+', ' ', html.unescape(t or '')).strip()
    return TAIL.sub('', t).strip()


def page_title(url, get):
    try:
        b = get(url, limit=150_000, timeout=20).decode('utf-8', 'replace')
    except Exception:
        return ''
    for rx in OG:
        m = rx.search(b)
        if m and clean(m.group(1)):
            return clean(m.group(1))
    return ''


def pick(urls, cap):
    good = [u for u in urls if not SKIP.search(u)]
    pri = [u for u in good if re.search(r'karnataka|bengaluru|state|politics|india|world|business|sport|nation', u, re.I)]
    rest = [u for u in good if u not in pri]
    return (pri + rest)[:cap]


def sitemap_items(date, get):
    out = []
    jobs = []
    for name, pat, lang, sec, cap in SITEMAPS:
        try:
            x = get(pat % date, limit=6_000_000, timeout=30).decode('utf-8', 'replace')
        except Exception as e:
            print('archive %-16s %s unavailable (%s)' % (name, date, str(e)[:40]))
            continue
        urls = [html.unescape(u) for u in re.findall(r'<loc>\s*(https?://[^<\s]+)\s*</loc>', x)]
        chosen = pick(urls, cap)
        print('archive %-16s %s %d links, reading %d' % (name, date, len(urls), len(chosen)))
        jobs += [(name, lang, sec, u) for u in chosen]
    with ThreadPoolExecutor(max_workers=12) as ex:
        titles = list(ex.map(lambda j: page_title(j[3], get), jobs))
    for (name, lang, sec, u), t in zip(jobs, titles):
        if len(t) >= 15 and (lang != 'kn' or re.search(r'[ಀ-೿]', t)):
            out.append({'title': t, 'url': u, 'name': name, 'kn': lang == 'kn', 'sec': sec, 'cat': '', 'date': date})
    return out


def toi_items(date, get, cap=40):
    y, m, d = date.split('-')
    from datetime import date as D
    serial = (D(int(y), int(m), int(d)) - D(1899, 12, 30)).days
    url = 'https://timesofindia.indiatimes.com/%d/%d/%d/archivelist/year-%d,month-%d,starttime-%d.cms' % (int(y), int(m), int(d), int(y), int(m), serial)
    try:
        b = get(url, limit=2_000_000, timeout=30).decode('utf-8', 'replace')
    except Exception as e:
        print('archive Times of India %s unavailable (%s)' % (date, str(e)[:40]))
        return []
    seen, out = set(), []
    for href, text in re.findall(r'<a[^>]+href="([^"]*articleshow/\d+\.cms)"[^>]*>([^<]{20,})</a>', b):
        t = clean(text)
        if href.startswith('/'):
            href = 'https://timesofindia.indiatimes.com' + href
        if href in seen or len(t) < 20 or SKIP.search(href):
            continue
        seen.add(href)
        out.append({'title': t, 'url': href, 'name': 'Times of India', 'kn': False, 'sec': '', 'cat': '', 'date': date})
    print('archive Times of India %s %d headlines' % (date, len(out)))
    return out[:cap]


def archive_items(date, get):
    return sitemap_items(date, get) + toi_items(date, get)
