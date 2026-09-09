# Signed Release Operations

Public repository: `WuXinbo-bo/Codex-Bot`. The compiled `release/update.json`
contains the repository name and updater public key. Local settings cannot
substitute an arbitrary update URL or executable.

## Signing

Maintain a secure offline backup of the private signing key. It belongs outside
the repository. Never print it in CI, attach it to a Release, or share it in chat.
Repository Actions secrets: `TAURI_SIGNING_PRIVATE_KEY` (complete private key),
and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` if encrypted. The public key is committed.
Losing the key can prevent installed clients from trusting future releases.

## Publish

1. Increment package.json/package-lock.json, Cargo.toml/Cargo.lock and tauri.conf.json versions; update CHANGELOG.
2. Run unit tests, native compile, native smoke and browser UI checks.
3. Run `npm run release:check`. Separately audit history and new assets before the first public push.
4. Commit and push main, then push a matching `vX.Y.Z` tag.
5. The workflow repeats tests, builds and signs NSIS, writes latest.json, uploads all assets to a draft and publishes it.
6. Verify the public manifest and installer, then test an installed old-to-new upgrade. CI success alone is not that test.

Local PowerShell signing build (supply your private key path):

```powershell
$env:TAURI_SIGNING_PRIVATE_KEY = Get-Content -Raw -LiteralPath $signingKeyPath
npm run build:native -- --ci
npm run release:manifest
Remove-Item Env:TAURI_SIGNING_PRIVATE_KEY
```

## Behavior and Limits

Automatic checks default on; auto download defaults off. Installation requires
confirmation. Postpone lasts 24 hours; ignore is version-specific. Task notices
preempt update toasts. Verified bytes are held in memory; after restart they must
be downloaded again. This version has no resumable downloads or auto rollback.
Updater signing is not Authenticode/SmartScreen reputation signing.

The identifier and `.metabot` data directory remain unchanged. Old Meta Bot
versions without an updater need one manual install. Do not claim clean-machine,
installer cancellation or old-to-new installation coverage from mocked tests.
Record the actual machines and versions checked before wider public deployment.
