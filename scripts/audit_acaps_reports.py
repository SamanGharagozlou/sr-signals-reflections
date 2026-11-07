#!/usr/bin/env python3
"""Audit Phase 15F's curated ACAPS links; never mutate source metadata.

Offline by default. Optional --live uses verified HTTPS with the system curl.
HTTP reachability is NOT evidence that an entry is the latest ACAPS report.
"""
from __future__ import annotations

import argparse
from datetime import date, datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys
from urllib.parse import urlparse

DEFAULT_INDEX = Path('frontend/src/lib/verified-report-index.ts')
RECORD_RE = re.compile(r'^  (?P<key>[a-z][\w-]*):\s*\{(?P<body>.*?)^  \},', re.M | re.S)
FIELD_RE = r'\b{field}:\s*"((?:\\.|[^"\\])*)"'
REQUIRED_FIELDS = ('crisisId', 'title', 'publishedOn', 'verifiedOn', 'sourceName', 'sourceUrl', 'subject')
VALID_HOSTS = {'acaps.org', 'www.acaps.org'}


def extract_reports(text: str) -> list[dict]:
    if 'export const VERIFIED_REPORTS:' not in text:
        raise ValueError('Not a recognizable Phase 15F report index')
    records = []
    for match in RECORD_RE.finditer(text):
        body = match.group('body')
        record = {'key': match.group('key')}
        for field in REQUIRED_FIELDS:
            value = re.search(FIELD_RE.format(field=re.escape(field)), body)
            if value is None:
                raise ValueError(f'Missing {field} for {record["key"]}; manifest format may have changed')
            record[field] = json.loads('"' + value.group(1) + '"')
        records.append(record)
    if not records:
        raise ValueError('No report records parsed; do not assume empty means all verified')
    if len({r['key'] for r in records}) != len(records):
        raise ValueError('Duplicate report index keys')
    return records


def parse_date(value: str) -> date:
    if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', value):
        raise ValueError('Expected ISO YYYY-MM-DD')
    parsed = date.fromisoformat(value)
    if parsed.isoformat() != value:
        raise ValueError('Non-canonical date')
    return parsed


def validate_record(record: dict, today: date, max_age: int) -> dict:
    errors = []
    try:
        published = parse_date(record['publishedOn'])
        verified = parse_date(record['verifiedOn'])
        if published > verified:
            errors.append('publication is later than recorded verification')
        if verified > today:
            errors.append('verification date is in the future')
    except (ValueError, TypeError) as exc:
        errors.append(f'invalid date: {exc}')
        published = verified = None

    if record['crisisId'] != record['key']:
        errors.append('crisisId does not match index key')
    if record['sourceName'] != 'ACAPS':
        errors.append('sourceName must be ACAPS')
    if not record['title'].strip() or not record['subject'].strip():
        errors.append('title and subject required')

    parsed_url = urlparse(record['sourceUrl'])
    if (parsed_url.scheme != 'https' or parsed_url.hostname not in VALID_HOSTS
            or not parsed_url.path.startswith('/en/') or parsed_url.username is not None
            or parsed_url.password is not None):
        errors.append('URL must be a public HTTPS ACAPS /en/ page')
    days_since_review = (today - verified).days if verified and verified <= today else None
    return {
        'record': record,
        'metadata_status': 'invalid' if errors else ('review_due' if days_since_review is not None and days_since_review > max_age else 'current_review'),
        'days_since_review': days_since_review,
        'country_page_only': re.fullmatch(r'/en/countries/[^/]+/?', parsed_url.path) is not None,
        'errors': errors,
        'live': {'status': 'not_checked', 'http_code': None, 'final_url': None},
    }


