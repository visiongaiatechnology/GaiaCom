// STATUS: DIAMANT VGT SUPREME
import { isTrustedDesktopLocation } from './api';

describe('desktop runtime origin boundary', () => {
  test.each([
    ['tauri:', 'localhost'],
    ['file:', ''],
    ['http:', 'tauri.localhost'],
    ['https:', 'tauri.localhost']
  ])('accepts trusted desktop location %s//%s', (protocol, hostname) => {
    expect(isTrustedDesktopLocation({ protocol, hostname })).toBe(true);
  });

  test.each([
    ['https:', 'evil-tauri.example'],
    ['https:', 'tauri.localhost.attacker.example'],
    ['http:', 'localhost'],
    ['https:', 'beta.gaiacom.de'],
    ['javascript:', '']
  ])('rejects web location %s//%s', (protocol, hostname) => {
    expect(isTrustedDesktopLocation({ protocol, hostname })).toBe(false);
  });
});
