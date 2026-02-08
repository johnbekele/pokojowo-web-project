"""CLI for Pokojowo Scraper."""

import asyncio
import logging
from typing import Optional

import typer
from rich.console import Console
from rich.table import Table
from rich.progress import Progress, SpinnerColumn, TextColumn

from src.config import settings
from src.agents import ScraperAgent
from src.services import PokojowoClient, DeduplicationService
from src.db import JobRepository
from src.models import ScrapeJobStatus

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

app = typer.Typer(
    name="pokojowo-scraper",
    help="AI-powered scraper for aggregating Polish rental listings to Pokojowo",
)
console = Console()


@app.command()
def scrape(
    site: str = typer.Option(
        "olx",
        "--site",
        "-s",
        help="Site to scrape: olx, otodom, gumtree, or 'all'",
    ),
    city: str = typer.Option(
        "warszawa",
        "--city",
        "-c",
        help="City to scrape listings from",
    ),
    max_listings: int = typer.Option(
        50,
        "--max",
        "-m",
        help="Maximum number of listings to scrape",
    ),
    dry_run: bool = typer.Option(
        False,
        "--dry-run",
        "-d",
        help="Run without publishing to Pokojowo",
    ),
):
    """Scrape rental listings and publish to Pokojowo."""
    console.print(f"[bold blue]Pokojowo Scraper[/bold blue]")
    console.print(f"Site: {site}")
    console.print(f"City: {city}")
    console.print(f"Max listings: {max_listings}")
    console.print(f"Dry run: {dry_run}")
    console.print()

    asyncio.run(_run_scrape(site, city, max_listings, dry_run))


async def _run_scrape(site: str, city: str, max_listings: int, dry_run: bool):
    """Run the scraping job."""
    sites = [site] if site != "all" else ["olx", "otodom", "gumtree"]

    agent = ScraperAgent(dry_run=dry_run)
    job_repo = JobRepository()

    try:
        await agent.initialize()
        await job_repo.connect()

        for s in sites:
            console.print(f"\n[bold green]Scraping {s.upper()}...[/bold green]")

            with Progress(
                SpinnerColumn(),
                TextColumn("[progress.description]{task.description}"),
                console=console,
            ) as progress:
                task = progress.add_task(f"Scraping {s}/{city}...", total=None)

                job = await agent.run_scrape_job(
                    site=s,
                    city=city,
                    max_listings=max_listings,
                )

                # Save job to database
                await job_repo.save(job)

                progress.update(task, completed=True)

            # Display results
            _display_job_results(job)

    except Exception as e:
        console.print(f"[bold red]Error: {e}[/bold red]")
        raise typer.Exit(1)

    finally:
        await agent.cleanup()
        await job_repo.close()


def _display_job_results(job):
    """Display job results in a table."""
    table = Table(title=f"Job: {job.job_id}")
    table.add_column("Metric", style="cyan")
    table.add_column("Value", style="green")

    table.add_row("Status", job.status.value)
    table.add_row("Site", job.site)
    table.add_row("City", job.city)
    table.add_row("Listings Found", str(job.stats.total_listings_found))
    table.add_row("Published", str(job.stats.processed_successfully))
    table.add_row("Failed", str(job.stats.failed_to_process))
    table.add_row("Duplicates Skipped", str(job.stats.duplicates_skipped))

    if job.duration_seconds:
        table.add_row("Duration", f"{job.duration_seconds:.1f}s")

    if job.error_message:
        table.add_row("Error", job.error_message)

    console.print(table)


@app.command()
def status(
    job_id: Optional[str] = typer.Argument(None, help="Job ID to check"),
    limit: int = typer.Option(10, "--limit", "-l", help="Number of recent jobs to show"),
):
    """Check status of scrape jobs."""
    asyncio.run(_show_status(job_id, limit))


async def _show_status(job_id: Optional[str], limit: int):
    """Show job status."""
    job_repo = JobRepository()

    try:
        await job_repo.connect()

        if job_id:
            job = await job_repo.get(job_id)
            if job:
                _display_job_results(job)
            else:
                console.print(f"[yellow]Job not found: {job_id}[/yellow]")
        else:
            jobs = await job_repo.get_recent(limit=limit)
            if not jobs:
                console.print("[yellow]No jobs found[/yellow]")
                return

            table = Table(title="Recent Jobs")
            table.add_column("Job ID", style="cyan")
            table.add_column("Site")
            table.add_column("City")
            table.add_column("Status")
            table.add_column("Published")
            table.add_column("Started")

            for job in jobs:
                status_color = {
                    ScrapeJobStatus.COMPLETED: "green",
                    ScrapeJobStatus.RUNNING: "yellow",
                    ScrapeJobStatus.FAILED: "red",
                    ScrapeJobStatus.PENDING: "blue",
                }.get(job.status, "white")

                started = job.started_at.strftime("%Y-%m-%d %H:%M") if job.started_at else "-"

                table.add_row(
                    job.job_id,
                    job.site,
                    job.city,
                    f"[{status_color}]{job.status.value}[/{status_color}]",
                    str(job.stats.processed_successfully),
                    started,
                )

            console.print(table)

            # Show aggregate stats
            stats = await job_repo.get_stats()
            console.print(f"\n[bold]Total:[/bold] {stats['total_processed']} listings published across {stats['total_jobs']} jobs")

    finally:
        await job_repo.close()


