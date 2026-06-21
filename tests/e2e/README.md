# ATLAS e2e smoke test (Playwright)

`smoke_test.py` drives the offline frontend flow with no backend:
passphrase setup → enter → dashboard → every screen shows a context quote →
Quote Bank verify → lock.

## Run
```bash
pip install playwright
python -m playwright install chromium      # needs network for the browser binary
# from the repo root:
python .claude/skills/webapp-testing/scripts/with_server.py \
    --server "python3 -m http.server 8000" --port 8000 \
    -- python tests/e2e/smoke_test.py
```

> Note: this couldn't be executed in the build environment because the Chromium
> download is blocked by the network policy. The script is syntax-checked and
> its selectors are verified against `index.html`; run it locally or in CI
> (GitHub Actions `microsoft/playwright` image) to execute it for real.
