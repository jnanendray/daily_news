#!/usr/bin/env python3
"""Collects one day's headlines from Indian and Karnataka news sites through the GDELT Project index,
groups the same story reported by several outlets, sorts it into sections and categories, and writes
data/live/YYYY-MM-DD.json. Only headline, outlet name and link are kept. Standard library only.

Usage: collect.py [--days N] [--date YYYY-MM-DD] [--mock file.json] [--out data/live]
"""
import argparse, html, json, os, re, sys, time, urllib.parse, urllib.request, urllib.error
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime
from datetime import datetime, timedelta, timezone

IST = timezone(timedelta(hours=5, minutes=30))
GD = 'https://api.gdeltproject.org/api/v2/doc/doc'
DOMS = {
 'thehindu.com': 'The Hindu', 'indianexpress.com': 'Indian Express', 'ndtv.com': 'NDTV',
 'hindustantimes.com': 'Hindustan Times', 'timesofindia.indiatimes.com': 'Times of India',
 'indiatoday.in': 'India Today', 'business-standard.com': 'Business Standard', 'ddnews.gov.in': 'DD News',
 'news18.com': 'News18', 'indiatvnews.com': 'India TV News', 'livemint.com': 'Mint',
 'economictimes.indiatimes.com': 'Economic Times', 'newindianexpress.com': 'New Indian Express', 'theprint.in': 'ThePrint',
 'deccanherald.com': 'Deccan Herald', 'bangaloremirror.indiatimes.com': 'Bangalore Mirror',
 'prajavani.net': 'Prajavani', 'vijaykarnataka.com': 'Vijay Karnataka', 'udayavani.com': 'Udayavani',
 'kannadaprabha.com': 'Kannada Prabha', 'vijayavani.net': 'Vijayavani', 'tv9kannada.com': 'TV9 Kannada',
 'publictv.in': 'Public TV', 'kannada.asianetnews.com': 'Asianet Suvarna News',
 'samyuktakarnataka.com': 'Samyukta Karnataka', 'kannada.news18.com': 'News18 Kannada',
}
# Public RSS feeds of the outlets themselves. (url, outlet, section hint: in/ka/wd, category hint or '', language)
FEEDS = [
 ('https://www.thehindu.com/news/national/feeder/default.rss', 'The Hindu', 'in', '', 'en'),
 ('https://www.thehindu.com/news/international/feeder/default.rss', 'The Hindu', 'wd', 'world', 'en'),
 ('https://www.thehindu.com/sport/feeder/default.rss', 'The Hindu', 'in', 'sport', 'en'),
 ('https://www.thehindu.com/business/feeder/default.rss', 'The Hindu', 'in', 'business', 'en'),
 ('https://indianexpress.com/section/india/feed/', 'Indian Express', 'in', '', 'en'),
 ('https://indianexpress.com/section/world/feed/', 'Indian Express', 'wd', 'world', 'en'),
 ('https://indianexpress.com/section/sports/feed/', 'Indian Express', 'in', 'sport', 'en'),
 ('https://feeds.feedburner.com/ndtvnews-india-news', 'NDTV', 'in', '', 'en'),
 ('https://feeds.feedburner.com/ndtvnews-world-news', 'NDTV', 'wd', 'world', 'en'),
 ('https://feeds.feedburner.com/ndtvsports-latest', 'NDTV', 'in', 'sport', 'en'),
 ('https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml', 'Hindustan Times', 'in', '', 'en'),
 ('https://www.hindustantimes.com/feeds/rss/world-news/rssfeed.xml', 'Hindustan Times', 'wd', 'world', 'en'),
 ('https://www.hindustantimes.com/feeds/rss/cricket/rssfeed.xml', 'Hindustan Times', 'in', 'sport', 'en'),
 ('https://timesofindia.indiatimes.com/rssfeeds/-2128936835.cms', 'Times of India', 'in', '', 'en'),
 ('https://timesofindia.indiatimes.com/rssfeeds/296589292.cms', 'Times of India', 'wd', 'world', 'en'),
 ('https://timesofindia.indiatimes.com/rssfeeds/4719148.cms', 'Times of India', 'in', 'sport', 'en'),
 ('https://www.indiatoday.in/rss/1206514', 'India Today', 'in', '', 'en'),
 ('https://www.deccanherald.com/rss-feed/state', 'Deccan Herald', 'ka', '', 'en'),
 ('https://bangaloremirror.indiatimes.com/rssfeedsdefault.cms', 'Bangalore Mirror', 'ka', '', 'en'),
 ('https://kannada.news18.com/commonfeeds/v1/kan/rss/latest.xml', 'News18 Kannada', 'ka', '', 'kn'),
 ('https://www.deccanherald.com/rss-feed/national', 'Deccan Herald', 'in', '', 'en'),
 ('https://www.deccanherald.com/rss-feed/sports', 'Deccan Herald', 'in', 'sport', 'en'),
 ('https://www.deccanherald.com/rss-feed/international', 'Deccan Herald', 'wd', 'world', 'en'),
 ('https://www.business-standard.com/rss/latest.rss', 'Business Standard', 'in', 'business', 'en'),
 ('https://www.livemint.com/rss/news', 'Mint', 'in', '', 'en'),
 ('https://www.prajavani.net/rss', 'Prajavani', 'ka', '', 'kn'),
 ('https://www.udayavani.com/feed', 'Udayavani', 'ka', '', 'kn'),
 ('https://vijaykarnataka.com/rssfeedsdefault.cms', 'Vijay Karnataka', 'ka', '', 'kn'),
 ('https://www.kannadaprabha.com/rss', 'Kannada Prabha', 'ka', '', 'kn'),
 ('https://tv9kannada.com/feed', 'TV9 Kannada', 'ka', '', 'kn'),
 ('https://publictv.in/feed', 'Public TV', 'ka', '', 'kn'),
 ('https://kannada.asianetnews.com/rss', 'Asianet Suvarna News', 'ka', '', 'kn'),
]
KA_RE = re.compile(r'\b(karnataka|bengaluru|bangalore|mysuru|mysore|hubballi|hubli|dharwad|belagavi|belgaum|mangaluru|mangalore|kalaburagi|gulbarga|gadag|shivamogga|shimoga|ballari|bellary|udupi|tumakuru|hassan|mandya|bidar|vijayapura|siddaramaiah|shivakumar|bbmp|ksrtc|bmtc|namma metro|cauvery|vidhana soudha|kannada)\b', re.I)
WORLD_RE = re.compile(r'\b(u\.s\.|usa|america|american|trump|biden|china|chinese|pakistan|russia|russian|ukraine|israel|gaza|iran|united nations|un general|uk|britain|british|london|canada|australia|japan|bangladesh|nepal|sri lanka|maldives|afghanistan|taliban|europe|european|nato|g20|brics|saudi|uae|dubai|paris|france|germany|turkey|syria|lebanon|korea|taiwan|singapore|myanmar|africa|white house|pentagon|kremlin|beijing|washington|moscow)\b', re.I)
CAT_RE = [
 ('sport', r'cricket|\bipl\b|bcci|\bt20\b|\bodi\b|test match|wicket|batter|bowler|football|\bisl\b|hockey|tennis|badminton|kabaddi|olympic|asian games|athlete|medal|fifa|chess|grand slam|ಕ್ರಿಕೆಟ್|ಪಂದ್ಯ|ಕ್ರೀಡೆ|ಒಲಿಂಪಿಕ್'),
 ('tech', r'\bai\b|artificial intelligence|startup|software|smartphone|cyber|semiconductor|\b5g\b|\btech\b|digital|internet|data cent|chatgpt|ತಂತ್ರಜ್ಞಾನ|ಟೆಕ್'),
 ('gov', r'scheme|yojana|subsidy|cabinet|ministry|budget|\bgst\b|\btax\b|ration|pension|welfare|guarantee|gruha|notification|ಯೋಜನೆ|ಸಬ್ಸಿಡಿ|ಸಂಪುಟ'),
 ('farm', r'farmer|\bfarm|\bcrop|agricultur|kisan|paddy|sugarcane|\bmsp\b|monsoon|irrigation|fertili[sz]er|harvest|drought|ರೈತ|ಕೃಷಿ|ಬೆಳೆ|ಮಳೆ'),
 ('sci', r'\bisro\b|\bspace\b|satellite|\bnasa\b|research|scientist|climate|astronom|physics|ಇಸ್ರೋ|ವಿಜ್ಞಾನ'),
 ('med', r'health|hospital|doctor|disease|vaccine|dengue|cancer|medical|\baiims\b|medicine|patient|virus|ಆರೋಗ್ಯ|ಆಸ್ಪತ್ರೆ|ವೈದ್ಯ'),
 ('college', r'universit|college|campus|placement|\bneet\b|\bjee\b|\bcet\b|scholarship|admission|engineering|degree|ವಿಶ್ವವಿದ್ಯಾಲಯ|ಕಾಲೇಜು'),
 ('school', r'\bschool|\bsslc\b|\bpuc\b|\bcbse\b|\bncert\b|board exam|teacher|students|ಶಾಲೆ|ವಿದ್ಯಾರ್ಥಿ'),
 ('politics', r'\bbjp\b|congress|\bjd\(s\)|\bmla\b|chief minister|opposition|assembly|\bmodi\b|political|poll |ಬಿಜೆಪಿ|ಕಾಂಗ್ರೆಸ್|ರಾಜಕೀಯ|ಮುಖ್ಯಮಂತ್ರಿ'),
 ('business', r'sensex|nifty|\bstock|\bmarket|economy|\bgdp\b|\brbi\b|inflation|\bbank|rupee|\bipo\b|company|profit|exports?\b|ಷೇರು|ಆರ್ಥಿಕ|ಬ್ಯಾಂಕ್'),
 ('environment', r'pollution|air quality|forest|wildlife|\bflood|tiger|elephant|\blake\b|\briver\b|green cover|ಮಾಲಿನ್ಯ|ಅರಣ್ಯ|ಪರಿಸರ'),
 ('entertainment', r'\bfilm|movie|actor|actress|cinema|bollywood|sandalwood|\bott\b|web series|singer|ಸಿನಿಮಾ|ಚಿತ್ರ|ನಟ'),
 ('civil', r'\bupsc\b|\bias\b|\bips\b|\bkpsc\b|supreme court|high court|constitution|parliament|lok sabha|rajya sabha|election|governor|judgment|verdict|tribunal|ಸುಪ್ರೀಂ|ಹೈಕೋರ್ಟ್|ವಿಧಾನಸಭೆ'),
]
CAT_RE = [(k, re.compile(v, re.I)) for k, v in CAT_RE]
CATIC = {'politics': 'ballot', 'business': 'chart', 'environment': 'drop', 'entertainment': 'mic', 'sport': 'cricket',
         'farm': 'trees', 'med': 'cross', 'tech': 'laptop', 'gov': 'doc', 'civil': 'gavel', 'college': 'book',
         'school': 'book', 'sci': 'bolt', 'world': 'plane'}
