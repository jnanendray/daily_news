import urllib.request,sys,re,time
UA='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36'
T=[('Hindu archive','https://www.thehindu.com/archive/web/2026/11/03/'),
('Hindu archive print','https://www.thehindu.com/archive/print/2026/11/03/'),
('TOI archive','https://timesofindia.indiatimes.com/2026/11/3/archivelist/year-2026,month-11,starttime-46329.cms'),
('DH archive','https://www.deccanherald.com/archive?date=2026-11-03'),
('DH sitemap','https://www.deccanherald.com/sitemap.xml'),
('HT sitemap news','https://www.hindustantimes.com/sitemap/sitemaps.xml'),
('NDTV sitemap','https://www.ndtv.com/sitemap/sitemap-index.xml'),
('Prajavani sitemap','https://www.prajavani.net/sitemap.xml'),
('IE sitemap','https://indianexpress.com/sitemap.xml'),
('Wayback availability','https://archive.org/wayback/available?url=thehindu.com/news/national/&timestamp=20261103'),
('Wayback CDX','https://web.archive.org/cdx/search/cdx?url=thehindu.com/news/national/feeder/default.rss&from=20261101&to=20261105&output=txt&limit=5'),
('GNews RSS','https://news.google.com/rss/search?q=karnataka+after:2026-11-02+before:2026-11-03&hl=en-IN&gl=IN&ceid=IN:en'),
('Bing news RSS','https://www.bing.com/news/search?q=karnataka&format=rss'),
]
for n,u in T:
    t=time.time()
    try:
        r=urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':UA}),timeout=20);b=r.read(400000)
        links=len(re.findall(rb'<a [^>]*href=',b));locs=len(re.findall(rb'<loc>',b));items=len(re.findall(rb'<item>',b))
        print('%-22s %s %6d bytes links=%d loc=%d items=%d %.1fs'%(n,r.status,len(b),links,locs,items,time.time()-t))
    except Exception as e:
        print('%-22s FAIL %s %.1fs'%(n,str(e)[:60],time.time()-t))