def live_check(url: str, curl: str, timeout: int) -> dict:
    """Only verifies a public URL is reachable. Never re-labels report as latest."""
    cmd = [curl, '--location', '--silent', '--show-error', '--max-time', str(timeout),
           '--max-redirs', '3', '--proto', '=https', '--proto-redir', '=https',
           '--output', '/dev/null', '--write-out', '%{http_code}\n%{url_effective}', url]
    try:
        run = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout+5)
    except (OSError, subprocess.TimeoutExpired) as exc:
        return {'status': 'network_error', 'http_code': None, 'final_url': None, 'detail': str(exc)[:240]}
    lines = run.stdout.splitlines()
    code = int(lines[0]) if lines and lines[0].isdigit() else None
    final = lines[1] if len(lines) > 1 else None
    parsed = urlparse(final or '')
    if final and (parsed.scheme != 'https' or parsed.hostname not in VALID_HOSTS):
        return {'status': 'redirect_outside_allowlist', 'http_code': code, 'final_url': final}
    if run.returncode != 0:
        return {'status': 'network_error', 'http_code': code, 'final_url': final, 'detail': run.stderr.strip()[:240]}
    if code is None or code < 200 or code >= 400:
        return {'status': 'http_error', 'http_code': code, 'final_url': final}
    return {'status': 'reachable', 'http_code': code, 'final_url': final}


def make_report(source: Path, today: date, max_age: int, live: bool, curl: str, timeout: int) -> dict:
    data = source.read_bytes()
    rows = [validate_record(r, today, max_age) for r in extract_reports(data.decode('utf-8'))]
    if live:
        if not shutil.which(curl) and not Path(curl).exists():
            raise ValueError(f'curl not found: {curl}')
        for row in rows:
            if row['metadata_status'] != 'invalid':
                row['live'] = live_check(row['record']['sourceUrl'], curl, timeout)
    return {
        'audit_date_utc': today.isoformat(),
        'manifest_path': str(source),
        'manifest_sha256': hashlib.sha256(data).hexdigest(),
        'live_checked': live,
        'note': 'URL reachability and reviewed metadata do NOT establish latest-report status, content accuracy or ACAPS endorsement.',
        'totals': {
            'entries': len(rows),
            'invalid': sum(r['metadata_status']=='invalid' for r in rows),
            'review_due': sum(r['metadata_status']=='review_due' for r in rows),
            'live_failures': sum(r['live']['status'] not in ('reachable', 'not_checked') for r in rows),
        },
        'reports': rows,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--index', type=Path, default=DEFAULT_INDEX)
    parser.add_argument('--live', action='store_true', help='Optional HTTPS reachability checks with curl')
    parser.add_argument('--curl', default='curl', help='curl binary; defaults to PATH')
    parser.add_argument('--timeout', type=int, default=15)
    parser.add_argument('--review-after-days', type=int, default=30)
    parser.add_argument('--output', type=Path, help='Optional path for local JSON audit; never writes without this')
    parser.add_argument('--strict', action='store_true', help='Exit nonzero on invalid metadata, review due or live failures')
    args = parser.parse_args(argv)
    if args.timeout < 1 or args.review_after_days < 1:
        parser.error('timeout and review-after-days must be positive')
    try:
        report = make_report(args.index, datetime.now(timezone.utc).date(), args.review_after_days, args.live, args.curl, args.timeout)
        for row in report['reports']:
            r = row['record']
            print(f"{row['metadata_status'].upper():14} | {r['crisisId']:12} | verified {r['verifiedOn']} | live {row['live']['status']}")
            if row['country_page_only']:
                print('  NOTE: country landing page, not a report-specific permalink')
            for err in row['errors']:
                print('  ERROR:', err)
        print('TOTALS:', json.dumps(report['totals'], sort_keys=True))
        if args.output:
            args.output.parent.mkdir(parents=True, exist_ok=True)
            args.output.write_text(json.dumps(report, indent=2, ensure_ascii=False)+'\n', encoding='utf-8')
            print('WROTE:', args.output)
        failed = report['totals']['invalid'] > 0 or report['totals']['review_due'] > 0 or (args.live and report['totals']['live_failures'] > 0)
        return 1 if args.strict and failed else 0
    except (OSError, UnicodeError, ValueError, json.JSONDecodeError) as exc:
        print('AUDIT ERROR:', exc, file=sys.stderr)
        return 2


if __name__ == '__main__':
    raise SystemExit(main())