SENS = re.compile(r'suicide|\brape|molest|sexual (abuse|assault|harass)|ಆತ್ಮಹತ್ಯೆ|ಅತ್ಯಾಚಾರ', re.I)   # not shown: suicide and sexual-violence reports
STOP = set('that this with from have will says said after over into about their they been were what when more than also amid news live updates today'.split())
KN = re.compile(r'[ಀ-೿]')


def is_kn(s): return bool(KN.search(s or ''))


def outlet(domain):
    d = (domain or '').lower()
    d = d[4:] if d.startswith('www.') else d
    best = ''
    for k in DOMS:
        if (d == k or d.endswith('.' + k)) and len(k) > len(best):
            best = k
    return DOMS.get(best, '')


def toks(t):
    out = set()
    for w in t.lower().split():
        w = w.strip('.,;:!?"\'()[]{}“”‘’–—|/')
        if len(w) >= (3 if is_kn(w) else 4) and w not in STOP:
            out.add(w)
    return out


def jac(a, b):
    i = len(a & b)
    u = len(a) + len(b) - i
    return i / u if u else 0


def query_url(date):
    y, m, d = map(int, date.split('-'))
    st = datetime(y, m, d, tzinfo=IST).astimezone(timezone.utc)
    en = st + timedelta(days=1) - timedelta(seconds=1)
    q = '(' + ' OR '.join('domain:' + k for k in DOMS) + ')'
    return GD + '?' + urllib.parse.urlencode({
        'query': q, 'mode': 'artlist', 'maxrecords': 250, 'format': 'json', 'sort': 'hybridrel',
        'startdatetime': st.strftime('%Y%m%d%H%M%S'), 'enddatetime': en.strftime('%Y%m%d%H%M%S')})


