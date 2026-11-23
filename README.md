# Mengindex

**Mengindex** is a Manifest V3 Chrome Extension for inspecting, filtering, and running SQL queries against the active browser tab's local IndexedDB.

## Features

- **One-Click Active Tab Inspection** — Clicking the toolbar icon opens a dedicated full-screen workspace targeting the active Chrome tab's IndexedDB.
- **Table View & Persistent Filters** — Global search, multi-column filter rules, sorting, pagination, JSON/CSV export, and a Tree/Raw JSON Record Inspector. Active filters convert to SQL via **Open in SQL** and remain preserved when switching back.
- **MV3-Safe SQL Query Console** — Client-side SQL lexer, parser, and evaluator (zero `eval`) supporting `SELECT`, `WHERE`, `AND`/`OR`, `LIKE`, `IN`, `IS NULL`, `GROUP BY`, `ORDER BY`, `LIMIT`, `OFFSET`, `DISTINCT`, nested dot-paths (e.g. `shipping.city`), aggregates (`COUNT`, `SUM`, `AVG`, `MIN`, `MAX`), `SHOW STORES`, and query history.
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

## Release Workflow (Versioning)

Regular commits pushed to `main` only run **CI** verification (typecheck, 300-line file limit check, and build verification) and do **not** create a new version.

When a feature set is ready to ship as a new version:

```bash
# 1. Bump version in package.json and create a git tag (patch | minor | major)
npm version minor -m "release: v%s"

# 2. Push commit and version tag to trigger the Release workflow
git push origin main --follow-tags
```

GitHub Actions (`release.yml`) automatically syncs the tag version into `manifest.json`, builds the extension, packages `mengindex-chrome-extension-vX.Y.Z.zip`, and publishes a GitHub Release with auto-generated release notes. You can also trigger a release manually from the **Actions → Release Chrome Extension** tab.
