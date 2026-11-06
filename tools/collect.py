#!/usr/bin/env python3
"""Collects one day's headlines from Indian and Karnataka news sites through the GDELT Project index,
groups the same story reported by several outlets, sorts it into sections and categories, and writes
data/live/YYYY-MM-DD.json. Only headline, outlet name and link are kept. Standard library only.

Usage: collect.py [--days N] [--date YYYY-MM-DD] [--mock file.json] [--out data/live]
"""
import argparse, html, json, os, re, sys, time, urllib.parse, urllib.request
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


def fetch(url, tries=4):
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'daily-news-briefing/1.0 (+https://github.com/jnanendray/daily_news)'})
            with urllib.request.urlopen(req, timeout=60) as r:
                raw = r.read(6_000_000).decode('utf-8', 'replace')
            return json.loads(raw)
        except Exception as e:                      # rate limit text, timeouts, bad JSON
            last = e
            time.sleep(8 * (i + 1))
    raise RuntimeError('GDELT request failed: %s' % last)


def build(j, date):
    arts = j.get('articles') if isinstance(j, dict) else None
    items = []
    for a in arts or []:
        if not isinstance(a, dict):
            continue
        url, title = a.get('url'), a.get('title')
        if not isinstance(url, str) or not isinstance(title, str):
            continue
        if url.lower().startswith('http://'):
            url = 'https://' + url[7:]
        if not url.startswith('https://') or len(url) > 480:
            continue
        name = outlet(a.get('domain'))
        lang = str(a.get('language') or '').lower()
        if not name or lang not in ('english', 'kannada'):
            continue
        title = re.sub(r'\s+', ' ', html.unescape(title)).strip()[:200]
        if len(title) < 24:
            continue
        items.append({'title': title, 'url': url, 'name': name, 'kn': lang == 'kannada' or is_kn(title), 'tk': toks(title)})
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
        sec = 'in'
        if r['kn']:
            sec = 'ka'
        elif r['name'] in ('Deccan Herald', 'Bangalore Mirror') and KA_RE.search(r['title']):
            sec = 'ka'
        elif WORLD_RE.search(r['title']):
            sec = 'wd'
        cats = []
        for k, rx in CAT_RE:
            if len(cats) < 3 and rx.search(r['title']):
                cats.append(k)
        if sec == 'wd':
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
    out['src'] = 'GDELT Project'
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--days', type=int, default=3)
    ap.add_argument('--date')
    ap.add_argument('--mock')
    ap.add_argument('--out', default='data/live')
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    today = datetime.now(IST).date()
    dates = [a.date] if a.date else [(today - timedelta(days=i)).isoformat() for i in range(max(1, min(a.days, 30)))]
    ok = 0
    for i, d in enumerate(dates):
        try:
            if a.mock:
                j = json.load(open(a.mock, encoding='utf-8'))
            else:
                if i:
                    time.sleep(6)                   # GDELT asks for one request every 5 seconds
                j = fetch(query_url(d))
            data = build(j, d)
            n = len(data['in']) + len(data['ka']) + len(data['wd'])
            if n == 0 and os.path.exists(os.path.join(a.out, d + '.json')):
                print(d, 'no results, keeping the existing file')
                continue
            with open(os.path.join(a.out, d + '.json'), 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
            print(d, 'in=%d ka=%d wd=%d' % (len(data['in']), len(data['ka']), len(data['wd'])))
            ok += 1
        except Exception as e:
            print(d, 'FAILED:', e, file=sys.stderr)
    cut = (today - timedelta(days=90)).isoformat()
    for f in os.listdir(a.out):                     # keep 90 days
        if re.fullmatch(r'\d{4}-\d{2}-\d{2}\.json', f) and f[:10] < cut:
            os.remove(os.path.join(a.out, f))
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
