import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_APP_PERMISSIONS } from './installedAppsCatalog.ts';
import {
  evaluateAppLaunchPermission,
  filterInstalledApps,
  findAppByVoiceQuery,
} from './appPermissionsLogic.ts';

test('catalog contains all expected Angolan and utility apps without duplicate IDs', () => {
  const ids = new Set(DEFAULT_APP_PERMISSIONS.map((a) => a.id));
  assert.equal(ids.size, DEFAULT_APP_PERMISSIONS.length);
  assert.ok(ids.has('paypay-ao'));
  assert.ok(ids.has('unitel-money'));
  assert.ok(ids.has('hinario-umbundu'));
  assert.ok(ids.has('hinos-adventistas-pro'));
  assert.ok(ids.has('vlc'));
});

test('finds installed app from natural Portuguese voice queries and aliases', () => {
  const unitel = findAppByVoiceQuery(DEFAULT_APP_PERMISSIONS, 'UNITEL Money');
  assert.equal(unitel?.id, 'unitel-money');

  const fbLite = findAppByVoiceQuery(DEFAULT_APP_PERMISSIONS, 'Facebook Lite');
  assert.equal(fbLite?.id, 'facebook-lite');

  const ytMusic = findAppByVoiceQuery(DEFAULT_APP_PERMISSIONS, 'YouTube Music');
  assert.equal(ytMusic?.id, 'yt-music');
});

test('enforces blocked and confirmation-required launch permissions', () => {
  const paypay = DEFAULT_APP_PERMISSIONS.find((a) => a.id === 'paypay-ao')!;
  const resPay = evaluateAppLaunchPermission(paypay);
  assert.equal(resPay.allowed, true);
  assert.equal(resPay.needsConfirmation, true);

  const blockedApp = { ...paypay, canLaunchByVoice: false };
  const resBlocked = evaluateAppLaunchPermission(blockedApp);
  assert.equal(resBlocked.allowed, false);
});

test('filters apps by category and policy state', () => {
  const financeApps = filterInstalledApps(DEFAULT_APP_PERMISSIONS, {
    category: 'Finanças',
  });
  assert.ok(financeApps.some((a) => a.id === 'paypay-ao'));
  assert.ok(financeApps.some((a) => a.id === 'unitel-money'));
});