UA = {'User-Agent': 'Mozilla/5.0 (compatible; daily-news-briefing/1.0; +https://github.com/jnanendray/daily_news)'}


BROWSER_UA = {'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
              'Accept': 'application/rss+xml, application/xml, text/xml, text/html;q=0.8'}


def get_bytes(url, limit=3_000_000, timeout=30):
    for hdr in (UA, BROWSER_UA):                    # some sites refuse anything that is not a browser
        try:
            req = urllib.request.Request(url, headers=hdr)
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read(limit)
        except urllib.error.HTTPError as e:
            if e.code not in (403, 406) or hdr is BROWSER_UA:
                raise
    raise RuntimeError('unreachable')


def discover(url):
    """Finds feed addresses a site advertises on its home page (rel=alternate rss/atom)."""
    root = '/'.join(url.split('/')[:3]) + '/'
    try:
        page = get_bytes(root, 600_000, 20).decode('utf-8', 'replace')
    except Exception:
        return []
    found = []
    for m in re.finditer(r'<link[^>]+>', page, re.I):
        tag = m.group(0)
        if re.search(r'type=["\']application/(rss|atom)\+xml', tag, re.I):
            h = re.search(r'href=["\']([^"\']+)', tag, re.I)
            if h:
                u = urllib.parse.urljoin(root, html.unescape(h.group(1)))
                if u.startswith('https://') and u not in found:
                    found.append(u)
    for suffix in ('rss', 'feed', 'rss.xml', 'feed.xml', 'rss-feed', 'rssfeed', 'stories.rss', 'rss/index.xml'):   # common spots
        u = root + suffix
        if u not in found:
            found.append(u)
    return found[:12]


