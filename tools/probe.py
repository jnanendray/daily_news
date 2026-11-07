import urllib.request,re
UA='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36'
def g(u):
    try: return urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':UA}),timeout=25).read(3000000).decode('utf-8','replace')
    except Exception as e: return 'FAIL '+str(e)[:60]
for u in ('https://www.deccanherald.com/sitemap/sitemap-daily-2026-11-03.xml','https://www.prajavani.net/sitemap/sitemap-daily-2026-11-03.xml',
 'https://vijaykarnataka.com/sitemap/sitemap-daily-2026-11-03.xml','https://www.kannadaprabha.com/sitemap/sitemap-daily-2026-11-03.xml',
 'https://tv9kannada.com/sitemap.xml','https://publictv.in/sitemap.xml','https://kannada.news18.com/sitemap.xml','https://www.thehindu.com/sitemap.xml','https://www.thehindu.com/sitemap/googlenews/all/all.xml','https://www.hindustantimes.com/sitemap/news.xml','https://www.ndtv.com/sitemap/google-news-sitemap','https://www.indiatoday.in/sitemap.xml','https://www.livemint.com/sitemap/2026-11-03.xml','https://www.business-standard.com/sitemap/2026-11-03.xml'):
    s=g(u);print('==',u,len(s),'urls=%d titles=%d'%(len(re.findall('<url>',s)),len(re.findall('news:title',s))));print(re.sub(r'\s+',' ',s)[:380])
