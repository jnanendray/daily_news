import urllib.request,re
UA='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36'
def g(u):
    return urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':UA}),timeout=20).read(2000000).decode('utf-8','replace')
b=g('https://timesofindia.indiatimes.com/2026/11/3/archivelist/year-2026,month-11,starttime-46329.cms')
l=re.findall(r'<a href="(https://timesofindia[^"]*articleshow[^"]*)"[^>]*>([^<]{15,})</a>',b)
print('TOI articles',len(l));[print(' ',x[1][:80],x[0][-60:]) for x in l[:5]]
for u in ('https://www.deccanherald.com/sitemap.xml','https://www.prajavani.net/sitemap.xml'):
    s=g(u);print(u);[print(' ',x) for x in re.findall(r'<loc>([^<]+)</loc>',s)[:12]]
x=g('https://news.google.com/rss/search?q=karnataka+after:2026-11-02+before:2026-11-03&hl=en-IN&gl=IN&ceid=IN:en')
for it in re.findall(r'<item>(.*?)</item>',x,re.S)[:4]:
    print(re.sub(r'\s+',' ',it)[:420])
