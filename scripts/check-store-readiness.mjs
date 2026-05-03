#!/usr/bin/env node
/**
 * Repeatable Google Play readiness checks.
 *
 * Default mode reports required public-listing gaps as warnings so CI can run on
 * normal development branches. Use --strict for release tags/public launch.
 */

import { existsSync, readdirSync, readFileSync } from 'fs';
import { extname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(fileURLToPath(import.meta.url), '..', '..');
const strict = process.argv.includes('--strict');

const results = [];

function readJson(path) {
  return JSON.parse(readFileSync(resolve(root, path), 'utf8'));
}

function readText(path) {
  return readFileSync(resolve(root, path), 'utf8');
}

function check(name, ok, details = '', options = {}) {
  results.push({ name, ok, details, launchRequired: Boolean(options.launchRequired) });
}

function fileExists(path) {
  return existsSync(resolve(root, path));
}

function pngDimensions(path) {
  const abs = resolve(root, path);
  if (!existsSync(abs)) return null;

  const buffer = readFileSync(abs);
  const isPng =
    buffer.length >= 24 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47;

  if (!isPng) return null;

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function listImageFiles(path) {
  const abs = resolve(root, path);
  if (!existsSync(abs)) return [];
  return readdirSync(abs)
    .filter((file) => ['.png', '.jpg', '.jpeg'].includes(extname(file).toLowerCase()))
    .map((file) => join(path, file));
}

function listScreenshots() {
  const finalScreenshots = listImageFiles('docs/store-assets/screenshots');
  const rawScreenshots = listImageFiles('docs/store-assets/screenshots/raw');
  return finalScreenshots.length > 0 ? finalScreenshots : rawScreenshots;
}

const appJson = readJson('app.json');
const packageJson = readJson('package.json');
const easJson = readJson('eas.json');
const listingJson = fileExists('docs/store-assets/listing.json')
  ? readJson('docs/store-assets/listing.json')
  : null;
const privacyHtml = fileExists('docs/privacy.html') ? readText('docs/privacy.html') : '';

const expo = appJson.expo ?? {};
const android = expo.android ?? {};
const production = easJson.build?.production ?? {};
const submitProduction = easJson.submit?.production?.android ?? {};

check('app name is Rose & Thorn', expo.name === 'Rose & Thorn', `found: ${expo.name}`);
check('Android package is stable', android.package === 'com.kencjohnston.roseandthorn', `found: ${android.package}`);
check('package.json and app.json versions match', packageJson.version === expo.version, `${packageJson.version} / ${expo.version}`);
check('runtime permissions list is empty', Array.isArray(android.permissions) && android.permissions.length === 0, JSON.stringify(android.permissions));

const blockedPermissions = new Set(android.blockedPermissions ?? []);
for (const permission of [
  'android.permission.CAMERA',
  'android.permission.WRITE_EXTERNAL_STORAGE',
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.SYSTEM_ALERT_WINDOW',
]) {
  check(`blocked permission: ${permission}`, blockedPermissions.has(permission));
}

check('production build emits app bundle', production.android?.buildType === 'app-bundle', `found: ${production.android?.buildType}`);
check('production auto-increments Android versionCode', production.android?.autoIncrement === true, `found: ${production.android?.autoIncrement}`);
check('production Cloud AI flag is disabled', production.env?.EXPO_PUBLIC_ENABLE_CLOUD_AI === 'false', `found: ${production.env?.EXPO_PUBLIC_ENABLE_CLOUD_AI}`);
check('production RN new architecture override is disabled', production.env?.EXPO_NEW_ARCH_ENABLED === 'false', `found: ${production.env?.EXPO_NEW_ARCH_ENABLED}`);
check('EAS submit targets internal track by default', submitProduction.track === 'internal', `found: ${submitProduction.track}`);
check('EAS submit creates draft releases', submitProduction.releaseStatus === 'draft', `found: ${submitProduction.releaseStatus}`);

check('privacy policy file exists', fileExists('docs/privacy.html'));
check('privacy policy has contact email', /mailto:kencjohnston@gmail\.com/.test(privacyHtml));
check('privacy policy states no analytics', /No analytics or crash reporting/.test(privacyHtml));
check('privacy policy states Cloud AI is disabled in v1.0', /Cloud AI artwork \(disabled in v1\.0\)/.test(privacyHtml));
check('privacy policy describes user-initiated export', /you\s+choose\s+the\s+destination/i.test(privacyHtml));

if (listingJson) {
  check('listing short description is <= 80 chars', listingJson.shortDescription?.length > 0 && listingJson.shortDescription.length <= 80, `${listingJson.shortDescription?.length ?? 0} chars`);
  check('listing full description is present', listingJson.fullDescription?.length >= 500, `${listingJson.fullDescription?.length ?? 0} chars`);
  check('listing privacy URL is HTTPS', /^https:\/\//.test(listingJson.privacyPolicyUrl ?? ''), listingJson.privacyPolicyUrl, { launchRequired: true });
} else {
  check('listing metadata exists', false, 'docs/store-assets/listing.json missing', { launchRequired: true });
}

const icon = pngDimensions('assets/icon.png');
check('app source icon exists and is square PNG >= 512', Boolean(icon) && icon.width === icon.height && icon.width >= 512, icon ? `${icon.width}x${icon.height}` : 'missing or not PNG');

const storeIcon = pngDimensions('docs/store-assets/icon.png');
check('Play listing icon is 512x512 PNG', storeIcon?.width === 512 && storeIcon?.height === 512, storeIcon ? `${storeIcon.width}x${storeIcon.height}` : 'missing', { launchRequired: true });

const adaptiveIcon = pngDimensions('assets/adaptive-icon.png');
check('adaptive icon exists', Boolean(adaptiveIcon), adaptiveIcon ? `${adaptiveIcon.width}x${adaptiveIcon.height}` : 'missing or not PNG');

const featureGraphic = pngDimensions('docs/store-assets/feature-graphic.png');
check('feature graphic is 1024x500 PNG', featureGraphic?.width === 1024 && featureGraphic?.height === 500, featureGraphic ? `${featureGraphic.width}x${featureGraphic.height}` : 'missing', { launchRequired: true });

const screenshots = listScreenshots();
check('at least 4 phone screenshots exist', screenshots.length >= 4, `${screenshots.length} found`, { launchRequired: true });

for (const screenshot of screenshots) {
  if (extname(screenshot).toLowerCase() !== '.png') continue;
  const dimensions = pngDimensions(screenshot);
  const min = Math.min(dimensions?.width ?? 0, dimensions?.height ?? 0);
  const max = Math.max(dimensions?.width ?? 0, dimensions?.height ?? 0);
  const ratio = max / Math.max(min, 1);
  check(
    `screenshot dimensions valid: ${screenshot}`,
    Boolean(dimensions) && min >= 320 && max <= 3840 && ratio <= 2,
    dimensions ? `${dimensions.width}x${dimensions.height}` : 'missing or not PNG',
    { launchRequired: true }
  );
}

let errors = 0;
let warnings = 0;

for (const result of results) {
  if (result.ok) {
    console.log(`PASS ${result.name}${result.details ? ` (${result.details})` : ''}`);
    continue;
  }

  const shouldFail = strict || !result.launchRequired;
  if (shouldFail) {
    errors += 1;
    console.error(`FAIL ${result.name}${result.details ? ` (${result.details})` : ''}`);
  } else {
    warnings += 1;
    console.warn(`WARN ${result.name}${result.details ? ` (${result.details})` : ''}`);
  }
}

console.log('');
console.log(`Store readiness: ${results.length - errors - warnings} passed, ${warnings} warnings, ${errors} failures${strict ? ' (strict)' : ''}.`);

if (errors > 0) process.exit(1);
