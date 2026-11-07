#!/usr/bin/env python3
"""Discover ACAPS-attributed ReliefWeb report *candidates* for manual review.

Read-only with respect to SIGNAL ACAPS. Does not mutate the curated TS index, database,
API, published reports, or any approval workflow. Network access only with --live.
Uses system curl so macOS Python virtualenv CA issues do not require unsafe SSL bypasses.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone, date
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
from urllib.parse import urlencode, urlparse

API = 'https://api.reliefweb.int/v2/reports'
COUNTRIES = {'ukraine': 'UKR', 'sudan': 'SDN', 'chad': 'TCD', 'burkina': 'BFA', 'cameroon': 'CMR'}
MAX_RESPONSE = 4_000_000
APPNAME = re.compile(r'^[a-zA-Z0-9][a-zA-Z0-9._-]{2,79}$')


def request_body(iso: str, limit: int) -> dict:
    if iso not in COUNTRIES.values() or not 1 <= limit <= 50:
        raise ValueError('Unknown country or invalid limit')
    return {
        'preset': 'latest', 'profile': 'list', 'limit': limit,
        'sort': ['date.created:desc'],
        'fields': {'include': ['id', 'title', 'url', 'url_alias', 'origin',
                               'date.created', 'date.original', 'source.name',
                               'country.iso3', 'status']},
        'filter': {'operator': 'AND', 'conditions': [
            {'field': 'country.iso3', 'value': iso},
            {'field': 'source.name', 'value': 'ACAPS'},
            {'field': 'status', 'value': 'published'},
        ]},
    }


def valid_link(url: object, domains: set[str]) -> bool:
    if not isinstance(url, str) or len(url) > 2048:
        return False
    try:
        parsed = urlparse(url)
        return (parsed.scheme == 'https' and parsed.hostname in domains
                and parsed.port in (None, 443) and parsed.username is None
                and parsed.password is None and bool(parsed.path and parsed.path != '/'))
    except ValueError:
        return False


def _names(value: object) -> list[str]:
    if isinstance(value, str):
        return [value]
    if isinstance(value, dict):
        return [value.get('name', '')] if isinstance(value.get('name'), str) else []
    if isinstance(value, list):
        return [name for item in value for name in _names(item)]
    return []


def _iso_matches(value: object, iso: str) -> bool:
    if isinstance(value, dict):
        return value.get('iso3') == iso
    if isinstance(value, list):
        return any(_iso_matches(item, iso) for item in value)
    return False


def _date(value: object) -> str | None:
    if not isinstance(value, str) or len(value) < 10:
        return None
    text = value[:10]
    try:
        return text if date.fromisoformat(text).isoformat() == text else None
    except ValueError:
        return None


def clean_response(response: object, country: str, today: date) -> dict:
    """Validate untrusted external response; never infer missing provenance."""
    if country not in COUNTRIES or not isinstance(response, dict) or not isinstance(response.get('data'), list):
        raise ValueError('ReliefWeb response missing expected data array')
    out = []
    rejected = 0
    for entry in response['data']:
        if not isinstance(entry, dict) or not isinstance(entry.get('fields'), dict):
            rejected += 1
            continue
        f = entry['fields']
        report_id = entry.get('id', f.get('id'))
        if not isinstance(report_id, (int, str)) or not str(report_id).isdigit():
            rejected += 1
            continue
        title = f.get('title')
        if not isinstance(title, str) or not 5 <= len(title.strip()) <= 400:
            rejected += 1
            continue
        if f.get('status') != 'published':
            rejected += 1
            continue
        if 'ACAPS' not in [name.strip().upper() for name in _names(f.get('source'))]:
            rejected += 1
            continue
        if not _iso_matches(f.get('country'), COUNTRIES[country]):
            rejected += 1
            continue
        link = f.get('url_alias') or f.get('url')
        if not valid_link(link, {'reliefweb.int', 'www.reliefweb.int'}):
            rejected += 1
            continue
        original = f.get('origin')
        if not valid_link(original, {'acaps.org', 'www.acaps.org'}):
            original = None
        timestamps = f.get('date') if isinstance(f.get('date'), dict) else {}
        published = _date(timestamps.get('original'))
        indexed = _date(timestamps.get('created'))
        if not indexed or indexed > today.isoformat() or (published and published > today.isoformat()):
            rejected += 1
            continue
        out.append({
            'country_id': country,
            'reliefweb_id': str(report_id),
            'title': title.strip(),
            'source': 'ACAPS (as tagged by ReliefWeb)',
            'reliefweb_url': link,
            'original_acaps_url': original,
            'source_published_on': published,
            'reliefweb_created_on': indexed,
            'publication_date_label': 'source_date' if published else 'source_date_unavailable',
            'review_status': 'REQUIRES_HUMAN_SOURCE_VERIFICATION',
            'review_reason': 'ReliefWeb indexing does not independently confirm ACAPS publication metadata or latest-report status.',
        })
    out.sort(key=lambda row: (row['source_published_on'] or row['reliefweb_created_on'], row['reliefweb_id']), reverse=True)
    unique = {r['reliefweb_id']: r for r in out}
    return {'country_id': country, 'iso3': COUNTRIES[country], 'candidates': list(unique.values()),
            'rejected_count': rejected, 'returned_count': len(response['data']),
            'reliefweb_total_count': response.get('totalCount') if isinstance(response.get('totalCount'), int) else None}


def call_api(curl: str, appname: str, body: dict, timeout: int) -> dict:
    if not APPNAME.fullmatch(appname):
        raise ValueError('Set a valid RELIEFWEB_APPNAME (3–80 letters/digits/dot/underscore/hyphen)')
    if timeout < 1 or timeout > 60:
        raise ValueError('timeout must be 1..60 seconds')
    if not (shutil.which(curl) or Path(curl).is_file()):
        raise ValueError('curl unavailable')
    url = API + '?' + urlencode({'appname': appname})
    cmd = [curl, '--fail', '--silent', '--show-error', '--location', '--max-redirs', '0',
           '--proto', '=https', '--proto-redir', '=https', '--max-time', str(timeout),
           '--header', 'Content-Type: application/json', '--request', 'POST',
           '--data-binary', '@-', url]
    try:
        process = subprocess.run(cmd, input=json.dumps(body), text=True,
                                 capture_output=True, timeout=timeout+5)
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise ValueError(f'ReliefWeb request failed: {exc}') from exc
    if process.returncode != 0:
        raise ValueError(f'ReliefWeb request failed (curl {process.returncode}): {process.stderr.strip()[:180]}')
    if len(process.stdout.encode('utf-8')) > MAX_RESPONSE:
        raise ValueError('ReliefWeb response exceeds maximum size')
    try:
        result = json.loads(process.stdout)
    except json.JSONDecodeError as exc:
        raise ValueError('ReliefWeb returned invalid JSON') from exc
    if not isinstance(result, dict) or not isinstance(result.get('data'), list):
        raise ValueError('ReliefWeb returned an unexpected JSON structure')
    return result


def discover(countries: list[str], responses: dict[str, object], limit: int, now: datetime) -> dict:
    if len(set(countries)) != len(countries) or not countries or any(c not in COUNTRIES for c in countries):
        raise ValueError('Invalid or duplicate country selection')
    if set(responses) != set(countries):
        raise ValueError('Missing country responses; abort instead of publishing partial discovery')
    results = [clean_response(responses[c], c, now.date()) for c in countries]
    return {
        'schema': 'sr-phase15h-candidate-review/v1',
        'generated_at_utc': now.astimezone(timezone.utc).isoformat(),
        'source': 'ReliefWeb API v2; ACAPS-attributed report listings; not the ACAPS publication API',
        'api_documentation': 'https://apidoc.reliefweb.int/read/resources/reports/',
        'purpose': 'LOCAL REVIEW QUEUE ONLY - NOT APPROVED FOR PUBLIC DISPLAY',
        'can_auto_publish': False,
        'countries': results,
        'totals': {'candidates': sum(len(x['candidates']) for x in results),
                   'rejected': sum(x['rejected_count'] for x in results)},
        'warnings': [
            'ReliefWeb search results are not a complete or guaranteed-latest ACAPS publication feed.',
            'Inspect each original source, publication date, country, title and URL before manual promotion.',
            'Do not mix candidate metadata with synthetic forecast indicators, experts or publishable aggregates.',
        ],
    }


def save_if_new(path: Path, result: dict) -> None:
    # Explicit output only, refuse overwriting older reviews; atomic write.
    target = path.expanduser().resolve()
    if target.exists():
        raise ValueError(f'Output already exists; choose a new output filename: {target}')
    if not target.parent.exists():
        raise ValueError(f'Output parent does not exist: {target.parent}')
    data = (json.dumps(result, indent=2, ensure_ascii=False) + '\n').encode('utf-8')
    fd, temporary = tempfile.mkstemp(prefix='.sr-phase15h-', dir=target.parent)
    try:
        with os.fdopen(fd, 'wb') as f:
            os.fchmod(f.fileno(), 0o600)
            f.write(data)
        if target.exists():
            raise ValueError('Output appeared before write; aborting')
        os.link(temporary, target)  # atomic create-if-absent, never overwrite
    finally:
        os.unlink(temporary)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--countries', nargs='+', choices=sorted(COUNTRIES), default=['ukraine', 'sudan', 'chad', 'burkina', 'cameroon'])
    parser.add_argument('--limit', type=int, default=10, help='Max ReliefWeb results per country (1-50)')
    parser.add_argument('--live', action='store_true', help='Fetch from ReliefWeb over verified HTTPS; otherwise fixture required')
    parser.add_argument('--fixture', type=Path, help='Offline JSON mapping country IDs to ReliefWeb API responses (tests/demo)')
    parser.add_argument('--appname', default=os.getenv('RELIEFWEB_APPNAME', ''), help='ReliefWeb-required appname for --live')
    parser.add_argument('--curl', default='/usr/bin/curl', help='Trusted curl binary')
    parser.add_argument('--timeout', type=int, default=15)
    parser.add_argument('--output', type=Path, help='Optional NEW file for quarantined candidates (never changes project)')
    args = parser.parse_args(argv)
    try:
        if args.live == bool(args.fixture):
            raise ValueError('Choose exactly one of --live or --fixture')
        if not 1 <= args.limit <= 50:
            raise ValueError('limit must be between 1 and 50')
        countries = args.countries
        if len(countries) != len(set(countries)):
            raise ValueError('Duplicate country')
        if args.live:
            if not APPNAME.fullmatch(args.appname):
                raise ValueError('Specify --appname or RELIEFWEB_APPNAME before using --live')
            responses = {c: call_api(args.curl, args.appname, request_body(COUNTRIES[c], args.limit), args.timeout) for c in countries}
        else:
            raw = args.fixture.read_bytes()
            if len(raw) > MAX_RESPONSE:
                raise ValueError('Fixture exceeds maximum size')
            responses = json.loads(raw)
        result = discover(countries, responses, args.limit, datetime.now(timezone.utc))
        for item in result['countries']:
            print(f"{item['country_id']:12} {len(item['candidates']):2} candidates; {item['rejected_count']:2} rejected; index matches={item['reliefweb_total_count']}")
        print('REVIEW REQUIRED:', result['totals']['candidates'], 'candidates; zero auto-published')
        if args.output:
            save_if_new(args.output, result)
            print('WROTE LOCAL REVIEW QUEUE:', args.output)
        else:
            print('NO FILE WRITTEN. Use --output to save candidates for manual review.')
        return 0
    except (OSError, ValueError, TypeError, json.JSONDecodeError) as exc:
        print('SAFE STOP:', exc, file=sys.stderr)
        return 2


if __name__ == '__main__':
    raise SystemExit(main())
