#!/usr/bin/env python3
"""Read-only ACAPS archive scraper and review-only snapshot checker.

Default: query the official archive and compare title/date against curated sources.
Never silently add, relink, delete, or publish a report. --apply only updates
checkedOn + publication date of already curated exact-title matches, and only
when enough matches have been observed; output remains an explicitly reviewed snapshot.
"""
from __future__ import annotations
import argparse
from datetime import date, datetime
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import sys
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

ARCHIVE_URL = 'https://www.acaps.org/en/countries/archives'
HERE = Path(__file__).resolve().parents[1]
SNAPSHOT = HERE/'frontend/src/lib/acaps-archive-snapshot.json'
MONTHS = '|'.join('January February March April May June July August September October November December'.split())
DATE_REGEX = re.compile(r'\b([0-3]?\d)\s+('+MONTHS+r')\s+(20\d{2})\b')

def normalize(title: str) -> str:
    # Compare only exact canonical words; punctuation/space variations are tolerated.
    import unicodedata
    text=unicodedata.normalize('NFKD', title.lower())
    text=''.join(c for c in text if not unicodedata.combining(c))
    return re.sub(r'[^a-z0-9]+',' ',text).strip()

class ArchiveHTML(HTMLParser):
    """Read server-rendered headings with an immediately preceding published date.
    We never assume that a page item without a direct known URL is publishable.
    """
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.recent=[]
        self.in_heading=0
        self.heading=[]
        self.headings=[]
    def handle_starttag(self, tag, attrs):
        if tag in ('h2','h3') and not self.in_heading:
            self.in_heading=1
            self.heading=[]
        elif self.in_heading:
            self.in_heading+=1
    def handle_endtag(self, tag):
        if self.in_heading:
            self.in_heading-=1
            if self.in_heading==0:
                title=' '.join(' '.join(self.heading).split())
                prior=' '.join(self.recent[-30:])
                date_hits=list(DATE_REGEX.finditer(prior))
                if ':' in title and date_hits:
                    hit=date_hits[-1]
                    try: stamp=datetime.strptime(hit.group(0),'%d %B %Y').strftime('%Y-%m-%d')
                    except ValueError: return
                    self.headings.append({'title':title,'publishedOn':stamp})
    def handle_data(self, data):
        line=' '.join(data.split())
        if line:
            if self.in_heading:self.heading.append(line)
            else:
                self.recent.append(line)
                if len(self.recent)>80:self.recent=self.recent[-80:]

def extract_archive(html: str) -> list[dict]:
    reader=ArchiveHTML()
    reader.feed(html)
    found=[]
    seen=set()
    for entry in reader.headings:
        key=normalize(entry['title'])
        if key not in seen and entry['publishedOn'] <= date.today().isoformat():
            seen.add(key);found.append(entry)
    return found

def fetch(timeout:int=20) -> str:
    req=Request(ARCHIVE_URL,headers={'User-Agent':'Mozilla/5.0 (compatible; SignalACAPS-Academic-Demo/1.0)','Accept':'text/html','Accept-Language':'en-GB,en;q=0.8'})
    with urlopen(req,timeout=timeout) as res:
        content_type=res.headers.get('Content-Type','')
        if 'text/html' not in content_type: raise ValueError('Unexpected ACAPS content type; no files changed')
        body=res.read(2_000_001)
        if len(body)>2_000_000:raise ValueError('Archive HTML exceeded size limit')
        return body.decode('utf-8',errors='replace')

def review(html: str, snapshot: dict) -> tuple[list[dict],list[dict]]:
    entries=extract_archive(html)
    approved={normalize(item['title']):item for item in snapshot['items']}
    known=[];new=[]
    for entry in entries:
        if normalize(entry['title']) in approved: known.append(entry)
        else:new.append(entry)
    return known,new

def main() -> int:
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--fixture',type=Path,help='Offline HTML fixture for testing; otherwise fetch the official archive')
    parser.add_argument('--project',type=Path,default=Path.home()/'Downloads/SIGNAL_ACAPS_Prototype')
    parser.add_argument('--apply',action='store_true',help='Update reviewed snapshot check-date and matched known publication dates, never add novel items')
    args=parser.parse_args()
    project=args.project.expanduser().resolve()
    target=project/'frontend/src/lib/acaps-archive-snapshot.json'
    try:
        snapshot=json.loads(target.read_text(encoding='utf-8'))
        html=args.fixture.read_text(encoding='utf-8') if args.fixture else fetch()
        known,new=review(html,snapshot)
        print('ACAPS archive:',ARCHIVE_URL)
        print('Parsed headings:',len(extract_archive(html)),'Previously reviewed matches:',len(known),'New/unreviewed candidates:',len(new))
        for entry in known[:15]:print('MATCH ',entry['publishedOn'],'|',entry['title'])
        for entry in new[:10]:print('REVIEW REQUIRED (not auto-published):',entry['publishedOn'],'|',entry['title'])
        if len(known)<3:raise ValueError('Fewer than 3 known publication matches. Archive HTML may have changed: snapshot preserved.')
        if not args.apply:
            print('CHECK ONLY: no files changed. --apply updates checked date for known records; new items require manual URL verification.')
            return 0
        import subprocess
        branch=subprocess.run(['git','branch','--show-current'],cwd=project,capture_output=True,text=True,check=True).stdout.strip()
        status=subprocess.run(['git','status','--porcelain','--untracked-files=no'],cwd=project,capture_output=True,text=True,check=True).stdout.strip()
        if branch in ('main','master') or not branch or status:
            raise ValueError('Refresh requires a clean feature branch, not main; no files changed.')
        match={normalize(e['title']):e for e in known}
        for item in snapshot['items']:
            record=match.get(normalize(item['title']))
            if record:item['publishedOn']=record['publishedOn']
        snapshot['checkedOn']=date.today().isoformat()
        # Atomic replacement; any new publications remain unapproved review candidates.
        temp=target.with_suffix('.json.tmp')
        temp.write_text(json.dumps(snapshot,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        temp.replace(target)
        print('APPLIED: metadata check-date refreshed for pre-approved records only. Review diff, tests, and ACAPS link reachability before merging.')
        return 0
    except (OSError,ValueError,HTTPError,URLError,KeyError,json.JSONDecodeError) as exc:
        print('SAFE STOP:',exc,file=sys.stderr)
        return 2
if __name__=='__main__':raise SystemExit(main())
