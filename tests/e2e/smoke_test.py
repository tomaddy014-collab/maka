"""ATLAS frontend smoke test (Playwright).

Drives the core offline flow with no backend:
  passphrase setup -> enter -> dashboard -> every screen renders a context quote
  -> Quote Bank -> mark a placeholder quote verified.

Run it (Playwright + chromium required):
    pip install playwright && python -m playwright install chromium
    python ../backend/.../with_server.py  # or just serve the repo root:
    python -m http.server 8000 &
    python tests/e2e/smoke_test.py

Or via the webapp-testing helper from the repo root:
    python .claude/skills/webapp-testing/scripts/with_server.py \
        --server "python3 -m http.server 8000" --port 8000 \
        -- python tests/e2e/smoke_test.py
"""
import sys
from playwright.sync_api import sync_playwright, expect

BASE = "http://localhost:8000"
SCREENS = ["dashboard", "garmin", "lifting", "nutrition", "analytics", "quotes"]


def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 900})
        page.goto(BASE)
        page.wait_for_load_state("networkidle")

        # First run: the gate shows the "set passphrase" view.
        page.fill("#pwNew", "ironwill")
        page.fill("#pwConfirm", "ironwill")
        page.click("#setupBtn")

        # App becomes active and the dashboard renders.
        page.wait_for_selector(".app.active", timeout=5000)
        expect(page.locator("#view h1")).to_contain_text("Dashboard")

        # Every screen renders and shows a context-aware quote banner.
        for screen in SCREENS:
            page.click(f'.nav-btn[data-screen="{screen}"]')
            page.wait_for_timeout(150)
            assert page.locator("#view .quote").count() >= 1, f"no quote on {screen}"
            print(f"  ok: {screen} renders + has a quote")

        # Quote Bank: mark a placeholder quote verified.
        page.click('.nav-btn[data-screen="quotes"]')
        page.wait_for_selector("#view")
        before = page.locator("text=⚠ unverified").count()
        assert before > 0, "expected unverified placeholder quotes"
        page.locator('button:has-text("Mark verified")').first.click()
        page.wait_for_timeout(150)
        after = page.locator("text=⚠ unverified").count()
        assert after == before - 1, "verify did not reduce the unverified count"
        print(f"  ok: Quote Bank verify ({before} -> {after} unverified)")

        # Lock returns to the gate (login view this time, since auth now exists).
        page.click("#lockBtn")
        page.wait_for_selector("#gate:not(.hidden)")
        assert page.is_visible("#gateLoginView"), "lock should show the login view"
        print("  ok: lock returns to gate")

        browser.close()
        print("\nALL SMOKE CHECKS PASSED")


if __name__ == "__main__":
    try:
        run()
    except AssertionError as e:
        print(f"SMOKE FAILED: {e}")
        sys.exit(1)
