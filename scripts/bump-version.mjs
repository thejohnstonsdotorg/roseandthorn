#!/usr/bin/env node
/**
 * scripts/bump-version.mjs
 *
 * Keeps expo.version (app.json) and version (package.json) in sync.
 *
 * Usage:
 *   node scripts/bump-version.mjs [major|minor|patch]
 *   node scripts/bump-version.mjs 1.2.3   (set explicit version)
 *
 * Also invoked automatically by `npm version <bump>` via the "version" script
 * hook in package.json. In that case npm passes the new semver via the
 * npm_package_version environment variable, so no argument is needed.
 *
 * EAS Build handles versionCode (android) / buildNumber (ios) auto-increment.
 * Do NOT manually set versionCode here.
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

function writeJson(file, obj) {
  writeFileSync(file, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

function semverBump(current, bump) {
  const [major, minor, patch] = current.split('.').map(Number);
  switch (bump) {
    case 'major': return `${major + 1}.0.0`;
    case 'minor': return `${major}.${minor + 1}.0`;
    case 'patch': return `${major}.${minor}.${patch + 1}`;
    default:
      // explicit version string like "1.2.3"
      if (/^\d+\.\d+\.\d+$/.test(bump)) return bump;
      throw new Error(`Unknown bump type: "${bump}". Use major | minor | patch | X.Y.Z`);
  }
}

const appJsonPath = resolve(root, 'app.json');
const pkgJsonPath = resolve(root, 'package.json');

const appJson = readJson(appJsonPath);
const pkgJson = readJson(pkgJsonPath);

const currentVersion = appJson.expo.version;

// When called from `npm version`, npm has already bumped package.json and
// exposes the new version in npm_package_version.
const newVersion =
  process.env.npm_package_version ??
  semverBump(currentVersion, process.argv[2] ?? 'patch');

if (newVersion === currentVersion) {
  console.log(`Version already at ${currentVersion} — nothing to do.`);
  process.exit(0);
}

appJson.expo.version = newVersion;
pkgJson.version = newVersion;

writeJson(appJsonPath, appJson);
writeJson(pkgJsonPath, pkgJson);

console.log(`Bumped ${currentVersion} → ${newVersion}`);
console.log('  app.json  expo.version updated');
console.log('  package.json version updated');
console.log('  (versionCode will be auto-incremented by EAS Build)');
