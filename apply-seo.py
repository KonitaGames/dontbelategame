#!/usr/bin/env python3
"""
apply-seo.py — adds canonical, Open Graph, Twitter card and JSON-LD to every
page, and updates <title> / <meta description> from seo-meta.csv.

Idempotent: everything it injects sits between
    <!-- BEGIN seo-dropin -->  and  <!-- END seo-dropin -->
so re-running it replaces the block instead of stacking duplicates.

Usage:
    python3 apply-seo.py --root /path/to/site            # dry run (shows a diff summary)
    python3 apply-seo.py --root /path/to/site --write    # apply

It maps files to URLs the way GitHub Pages serves them:
    <root>/index.html          -> /
    <root>/play/index.html     -> /play/
    <root>/about.html          -> /about
"""

import argparse
import csv
import json
import os
import re
import sys

BASE = "https://www.dontbelategame.com"
OG_IMAGE = f"{BASE}/og-image.png"
MARK_START = "<!-- BEGIN seo-dropin -->"
MARK_END = "<!-- END seo-dropin -->"

STRUCTURED_DATA = {
    "@context": "https://schema.org",
    "@graph": [
        {
            "@type": "Organization",
            "@id": f"{BASE}/#organization",
            "name": "Konita Games",
            "legalName": "Konita Games LLC",
            "url": f"{BASE}/",
            "logo": {"@type": "ImageObject", "url": f"{BASE}/Logo.png"},
            "description": "Konita Games makes Don't Be Late!, a 3D math game for students in grades 1-8.",
            "sameAs": [
                "https://www.instagram.com/dontbelategame/",
                "https://www.tiktok.com/@konita_yt",
                "https://www.linkedin.com/company/konita-games",
                "https://www.youtube.com/@Konita_YT",
                "https://x.com/dontbelategame",
            ],
        },
        {
            "@type": "WebSite",
            "@id": f"{BASE}/#website",
            "url": f"{BASE}/",
            "name": "Don't Be Late!",
            "alternateName": ["Dont Be Late", "Don't Be Late Game", "Don't Be Late Math Game"],
            "publisher": {"@id": f"{BASE}/#organization"},
            "inLanguage": "en-US",
        },
        {
            "@type": "SoftwareApplication",
            "@id": f"{BASE}/#software",
            "name": "Don't Be Late!",
            "alternateName": ["Dont Be Late", "Don't Be Late Game"],
            "applicationCategory": "EducationalApplication",
            "applicationSubCategory": "Math game",
            "operatingSystem": "Web browser (Chrome, Safari, Edge, Firefox)",
            "url": f"{BASE}/play/",
            "description": "A free 3D math platformer where students in grades 1-8 practise classroom math skills in a game they want to play.",
            "publisher": {"@id": f"{BASE}/#organization"},
            "audience": {
                "@type": "EducationalAudience",
                "educationalRole": ["student", "teacher", "parent"],
            },
            "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"},
            "inLanguage": "en-US",
        },
    ],
}


def url_for(root, path):
    rel = os.path.relpath(path, root).replace(os.sep, "/")
    if rel in ("index.html", "./index.html"):
        return "/"
    if rel.endswith("/index.html"):
        return "/" + rel[: -len("index.html")]
    return "/" + rel


def esc(text):
    return (text.replace("&", "&amp;").replace("<", "&lt;")
                .replace(">", "&gt;").replace('"', "&quot;"))


def build_block(url, title, description):
    canonical = BASE + url
    ld = json.dumps(STRUCTURED_DATA, ensure_ascii=False, separators=(",", ":"))
    return f"""{MARK_START}
<link rel="canonical" href="{canonical}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Don't Be Late!">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(description)}">
<meta property="og:url" content="{canonical}">
<meta property="og:image" content="{OG_IMAGE}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="en_US">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{esc(title)}">
<meta name="twitter:description" content="{esc(description)}">
<meta name="twitter:image" content="{OG_IMAGE}">
<script type="application/ld+json">{ld}</script>
{MARK_END}"""


def patch_html(html, url, title, description):
    changed = []

    # <title>
    new_title = f"<title>{esc(title)}</title>"
    if re.search(r"<title[^>]*>.*?</title>", html, re.S | re.I):
        html2 = re.sub(r"<title[^>]*>.*?</title>", new_title, html, count=1, flags=re.S | re.I)
    else:
        html2 = html.replace("</head>", new_title + "\n</head>", 1)
    if html2 != html:
        changed.append("title")
    html = html2

    # meta description
    desc_tag = f'<meta name="description" content="{esc(description)}">'
    if re.search(r'<meta[^>]+name=["\']description["\'][^>]*>', html, re.I):
        html2 = re.sub(r'<meta[^>]+name=["\']description["\'][^>]*>', desc_tag,
                       html, count=1, flags=re.I)
    else:
        html2 = re.sub(r"(<title[^>]*>.*?</title>)", r"\1\n" + desc_tag, html,
                       count=1, flags=re.S | re.I)
    if html2 != html:
        changed.append("description")
    html = html2

    # managed block: replace if present, else insert before </head>
    block = build_block(url, title, description)
    pattern = re.compile(re.escape(MARK_START) + r".*?" + re.escape(MARK_END), re.S)
    if pattern.search(html):
        html2 = pattern.sub(block, html, count=1)
        changed.append("block-replaced")
    else:
        html2 = re.sub(r"</head>", block + "\n</head>", html, count=1, flags=re.I)
        changed.append("block-added")
    html = html2

    return html, changed


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", required=True)
    ap.add_argument("--csv", default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "seo-meta.csv"))
    ap.add_argument("--write", action="store_true")
    args = ap.parse_args()

    with open(args.csv, newline="", encoding="utf-8") as fh:
        rows = {r["path"].strip(): r for r in csv.DictReader(fh)}

    pages = []
    for dirpath, _dirs, files in os.walk(args.root):
        for name in files:
            if name.endswith(".html"):
                full = os.path.join(dirpath, name)
                pages.append(full)

    if not pages:
        print("No .html files found under", args.root)
        return 1

    touched = 0
    for full in sorted(pages):
        url = url_for(args.root, full)
        row = rows.get(url)
        if not row:
            print(f"  skip   {url:<24} (no row in seo-meta.csv)")
            continue
        with open(full, encoding="utf-8") as fh:
            original = fh.read()
        updated, changed = patch_html(original, url, row["title"].strip(), row["description"].strip())
        if updated != original:
            touched += 1
            print(f"  {'write ' if args.write else 'would '} {url:<24} {', '.join(changed)}")
            if args.write:
                with open(full, "w", encoding="utf-8") as fh:
                    fh.write(updated)
        else:
            print(f"  ok     {url:<24} already up to date")

    print(f"\n{touched} file(s) {'updated' if args.write else 'would be updated'} "
          f"of {len(pages)} html file(s).")
    if not args.write:
        print("Re-run with --write to apply.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
