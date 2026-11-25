# Mengindex

**Mengindex** is a Manifest V3 Chrome Extension for inspecting, filtering, and running SQL queries against the active browser tab's local IndexedDB.

## Features

- **One-Click Active Tab Inspection** — Clicking the toolbar icon opens a dedicated full-screen workspace targeting the active Chrome tab's IndexedDB.
- **Table View, Filters & Row Deletion** — Global search, multi-column filter rules, sorting, pagination, JSON/CSV export, row checkboxes for bulk/single deletion with confirmation, and a Tree/Raw JSON Record Inspector. Active filters convert to SQL via **Open in SQL** and remain preserved when switching back.
- **MV3-Safe SQL Query Console** — Client-side SQL lexer, parser, and evaluator (zero `eval`) supporting `SELECT`, `DELETE FROM ... [WHERE ...]`, `WHERE`, `AND`/`OR`, `LIKE`, `IN`, `IS NULL`, `GROUP BY`, `ORDER BY`, `LIMIT`, `OFFSET`, `DISTINCT`, nested dot-paths (e.g. `shipping.city`), aggregates (`COUNT`, `SUM`, `AVG`, `MIN`, `MAX`), `SHOW STORES`, and query history.
- **Context-Aware SQL Autocomplete** — Suggests object store names, attributes (including nested paths), aggregate functions, and SQL keywords (`↑`/`↓`, `Tab`/`Enter`, `Ctrl+Space`).
- **Schema View & Resizable Sidebar** — Compact column & index inspection with a draggable sidebar (`200px–520px`, double-click to reset).
- **Multi-Language UI** — English (default), Bahasa Indonesia, and Simplified Chinese (`中文`).

## Project Structure

```text
mengindex/
├── .github/workflows/
│   ├── ci.yml                  # Runs on push/PR to main (typecheck, 300-line check, build)
│   └── release.yml             # Runs ONLY on version tags (v*.*.*) to publish GitHub Releases
├── extension/
│   ├── manifest.json           # Chrome Extension Manifest V3 config
│   ├── background.js           # ES module service worker (tab capture & message bridge)
│   └── injectedReaders.js      # Self-contained MAIN-world IndexedDB readers
├── scripts/
│   ├── generate-icons.ts       # Pure-Node PNG icon generator (16px, 48px, 128px)
│   └── package-extension.ts    # Packages dist/ + extension/ + icons into release/
├── src/
│   ├── components/             # TopBar, Sidebar, TableView, SqlWorkbench, SchemaView, RowInspector
│   ├── hooks/                  # useIdbWorkspace, useSidebarResize, useSqlRunner
│   ├── lib/                    # idbAdapter, sqlEngine, sqlAutocomplete, exportUtils, i18n
│   ├── types/                  # Shared IndexedDB & query types
│   ├── App.tsx
│   └── main.tsx
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Development

```bash
# Install dependencies
npm install

# Start local browser preview (port 3000) with sample IndexedDB seeder
npm run dev

# Run TypeScript typecheck
npm run lint

# Build unpacked extension & ZIP archive locally into release/
npm run build:extension
```

## Install in Google Chrome

1. Download `mengindex-chrome-extension-vX.Y.Z.zip` from the [GitHub Releases](../../releases) page (or build locally with `npm run build:extension` and use `release/unpacked/`).
2. Unzip the archive if downloaded from Releases.
3. Open `chrome://extensions` in Chrome and enable **Developer mode** (top right).
4. Click **Load unpacked** and select the extracted folder (or `release/unpacked/`).
5. Open any site using IndexedDB and click the **Mengindex** toolbar icon.

## Release Workflow (Versioning & Changelog)

Regular commits pushed to `main` only run **CI** verification (typecheck, 300-line file limit check, and build verification). The release workflow checks whether `v<package.json version>` already exists — if the tag already exists, **no new release is created**.

### Publishing the Next Release Automatically

1. Develop and push commits to `main` as usual (using prefixes like `feat: ...`, `fix: ...`, `refactor: ...` lets the release notes group changes automatically into **Features**, **Bug Fixes**, and **Improvements**).
2. When ready to ship a new version, bump `"version"` in `package.json` (e.g. `1.0.0` → `1.1.0` for new features, or `1.0.1` for bug fixes) and push to `main`:
   - Directly via `package.json` edit + push (works with GitHub UI, local git, or AI Studio Save to GitHub), **or**
   - Locally via CLI:
     ```bash
     npm version minor -m "release: v%s"   # patch | minor | major
     git push origin main --follow-tags
     ```
3. GitHub Actions (`release.yml`) automatically:
   - Detects the new unpublished version `vX.Y.Z`
   - Collects all commits since the previous release tag and generates categorized Markdown **Release Notes** + a **Full Changelog** diff link
   - Syncs `manifest.json` version, builds & zips `mengindex-chrome-extension-vX.Y.Z.zip`
   - Creates tag `vX.Y.Z` and publishes the **GitHub Release**
4. You can also trigger a release manually anytime from **Actions → Release Chrome Extension → Run workflow**.
