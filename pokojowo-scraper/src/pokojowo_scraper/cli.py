"""CLI: probe (save fixture pages), run (pipeline), translate-test."""

import asyncio
import json
from pathlib import Path

import typer
from rich.console import Console

app = typer.Typer(no_args_is_help=True)
console = Console()

FIXTURES_DIR = Path(__file__).resolve().parents[2] / "tests" / "fixtures"


@app.command()
def probe(
    site: str = typer.Argument(help="olx | otodom"),
    city: str = typer.Option("warszawa"),
    detail_count: int = typer.Option(3, help="detail pages to save"),
):
    """Fetch one search page + N detail pages and save them as fixtures.
    Run this on the Mac (residential IP) — datacenter IPs get blocked."""
    asyncio.run(_probe(site, city, detail_count))


async def _probe(site: str, city: str, detail_count: int) -> None:
    from pokojowo_scraper.fetch.client import Fetcher
    from pokojowo_scraper.sites import ADAPTERS

    adapter = ADAPTERS[site]
    out_dir = FIXTURES_DIR / site
    out_dir.mkdir(parents=True, exist_ok=True)

    async with Fetcher() as fetcher:
        search_url = adapter.search_url(city, 1)
        console.print(f"[cyan]GET[/] {search_url}")
        search_html = await fetcher.get(search_url)
        (out_dir / f"search_{city}.html").write_text(search_html, encoding="utf-8")

        urls = adapter.listing_urls(search_html)
        console.print(f"found [bold]{len(urls)}[/] listing URLs")

        for i, url in enumerate(urls[:detail_count]):
            console.print(f"[cyan]GET[/] {url}")
            html = await fetcher.get(url)
            (out_dir / f"detail_{city}_{i}.html").write_text(html, encoding="utf-8")

            listing = adapter.extract(url, html)
            if listing:
                summary = {
                    name: repr(f.value)[:80]
                    for name, f in listing.field_items()
                }
                console.print_json(json.dumps(summary, ensure_ascii=False))
            else:
                console.print("[red]extraction returned None[/]")

    console.print(f"[green]fixtures saved to {out_dir}[/]")


@app.command()
def extract(
    site: str = typer.Argument(help="olx | otodom"),
    fixture: Path = typer.Argument(help="path to saved HTML file"),
):
    """Run the extractor against a saved fixture and print the result."""
    from pokojowo_scraper.sites import ADAPTERS

    adapter = ADAPTERS[site]
    html = fixture.read_text(encoding="utf-8")
    listing = adapter.extract(f"file://{fixture}", html)
    if not listing:
        console.print("[red]extraction returned None[/]")
        raise typer.Exit(1)
    console.print_json(listing.model_dump_json())


@app.command()
def run(
    site: str = typer.Option(None, help="olx | otodom (default: both)"),
    city: str = typer.Option(None, help="single city (default: settings.cities)"),
    pages: int = typer.Option(None, help="override page cap"),
    dry_run: bool = typer.Option(False, "--dry-run", help="extract but don't save/publish"),
):
    """Run the scrape pipeline. (Wired up in Phase 3.)"""
    from pokojowo_scraper.pipeline import run_all

    asyncio.run(run_all(site=site, city=city, pages=pages, dry_run=dry_run, trigger="manual"))


@app.command("translate-test")
def translate_test(count: int = typer.Option(10)):
    """Translate the N most recent pending descriptions and print pairs."""
    asyncio.run(_translate_test(count))


async def _translate_test(count: int) -> None:
    from pokojowo_scraper.enrich.translate import translate_pl_to_en
    from pokojowo_scraper.store import db

    cursor = db().pending.find(
        {"listing.description_pl.value": {"$exists": True}}
    ).sort("created_at", -1).limit(count)
    n = 0
    async for doc in cursor:
        src = doc["listing"]["description_pl"]["value"]
        result = await translate_pl_to_en(src)
        console.rule(doc.get("source_url", "?"))
        console.print(f"[yellow]PL:[/] {src[:300]}")
        console.print(f"[green]EN:[/] {(result.text if result else '<failed>')[:300]}")
        if result and result.suspect:
            console.print("[red]⚠ flagged translation_suspect[/]")
        n += 1
    if n == 0:
        console.print("[red]no pending listings with descriptions — run a scrape first[/]")


if __name__ == "__main__":
    app()
