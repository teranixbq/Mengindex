import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const RELEASE_DIR = path.join(ROOT_DIR, 'release');

function getArg(flag: string): string | null {
  const idx = process.argv.indexOf(flag);
  return idx !== -1 && process.argv[idx + 1] ? process.argv[idx + 1].trim() : null;
}

function runGit(cmd: string): string {
  try {
    return execSync(cmd, { cwd: ROOT_DIR, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

function findPreviousTag(currentTag: string): string | null {
  const raw = runGit('git tag --sort=-v:refname');
  if (!raw) return null;
  const semverTags = raw
    .split('\n')
    .map((t) => t.trim())
    .filter((t) => /^v\d+\.\d+\.\d+$/.test(t) && t !== currentTag);
  return semverTags[0] || null;
}

interface CommitEntry {
  hash: string;
  subject: string;
}

function getCommits(prevTag: string | null): CommitEntry[] {
  const range = prevTag ? `${prevTag}..HEAD` : 'HEAD';
  const raw = runGit(`git log ${range} --no-merges --max-count=50 --pretty=format:%h%x09%s`);
  if (!raw) return [];
  return raw
    .split('\n')
    .map((line) => {
      const [hash, ...rest] = line.split('\t');
      return { hash: hash?.trim() || '', subject: rest.join('\t').trim() };
    })
    .filter((c) => c.hash && c.subject && !/^release:\s*v?\d+/i.test(c.subject));
}

function stripConventionalPrefix(subject: string): string {
  return subject.replace(/^[a-z]+(\([^)]+\))?!?:\s*/i, '').trim() || subject;
}

function buildNotes(tag: string, version: string, repo: string | null): string {
  const prevTag = findPreviousTag(tag);
  const commits = getCommits(prevTag);

  const features: string[] = [];
  const fixes: string[] = [];
  const improvements: string[] = [];
  const others: string[] = [];

  for (const commit of commits) {
    const lower = commit.subject.toLowerCase();
    const bullet = `- ${stripConventionalPrefix(commit.subject)} (\`${commit.hash}\`)`;

    if (/^feat(\(|:|!)/.test(lower)) {
      features.push(bullet);
    } else if (/^fix(\(|:|!)/.test(lower)) {
      fixes.push(bullet);
    } else if (/^(refactor|perf|style|docs|chore|ci|build)(\(|:|!)/.test(lower)) {
      improvements.push(bullet);
    } else {
      others.push(bullet);
    }
  }

  const sections: string[] = [`## Mengindex ${tag}`];

  if (!prevTag) {
    sections.push(
      'Initial release of **Mengindex** — Chrome extension to browse, filter, and query IndexedDB with SQL.'
    );
  }

  if (features.length > 0) {
    sections.push(`### Features\n${features.join('\n')}`);
  }
  if (fixes.length > 0) {
    sections.push(`### Bug Fixes\n${fixes.join('\n')}`);
  }
  if (improvements.length > 0) {
    sections.push(`### Improvements & Maintenance\n${improvements.join('\n')}`);
  }
  if (others.length > 0) {
    sections.push(`### Changes\n${others.join('\n')}`);
  }
  if (commits.length === 0 && prevTag) {
    sections.push(`### Changes\n- Release ${tag} packaged from \`main\`.`);
  }

  sections.push(
    [
      '### How to Install / Update',
      `1. Download \`mengindex-chrome-extension-v${version}.zip\` from **Assets** below and unzip it.`,
      '2. Open `chrome://extensions` in Chrome and enable **Developer mode**.',
      '3. Click **Load unpacked** and select the extracted folder (or reload the existing extension).',
    ].join('\n')
  );

  if (repo && prevTag) {
    sections.push(`**Full Changelog**: https://github.com/${repo}/compare/${prevTag}...${tag}`);
  }

  return `${sections.join('\n\n')}\n`;
}

function main() {
  const version = (getArg('--version') || '1.0.0').replace(/^v/i, '');
  const tag = getArg('--tag') || `v${version}`;
  const repo = getArg('--repo') || process.env.GITHUB_REPOSITORY || null;
  const outPath = getArg('--out') || path.join(RELEASE_DIR, 'RELEASE_NOTES.md');

  const markdown = buildNotes(tag, version, repo);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, markdown, 'utf-8');
  console.log(`Generated release notes at ${path.relative(ROOT_DIR, outPath)}`);
}

main();