def fetch_gdelt(url):
    """One attempt only. GDELT answers shared cloud addresses with 429, so this is a bonus, not a dependency."""
    return json.loads(get_bytes(url, 6_000_000, 60).decode('utf-8', 'replace'))


def text_of(e):
    return re.sub(r'\s+', ' ', html.unescape(''.join(e.itertext()))).strip() if e is not None else ''


def _heal(url, name, sec, cat, lang, today, again, why):
    if not again or url.startswith('file://'):
        return [], why
    for u in discover(url):
        items, note = read_feed(u, name, sec, cat, lang, today, False)
        if items:
            return items, '%s; healed via %s' % (why, u)
    return [], why + '; no feed advertised'


def read_feed(url, name, sec, cat, lang, today, _again=True):
    """Returns (items, note). Items are {title,url,name,kn,sec,cat,date}."""
    try:
        raw = open(url[7:], "rb").read() if url.startswith("file://") else get_bytes(url)
    except Exception as e:
        return _heal(url, name, sec, cat, lang, today, _again, 'unreachable (%s)' % str(e)[:40])
    if b'<!ENTITY' in raw[:4000] or b'<!DOCTYPE' in raw[:200] and b'[' in raw[:600]:
        return [], 'skipped (entity declarations)'
    try:
        root = ET.fromstring(raw)
    except Exception:
        return _heal(url, name, sec, cat, lang, today, _again, 'not valid XML')
    out = []
    for it in root.iter():
        tag = it.tag.split('}')[-1]
        if tag not in ('item', 'entry'):
            continue
        title, link, when = '', '', None
        for ch in it:
            t = ch.tag.split('}')[-1]
            if t == 'title':
                title = text_of(ch)
            elif t == 'link':
                link = (ch.get('href') or text_of(ch) or '').strip()
            elif t in ('pubDate', 'published', 'updated', 'date') and when is None:
                try:
                    when = parsedate_to_datetime(text_of(ch))
                except Exception:
                    try:
                        when = datetime.fromisoformat(text_of(ch).replace('Z', '+00:00'))
                    except Exception:
                        when = None
        if link.startswith('http://'):
            link = 'https://' + link[7:]
        title = re.sub(r'\s+', ' ', title)[:200]
        if not link.startswith('https://') or len(link) > 480 or len(title) < 24:
            continue
        if when is not None and when.tzinfo is None:
            when = when.replace(tzinfo=timezone.utc)
        day = (when.astimezone(IST).date() if when else today).isoformat()
        out.append({'title': title, 'url': link, 'name': name, 'kn': lang == 'kn' or is_kn(title), 'sec': sec, 'cat': cat, 'date': day})
        if len(out) >= 40:
            break
    return out, 'ok, %d items' % len(out)


