import fs from 'fs';
import JSZip from 'jszip';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateMengindexCatPng } from './generate-icons.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const EXT_SRC_DIR = path.join(ROOT_DIR, 'extension');
const RELEASE_DIR = path.join(ROOT_DIR, 'release');
const UNPACKED_DIR = path.join(RELEASE_DIR, 'unpacked');

function parseVersionArg(): string | null {
  const idx = process.argv.indexOf('--version');
  if (idx !== -1 && process.argv[idx + 1]) {
    return process.argv[idx + 1].replace(/^v/i, '').trim();
  }
  return null;
}

function validateChromeVersion(version: string): void {
  if (!/^\d+\.\d+\.\d+(\.\d+)?$/.test(version)) {
    throw new Error(
      `Invalid Chrome extension version "${version}". Expected numeric format like 1.0.0 or 1.2.3.`
    );
  }
}

function copyDirRecursive(src: string, dest: string) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function addDirToZip(zip: JSZip, sourceDir: string, zipPrefix = '') {
  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const fullPath = path.join(sourceDir, entry.name);
    const relPath = zipPrefix ? `${zipPrefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      addDirToZip(zip, fullPath, relPath);
    } else if (entry.isFile()) {
      zip.file(relPath, fs.readFileSync(fullPath));
    }
  }
}

async function main() {
  if (!fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
    throw new Error('Missing dist/index.html. Run "npm run build" before packaging the extension.');
  }

  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf-8'));
  const manifest = JSON.parse(fs.readFileSync(path.join(EXT_SRC_DIR, 'manifest.json'), 'utf-8'));

  const version = parseVersionArg() || pkg.version || manifest.version || '1.0.0';
  validateChromeVersion(version);
  manifest.version = version;

  // Rebuild clean unpacked extension directory
  fs.rmSync(UNPACKED_DIR, { recursive: true, force: true });
  fs.mkdirSync(path.join(UNPACKED_DIR, 'icons'), { recursive: true });

  copyDirRecursive(DIST_DIR, UNPACKED_DIR);

  fs.writeFileSync(
    path.join(UNPACKED_DIR, 'manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf-8'
  );
  fs.copyFileSync(path.join(EXT_SRC_DIR, 'background.js'), path.join(UNPACKED_DIR, 'background.js'));
  fs.copyFileSync(
    path.join(EXT_SRC_DIR, 'injectedReaders.js'),
    path.join(UNPACKED_DIR, 'injectedReaders.js')
  );

  for (const size of [16, 48, 128]) {
    fs.writeFileSync(
      path.join(UNPACKED_DIR, 'icons', `icon${size}.png`),
      generateMengindexCatPng(size)
    );
  }

  const zip = new JSZip();
  addDirToZip(zip, UNPACKED_DIR);

  const zipBuffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });

  const versionedZipPath = path.join(RELEASE_DIR, `mengindex-chrome-extension-v${version}.zip`);
  const latestZipPath = path.join(RELEASE_DIR, 'mengindex-chrome-extension.zip');

  fs.writeFileSync(versionedZipPath, zipBuffer);
  fs.writeFileSync(latestZipPath, zipBuffer);

  console.log(`Packaged Mengindex Chrome Extension v${version}`);
  console.log(`  Unpacked : ${path.relative(ROOT_DIR, UNPACKED_DIR)}`);
  console.log(`  Archive  : ${path.relative(ROOT_DIR, versionedZipPath)} (${zipBuffer.length} bytes)`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