@app.command("test-auth")
def test_auth():
    """Test authentication with Pokojowo API."""
    asyncio.run(_test_auth())


async def _test_auth():
    """Test Pokojowo API authentication."""
    console.print("[bold blue]Testing Pokojowo API authentication...[/bold blue]")

    try:
        async with PokojowoClient() as client:
            user = await client.test_connection()
            console.print(f"[bold green]Success![/bold green]")
            console.print(f"Authenticated as: {user.get('email', 'Unknown')}")
            console.print(f"User ID: {user.get('_id', 'Unknown')}")
            is_landlord = user.get("is_landlord", False)
            if is_landlord:
                console.print("[green]User has landlord permissions[/green]")
            else:
                console.print("[yellow]Warning: User does not have landlord permissions[/yellow]")
                console.print("Listings cannot be created without landlord status.")

    except Exception as e:
        console.print(f"[bold red]Authentication failed: {e}[/bold red]")
        raise typer.Exit(1)


@app.command("stats")
def stats():
    """Show scraper statistics."""
    asyncio.run(_show_stats())


async def _show_stats():
    """Show aggregate statistics."""
    dedup = DeduplicationService()
    job_repo = JobRepository()

    try:
        await dedup.connect()
        await job_repo.connect()

        # Deduplication stats
        total_scraped = await dedup.get_scraped_count()
        olx_count = await dedup.get_scraped_count("olx")
        otodom_count = await dedup.get_scraped_count("otodom")
        gumtree_count = await dedup.get_scraped_count("gumtree")

        # Job stats
        job_stats = await job_repo.get_stats()

        table = Table(title="Scraper Statistics")
        table.add_column("Metric", style="cyan")
        table.add_column("Value", style="green")

        table.add_row("Total Listings Scraped", str(total_scraped))
        table.add_row("  - OLX", str(olx_count))
        table.add_row("  - Otodom", str(otodom_count))
        table.add_row("  - Gumtree", str(gumtree_count))
        table.add_row("", "")
        table.add_row("Total Jobs Run", str(job_stats["total_jobs"]))
        table.add_row("Total Published", str(job_stats["total_processed"]))
        table.add_row("Total Failed", str(job_stats["total_failed"]))

        console.print(table)

    finally:
        await dedup.close()
        await job_repo.close()


@app.command("clear-cache")
def clear_cache(
    days: int = typer.Option(90, "--days", "-d", help="Clear records older than this many days"),
    confirm: bool = typer.Option(False, "--yes", "-y", help="Skip confirmation"),
):
    """Clear old scraping records."""
    if not confirm:
        confirm = typer.confirm(f"Clear records older than {days} days?")
        if not confirm:
            raise typer.Abort()

    asyncio.run(_clear_cache(days))


async def _clear_cache(days: int):
    """Clear old deduplication records."""
    dedup = DeduplicationService()

    try:
        await dedup.connect()
        deleted = await dedup.clear_old_records(days)
        console.print(f"[green]Cleared {deleted} old records[/green]")

    finally:
        await dedup.close()


@app.command("serve")
def serve_api(
    host: str = typer.Option("0.0.0.0", "--host", "-h", help="Host to bind to"),
    port: int = typer.Option(8001, "--port", "-p", help="Port to bind to"),
    reload: bool = typer.Option(False, "--reload", "-r", help="Enable auto-reload"),
):
    """Start the Dashboard API server."""
    import uvicorn

    console.print(f"[bold blue]Starting Scraper Dashboard API...[/bold blue]")
    console.print(f"Host: {host}")
    console.print(f"Port: {port}")
    console.print(f"API Docs: http://{host}:{port}/docs")
    console.print()

    uvicorn.run(
        "src.api.app:app",
        host=host,
        port=port,
        reload=reload,
        log_level="info",
    )


if __name__ == "__main__":
    app()