def from_gdelt(j, date):
    items = []
    for a in (j.get('articles') if isinstance(j, dict) else None) or []:
        if not isinstance(a, dict):
            continue
        url, title = a.get('url'), a.get('title')
        if not isinstance(url, str) or not isinstance(title, str):
            continue
        if url.lower().startswith('http://'):
            url = 'https://' + url[7:]
        name = outlet(a.get('domain'))
        lang = str(a.get('language') or '').lower()
        title = re.sub(r'\s+', ' ', html.unescape(title)).strip()[:200]
        if not name or lang not in ('english', 'kannada') or not url.startswith('https://') or len(url) > 480 or len(title) < 24:
            continue
        items.append({'title': title, 'url': url, 'name': name, 'kn': lang == 'kannada' or is_kn(title), 'sec': '', 'cat': '', 'date': date})
    return items


def build(items, date):
    items = [it for it in items if not SENS.search(it['title'])]
    for it in items:
        it['tk'] = toks(it['title'])
    clusters = []
    for it in items:
        for c in clusters:
            if c['kn'] == it['kn'] and jac(c['rep']['tk'], it['tk']) >= 0.45:
                if it['name'] not in c['names']:
                    c['names'].append(it['name'])
                break
        else:
            clusters.append({'rep': it, 'kn': it['kn'], 'names': [it['name']]})
    for c in clusters:
        r = c['rep']
        sec = r.get('sec') or 'in'
        if r['kn']:
            sec = 'ka'
        elif not r.get('sec'):
            if r['name'] in ('Deccan Herald', 'Bangalore Mirror') and KA_RE.search(r['title']):
                sec = 'ka'
            elif WORLD_RE.search(r['title']):
                sec = 'wd'
        cats = [r['cat']] if r.get('cat') else []
        for k, rx in CAT_RE:
            if len(cats) < 3 and k not in cats and rx.search(r['title']):
                cats.append(k)
        if sec == 'wd' and 'world' not in cats:
            cats.insert(0, 'world')
        c['sec'], c['cats'], c['score'] = sec, cats[:3], len(c['names'])
    out = {'date': date, 'in': [], 'ka': [], 'wd': []}
    rank = {'in': 0, 'ka': 0, 'wd': 0}
    for c in sorted(clusters, key=lambda c: -c['score']):
        n = rank[c['sec']]
        rank[c['sec']] += 1
        if n >= 25:
            continue
        r = c['rep']
        ic = next((CATIC[x] for x in c['cats'] if x in CATIC), 'plane' if c['sec'] == 'wd' else 'doc')
        out[c['sec']].append({
            'h': '' if c['kn'] else r['title'], 'kh': r['title'] if c['kn'] else '', 't': '', 'k': '',
            's': ', '.join(c['names'][:4]), 'w': '',
            'p': 1 if (n < 3 and c['score'] >= (2 if c['sec'] == 'ka' else 3)) else 0,
            'x': 1 if n >= 12 else 0, 'c': c['cats'], 'u': r['url'], 'ic': ic, 'tn': 't%d' % (1 + n % 5), 'lv': 1})
    out['gen'] = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    out['src'] = 'Outlet RSS feeds, GDELT Project'
    return out


