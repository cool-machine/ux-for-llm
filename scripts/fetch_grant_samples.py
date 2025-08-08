#!/usr/bin/env python3
"""
Fetch and curate public grant proposal samples from NEH, Wellcome, and ERC.

- Scrapes start pages for PDF links (NEH FOIA, ERC aggregator)
- Includes direct aggregated PDFs for Wellcome Open Research Fund (2018/2019)
- Downloads up to --max-per-source PDFs per source to an output folder
- Writes a manifest.json per source with metadata

Usage:
  python3 scripts/fetch_grant_samples.py --out public/datasets/raw --max-per-source 15

Notes:
- This script targets public sample proposals and narratives published by the
  respective organizations for transparency/education. Still review/restrict reuse as needed.
- Heavy PDFs should not be committed to Git. Prefer keeping datasets untracked.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, List, Optional, Set, Tuple
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup
from tqdm import tqdm

SESSION = requests.Session()
SESSION.headers.update({
    "User-Agent": "GrantSampler/1.0 (+https://example.org)"
})

PDF_RE = re.compile(r"\.pdf($|\?)", re.IGNORECASE)


@dataclass
class Source:
    name: str
    start_urls: List[str]
    allowed_domains: Optional[List[str]] = None  # None = allow any


SOURCES: List[Source] = [
    Source(
        name="neh",
        start_urls=[
            "https://www.neh.gov/about/foia/freedom-information-act-sample-grant-application-narratives",
        ],
        allowed_domains=["neh.gov"],
    ),
    Source(
        name="wellcome",
        start_urls=[
            # Index page that links to materials
            "https://wellcome.org/research-funding/open-research-fund-project-proposals-submitted-wellcome",
            # Known aggregated PDFs containing many full applications / summaries
            "https://cms.wellcome.org/sites/default/files/open-research-fund-proposals-received-and-decision-summaries-2018.pdf",
            "https://cms.wellcome.org/sites/default/files/open-research-fund-full-application-proposals-received-2019.pdf",
        ],
        allowed_domains=["wellcome.org", "cms.wellcome.org"],
    ),
    Source(
        name="erc",
        start_urls=[
            "https://www.ffg.at/europa/heu/erc/published-proposals",
        ],
        # Aggregator links out to various hosts; permit all
        allowed_domains=None,
    ),
]


def is_pdf_url(url: str) -> bool:
    if PDF_RE.search(url):
        return True
    # Fallback: try HEAD to check content-type
    try:
        r = SESSION.head(url, allow_redirects=True, timeout=15)
        ct = r.headers.get("Content-Type", "").lower()
        return "application/pdf" in ct
    except Exception:
        return False


def extract_pdf_links_from_page(url: str, allowed_domains: Optional[List[str]]) -> List[Tuple[str, str]]:
    """Return list of (absolute_pdf_url, anchor_text) found on the page."""
    try:
        resp = SESSION.get(url, timeout=30)
        resp.raise_for_status()
    except Exception as e:
        print(f"[warn] Failed to fetch {url}: {e}")
        return []

    soup = BeautifulSoup(resp.text, "html.parser")
    links: List[Tuple[str, str]] = []
    for a in soup.find_all("a", href=True):
        href = a.get("href")
        abs_url = urljoin(url, href)
        if allowed_domains:
            netloc = urlparse(abs_url).netloc
            if not any(netloc.endswith(d) for d in allowed_domains):
                continue
        text = (a.get_text(strip=True) or "").strip()
        if PDF_RE.search(abs_url):
            links.append((abs_url, text))
    return links


def sanitize_filename(name: str) -> str:
    name = re.sub(r"[^A-Za-z0-9._-]+", "_", name)
    return name.strip("._") or str(int(time.time()))


def ensure_dir(p: Path) -> None:
    p.mkdir(parents=True, exist_ok=True)


def download_pdf(url: str, out_path: Path) -> bool:
    try:
        with SESSION.get(url, stream=True, timeout=60) as r:
            r.raise_for_status()
            total = int(r.headers.get("Content-Length", "0")) or None
            with open(out_path, "wb") as f, tqdm(
                total=total, unit="B", unit_scale=True, desc=out_path.name, leave=False
            ) as bar:
                for chunk in r.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
                        bar.update(len(chunk))
        return True
    except Exception as e:
        print(f"[warn] Failed to download {url}: {e}")
        return False


def collect_links_for_source(src: Source, max_per_source: int) -> List[Tuple[str, str]]:
    seen: Set[str] = set()
    results: List[Tuple[str, str]] = []

    for start in src.start_urls:
        # If start is a direct PDF, include it
        if is_pdf_url(start):
            if start not in seen:
                seen.add(start)
                results.append((start, Path(urlparse(start).path).name))
            continue

        # Otherwise, scrape the page for pdf links
        links = extract_pdf_links_from_page(start, src.allowed_domains)
        for url, text in links:
            if url in seen:
                continue
            seen.add(url)
            results.append((url, text or Path(urlparse(url).path).name))
            if len(results) >= max_per_source:
                break
        if len(results) >= max_per_source:
            break

    return results[:max_per_source]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="public/datasets/raw", help="Output directory for downloaded PDFs")
    ap.add_argument("--max-per-source", type=int, default=15, help="Max number of PDFs per source")
    ap.add_argument("--force", action="store_true", help="Re-download even if file exists")
    args = ap.parse_args()

    base_out = Path(args.out)
    ensure_dir(base_out)

    overall_manifest = {}

    for src in SOURCES:
        print(f"\n=== Collecting from {src.name} ===")
        links = collect_links_for_source(src, args.max_per_source)
        if not links:
            print(f"[warn] No links found for {src.name}")
            continue

        src_dir = base_out / src.name
        ensure_dir(src_dir)
        manifest = []

        for idx, (url, title) in enumerate(links, start=1):
            parsed = urlparse(url)
            filename = sanitize_filename(Path(parsed.path).name)
            if not filename.lower().endswith(".pdf"):
                filename += ".pdf"
            numbered = f"{idx:02d}_{filename}"
            out_path = src_dir / numbered

            if out_path.exists() and not args.force:
                print(f"[skip] Exists: {out_path}")
                ok = True
            else:
                print(f"[dl] {url} -> {out_path}")
                ok = download_pdf(url, out_path)

            if ok:
                manifest.append({
                    "filename": numbered,
                    "url": url,
                    "title": title,
                    "source": src.name,
                })

        # Write manifest per source
        if manifest:
            with open(src_dir / "manifest.json", "w", encoding="utf-8") as f:
                json.dump(manifest, f, ensure_ascii=False, indent=2)
            overall_manifest[src.name] = manifest

    # Top-level manifest
    if overall_manifest:
        with open(base_out / "manifest.index.json", "w", encoding="utf-8") as f:
            json.dump(overall_manifest, f, ensure_ascii=False, indent=2)
        print(f"\nSaved overall manifest to {base_out / 'manifest.index.json'}")
    else:
        print("\nNo documents collected.")

    print("\nDone.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
