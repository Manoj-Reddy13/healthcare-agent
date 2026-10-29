from app.healthcare_paths import BACKEND_ROOT, DATA_ROOT, SCHEMA_PATH
"""Live retrieval of public official-provider listings. Never uses demo fallback."""
import hashlib,json,re,sqlite3
from contextlib import closing
from datetime import datetime,timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit
import httpx

PRODUCTS={
    'mri-knee-single-hyderabad':{'url':'https://www.apollo247.com/radiology-details/mri-knee-joint-single-c-hyderabad','expected_heading':'MRI KNEE JOINT SINGLE','city':'Hyderabad','body_region':'knee','laterality':'single','contrast':None},
    'mri-brain-plain-bengaluru':{'url':'https://www.apollo247.com/radiology-details/mri-brain-plain-c-bengaluru','expected_heading':'MRI BRAIN - PLAIN','city':'Bengaluru','body_region':'brain','laterality':None,'contrast':None}}
PARSER_VERSION='apollo-clinic-card-1'

class LiveSourceError(Exception):pass

class ClinicParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True);self.cards=[];self.depth=0;self.capture=None;self.current=None;self.h1=[];self.in_h1=False;self.title_depth=0;self.title_parts=[]
    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs)
        if tag=='h1':self.in_h1=True
        if tag=='div':
            if self.title_depth:self.title_depth+=1
            elif 'Radiology' in attrs.get('class','') and 'ItemCard_title__' in attrs.get('class',''):self.title_depth=1
            if self.depth:self.depth+=1
            elif 'singleClinicCard' in attrs.get('class',''):
                self.depth=1;self.current={'provider':[],'address':[],'text':[]}
        if self.depth and tag in ('h3','p'):self.capture='provider' if tag=='h3' else 'address'
    def handle_data(self,data):
        if self.in_h1:self.h1.append(data)
        if self.title_depth:self.title_parts.append(data)
        if self.depth:
            self.current['text'].append(data)
            if self.capture:self.current[self.capture].append(data)
    def handle_endtag(self,tag):
        if tag=='h1':self.in_h1=False
        if tag=='div' and self.title_depth:self.title_depth-=1
        if tag in ('h3','p'):self.capture=None
        if tag=='div' and self.depth:
            self.depth-=1
            if not self.depth:self.cards.append(self.current);self.current=None

def parse_clinics(html,product):
    parser=ClinicParser();parser.feed(html)
    clean=lambda value:' '.join(value.split())
    headings=[clean(' '.join(parser.h1)).casefold(),clean(' '.join(parser.title_parts)).casefold()]
    if product['expected_heading'].casefold() not in headings:
        raise LiveSourceError('Provider product heading changed or is unavailable')
    rows=[];seen={}
    for card in parser.cards:
        name=clean(' '.join(card['provider']));address=clean(' '.join(card['address']))
        values=re.findall(r'₹\s*([\d,]+(?:\.\d{1,2})?)',' '.join(card['text']))
        if not name or not address or len(values)!=1:raise LiveSourceError('Provider card schema changed; price not promoted')
        value=values[0].replace(',','')
        from decimal import Decimal
        price=Decimal(value)
        if price<=0:raise LiveSourceError('Provider returned an invalid price')
        price=format(price,'.2f');key=(name,address)
        if key in seen:
            if seen[key]!=price:raise LiveSourceError('Provider listing has conflicting duplicate prices')
            continue
        seen[key]=price
        rows.append({'provider_id':'apollo-clinic-'+hashlib.sha256((name+'|'+address).encode()).hexdigest()[:16],
                     'provider_name':name,'provider_type':'clinic','listed_address':address,'service_city':product['city'],
                     'source_product_label':product['expected_heading'],'body_region':product['body_region'],
                     'laterality':product['laterality'],'contrast':product['contrast'],'published_amount_inr':price,'currency':'INR',
                     'hospital_mapping':None,'package_inclusions':None,'valid_from':None,'valid_to':None,
                     'clinical_quote_verified':False,'insurance_coverage_confirmed':False})
    if not rows:raise LiveSourceError('No structured provider price cards found')
    return rows

class LiveListingClient:
    def __init__(self,transport=None):self.transport=transport
    def fetch(self,product_id):
        if product_id not in PRODUCTS:raise ValueError('Unsupported live product')
        product=PRODUCTS[product_id];url=product['url'];parts=urlsplit(url)
        if parts.scheme!='https' or parts.hostname!='www.apollo247.com':raise LiveSourceError('Source host is not allowed')
        try:
            with httpx.Client(transport=self.transport,timeout=httpx.Timeout(15.0,connect=5.0),follow_redirects=False,
                              headers={'User-Agent':'HealthcareNavigationProject/1.0 (public price research)'}) as client:
                with client.stream('GET',url) as response:
                    if response.status_code!=200:raise LiveSourceError(f'Official provider returned HTTP {response.status_code}; no fallback used')
                    if 'text/html' not in response.headers.get('content-type','').lower():raise LiveSourceError('Unexpected provider content type')
                    chunks=[];size=0
                    for chunk in response.iter_bytes():
                        size+=len(chunk)
                        if size>2000000:raise LiveSourceError('Provider document exceeds supported size')
                        chunks.append(chunk)
                    raw=b''.join(chunks)
                    html=raw.decode('utf-8')
                    observations=parse_clinics(html,product)
                    return {'product_id':product_id,'status':'live_published_listing','data_mode':'live_public_source',
                            'retrieved_at':datetime.now(timezone.utc).isoformat(),'source_url':url,
                            'source_sha256':hashlib.sha256(raw).hexdigest(),'parser_version':PARSER_VERSION,
                            'provider_last_modified':response.headers.get('last-modified'),'observations':observations,
                            'notice':'Fetched from the official provider now. Published amounts are not guaranteed patient quotes; package details and actual eligibility remain unverified. No sample or cached fallback was used.'}
        except (httpx.HTTPError,UnicodeDecodeError) as exc:
            raise LiveSourceError('Official provider could not be retrieved; no fallback used') from exc

class LiveAuditStore:
    def __init__(self,path):self.path=Path(path).resolve()
    def save(self,result):
        self.path.parent.mkdir(parents=True,exist_ok=True)
        with closing(sqlite3.connect(self.path)) as con:
            con.execute('''CREATE TABLE IF NOT EXISTS live_fetches(id INTEGER PRIMARY KEY,product_id TEXT NOT NULL,retrieved_at TEXT NOT NULL,source_url TEXT NOT NULL,source_sha256 TEXT NOT NULL,payload TEXT NOT NULL)''')
            with con:con.execute('INSERT INTO live_fetches(product_id,retrieved_at,source_url,source_sha256,payload) VALUES (?,?,?,?,?)',
                                 (result['product_id'],result['retrieved_at'],result['source_url'],result['source_sha256'],json.dumps(result)))

if __name__=='__main__':
    import argparse
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('product_id',choices=PRODUCTS)
    args=parser.parse_args();result=LiveListingClient().fetch(args.product_id)
    print(json.dumps(result,indent=2,ensure_ascii=True))