def load_raw(path):
    try:
        v = json.load(open(path, encoding='utf-8'))
        return [x for x in v if isinstance(x, dict) and 'url' in x and 'title' in x]
    except Exception:
        return []


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--days', type=int, default=3)
    ap.add_argument('--date')
    ap.add_argument('--mock', help='GDELT-style JSON file used instead of the network')
    ap.add_argument('--mock-feed', help='RSS file used for every feed instead of the network')
    ap.add_argument('--out', default='data/live')
    ap.add_argument('--no-gdelt', action='store_true')
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    rawdir = os.path.join(a.out, 'raw')
    os.makedirs(rawdir, exist_ok=True)
    today = datetime.now(IST).date()
    want = [a.date] if a.date else [(today - timedelta(days=i)).isoformat() for i in range(max(1, min(a.days, 30)))]
    fresh = {d: [] for d in want}
    # 1. the outlets' own feeds (recent items only)
    good = 0
    for url, name, sec, cat, lang in FEEDS:
        if a.mock_feed:
            items, note = read_feed('file://' + os.path.abspath(a.mock_feed), name, sec, cat, lang, today)
        else:
            items, note = read_feed(url, name, sec, cat, lang, today)
        print('feed %-22s %-3s %s' % (name, sec, note), '<-', url.split('/')[2])
        good += 1 if items else 0
        for it in items:
            if it['date'] in fresh:
                fresh[it['date']].append(it)
    # 2. GDELT index for older days (often refused from cloud servers; one attempt each, stop on first refusal)
    if not a.no_gdelt:
        for i, d in enumerate(want):
            if a.date is None and d == want[0] and not a.mock:
                pass
            try:
                if a.mock:
                    j = json.load(open(a.mock, encoding='utf-8'))
                else:
                    if i:
                        time.sleep(6)
                    j = fetch_gdelt(query_url(d))
                fresh[d] += from_gdelt(j, d)
                print('gdelt', d, 'ok')
            except urllib.error.HTTPError as e:
                print('gdelt', d, 'refused: HTTP', e.code)
                if e.code == 429:
                    break
            except Exception as e:
                print('gdelt', d, 'failed:', str(e)[:80])
    wrote = 0
    for d in want:
        rawp = os.path.join(rawdir, d + '.json')
        merged, seen = [], set()
        for it in load_raw(rawp) + fresh[d]:
            if it['url'] in seen:
                continue
            seen.add(it['url'])
            merged.append({k: it.get(k, '') for k in ('title', 'url', 'name', 'kn', 'sec', 'cat', 'date')})
        if not merged:
            print(d, 'nothing collected')
            continue
        data = build([dict(x) for x in merged], d)
        n = len(data['in']) + len(data['ka']) + len(data['wd'])
        with open(rawp, 'w', encoding='utf-8') as f:
            json.dump(merged[:600], f, ensure_ascii=False, separators=(',', ':'))
        with open(os.path.join(a.out, d + '.json'), 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
        print(d, 'in=%d ka=%d wd=%d (from %d headlines)' % (len(data['in']), len(data['ka']), len(data['wd']), len(merged)))
        wrote += 1
    cut = (today - timedelta(days=90)).isoformat()
    for folder in (a.out, rawdir):                  # keep 90 days
        for f in os.listdir(folder):
            if re.fullmatch(r'\d{4}-\d{2}-\d{2}\.json', f) and f[:10] < cut:
                os.remove(os.path.join(folder, f))
    sys.exit(0 if wrote else 1)


if __name__ == '__main__':
    main()
