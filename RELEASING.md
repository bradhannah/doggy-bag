# Releasing Doggy Bag

This document describes the release process for Doggy Bag.

## Versioning

Doggy Bag uses semantic versioning (`MAJOR.MINOR.PATCH`):

- **MAJOR**: Breaking changes or significant feature overhauls
- **MINOR**: New features, enhancements
- **PATCH**: Bug fixes, minor improvements

## Release Process

### 1. Prepare the Release

1. Ensure all tests pass:

   ```bash
   make test
   ```

2. Update version numbers in:
   - `package.json` - `"version": "X.Y.Z"`
   - `src-tauri/Cargo.toml` - `version = "X.Y.Z"`
   - `src-tauri/tauri.conf.json` - `"version": "X.Y.Z"`

3. Update `CHANGELOG.md` with release notes

4. Commit version bump:
   ```bash
   git add -A
   git commit -m "chore: bump version to vX.Y.Z"
   git push origin main
   ```

### 2. Create the Release

1. Create and push a version tag:

   ```bash
   git tag vX.Y.Z
   git push origin vX.Y.Z
   ```

2. The GitHub Actions `release.yml` workflow will automatically:
   - Create a draft GitHub Release
   - Build the macOS ARM64 app
   - Apply ad-hoc code signing
   - Create and attach the DMG
   - Publish the release

3. Monitor the workflow in GitHub Actions

### 3. Post-Release

1. Verify the release on GitHub Releases page
2. Download and test the DMG
3. Announce the release if needed

## Local Development Build

To build a release locally:

```bash
# Prepare sidecar
make prepare-dev-sidecar

# Build release
npm run tauri build

# Ad-hoc sign (macOS)
codesign --sign - --force --deep "src-tauri/target/release/bundle/macos/DoggyBag.app"
```

## macOS Gatekeeper Bypass

Since the app uses ad-hoc signing (not Apple Developer ID), users will see a Gatekeeper warning on first launch.

### For Users

**Option 1: Right-click Open (Recommended)**

1. Locate `DoggyBag.app` in Finder
2. Right-click (or Control+click) the app
3. Select "Open" from the context menu
4. Click "Open" in the dialog

**Option 2: System Preferences**

1. Try to open the app normally (it will be blocked)
2. Open System Preferences > Security & Privacy
3. Click "Open Anyway" next to the blocked app message

**Option 3: Terminal (Advanced)**

```bash
xattr -cr /Applications/DoggyBag.app
```

### Why Ad-hoc Signing?

- **Free**: No $99/year Apple Developer account required
- **Functional**: App runs correctly after bypass
- **Secure**: Code is still signed, just not by Apple-verified identity

For production distribution to many users, consider:

- Apple Developer ID signing ($99/year)
- Notarization for seamless Gatekeeper approval

## Troubleshooting

### Build Fails

1. Check Rust toolchain is installed: `rustc --version`
2. Check Bun is installed: `bun --version`
3. Ensure dependencies are installed: `bun install && cd api && bun install`
4. Check sidecar is prepared: `make prepare-dev-sidecar`

### DMG Won't Open

1. Try the Gatekeeper bypass methods above
2. Check the app wasn't quarantined: `xattr -l DoggyBag.app`
3. Remove quarantine if needed: `xattr -d com.apple.quarantine DoggyBag.app`

### Backend Doesn't Start

1. Check sidecar permissions in `src-tauri/capabilities/default.json`
2. Verify Bun binary exists in `src-tauri/binaries/`
3. Check console for error messages
