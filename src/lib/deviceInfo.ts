import { UAParser } from 'ua-parser-js';

// Hints the client can voluntarily report about itself. None of these need a
// permission prompt (unlike navigator.geolocation), so they're safe to send
// silently alongside the subscription.
export interface ClientDeviceHints {
  timezone?: unknown;
  screenWidth?: unknown;
  screenHeight?: unknown;
  pixelRatio?: unknown;
  viewportWidth?: unknown;
  viewportHeight?: unknown;
  platform?: unknown;
  hardwareConcurrency?: unknown;
  deviceMemory?: unknown;
  touchPoints?: unknown;
  colorScheme?: unknown;
  connectionType?: unknown;
}

export interface DeviceInfo {
  ua: string | null;
  os: { name: string | null; version: string | null };
  browser: { name: string | null; version: string | null };
  engine: string | null;
  deviceType: string; // 'mobile' | 'tablet' | 'desktop' | ...
  vendor: string | null;
  model: string | null;
  modelGuess: string | null; // best-effort, see guessIphoneModel below
  // True when os.version is known-unreliable — see isIosVersionFrozen below.
  osVersionFrozen: boolean;
  // Human-readable one-liner, e.g. "iPhone 14 Pro/15/15 Pro · iOS 17.4 · Safari 17.4"
  label: string;
  timezone: string | null;
  platform: string | null;
  screen: { width: number | null; height: number | null; pixelRatio: number | null } | null;
  viewport: { width: number | null; height: number | null } | null;
  hardwareConcurrency: number | null;
  deviceMemory: number | null;
  touchPoints: number | null;
  colorScheme: 'light' | 'dark' | null;
  connectionType: string | null;
}

function clip(value: string | null | undefined, max = 100): string | null {
  if (typeof value !== 'string' || !value) {
    return null;
  }
  return value.length > max ? value.slice(0, max) : value;
}

function clipUnknown(value: unknown, max = 100): string | null {
  return typeof value === 'string' ? clip(value, max) : null;
}

function clampInt(value: unknown, max = 100000): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }
  return Math.max(0, Math.min(max, Math.round(value)));
}

function clampFloat(value: unknown, max = 20): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }
  return Math.round(Math.max(0, Math.min(max, value)) * 100) / 100;
}

// Best-effort iPhone model guess from CSS screen size + device pixel ratio.
// iOS Safari's User-Agent deliberately omits the specific model — Apple
// treats it as fingerprinting surface, so ua-parser-js only ever sees
// vendor="Apple", model="iPhone". Several generations share identical
// screen specs, so this can only narrow to a short list, never a single
// certain answer. w/h below are CSS points in portrait orientation
// (screen.width/height, smaller value first).
const IPHONE_SCREEN_TABLE: { w: number; h: number; ratio: number; models: string }[] = [
  { w: 320, h: 480, ratio: 2, models: 'iPhone 4/4s' },
  { w: 320, h: 568, ratio: 2, models: 'iPhone 5/5s/5c/SE (1st gen)' },
  { w: 375, h: 667, ratio: 2, models: 'iPhone 6/6s/7/8/SE (2nd/3rd gen)' },
  { w: 414, h: 736, ratio: 3, models: 'iPhone 6+/6s+/7+/8+' },
  { w: 375, h: 812, ratio: 3, models: 'iPhone X/XS/11 Pro or 12 mini/13 mini' },
  { w: 414, h: 896, ratio: 2, models: 'iPhone XR/11' },
  { w: 414, h: 896, ratio: 3, models: 'iPhone XS Max/11 Pro Max' },
  { w: 390, h: 844, ratio: 3, models: 'iPhone 12/12 Pro/13/13 Pro/14' },
  { w: 428, h: 926, ratio: 3, models: 'iPhone 12 Pro Max/13 Pro Max/14 Plus' },
  { w: 393, h: 852, ratio: 3, models: 'iPhone 14 Pro/15/15 Pro/16/16 Pro' },
  { w: 430, h: 932, ratio: 3, models: 'iPhone 14 Pro Max/15 Plus/15 Pro Max/16 Plus/16 Pro Max' },
  { w: 402, h: 874, ratio: 3, models: 'iPhone 16e' },
];

function guessIphoneModel(
  screenWidth: number | null,
  screenHeight: number | null,
  pixelRatio: number | null
): string | null {
  if (screenWidth === null || screenHeight === null || pixelRatio === null) {
    return null;
  }
  const w = Math.min(screenWidth, screenHeight);
  const h = Math.max(screenWidth, screenHeight);
  const match = IPHONE_SCREEN_TABLE.find(
    (entry) => entry.w === w && entry.h === h && Math.round(entry.ratio) === Math.round(pixelRatio)
  );
  return match ? match.models : null;
}

// Starting with Safari 26 (shipped with iOS/iPadOS 26, Sept 2025), Apple
// freezes the OS version reported in Safari's User-Agent string at "18.6"
// (the last version before 26) to reduce fingerprinting — regardless of the
// device's real OS version. Only Safari itself does this: other iOS
// browsers (Chrome/Firefox/Edge) still report the real OS version, and
// ua-parser-js gives them a distinct browser name, so this check naturally
// only fires for actual Safari.
const IOS_FROZEN_UA_VERSION = '18.6';

function isIosVersionFrozen(osName: string | null, osVersion: string | null, browserName: string | null): boolean {
  if (!osName || !/ios|ipados/i.test(osName)) {
    return false;
  }
  if (!osVersion || !osVersion.startsWith(IOS_FROZEN_UA_VERSION)) {
    return false;
  }
  return !!browserName && /safari/i.test(browserName);
}

function buildLabel(input: {
  osName: string | null;
  osVersion: string | null;
  osVersionFrozen: boolean;
  browserName: string | null;
  browserVersion: string | null;
  deviceType: string;
  vendor: string | null;
  model: string | null;
  modelGuess: string | null;
}): string {
  const { osName, osVersion, osVersionFrozen, browserName, browserVersion, deviceType, vendor, model, modelGuess } =
    input;

  let deviceLabel: string | null = null;
  if (modelGuess) {
    deviceLabel = modelGuess;
  } else if (vendor && model) {
    deviceLabel = `${vendor} ${model}`;
  } else if (model) {
    deviceLabel = model;
  } else if (['mobile', 'tablet', 'wearable', 'console', 'smarttv'].includes(deviceType)) {
    deviceLabel = deviceType.charAt(0).toUpperCase() + deviceType.slice(1);
  }

  let osLabel: string | null = osName ? [osName, osVersion].filter(Boolean).join(' ') : null;
  if (osVersionFrozen && osName) {
    // From iOS/iPadOS 26 onward Apple ships matching major version numbers
    // for the OS and Safari (Safari 26 <-> iOS 26), so Safari's own version
    // — which is NOT frozen — is our best available proxy for the real OS
    // major version.
    const browserMajor = browserVersion ? parseInt(browserVersion, 10) : null;
    osLabel =
      browserMajor && browserMajor >= 26
        ? `${osName} ${browserMajor}+ (versione esatta nascosta da Apple)`
        : `${osName} 26+ (versione esatta nascosta da Apple)`;
  }
  const browserLabel = browserName ? [browserName, browserVersion].filter(Boolean).join(' ') : null;

  return [deviceLabel, osLabel, browserLabel].filter(Boolean).join(' · ') || 'Dispositivo sconosciuto';
}

/**
 * Builds a sanitized device/browser fingerprint from the request's
 * User-Agent (authoritative, can't be spoofed by editing the page) and
 * whatever extra client hints were volunteered (best-effort, capped in size
 * so an attacker can't stuff arbitrary data into the document).
 */
export function buildDeviceInfo(userAgent: string | null, rawHints: unknown): DeviceInfo {
  const parsed = new UAParser(userAgent ?? undefined).getResult();
  const h = (rawHints && typeof rawHints === 'object' ? rawHints : {}) as ClientDeviceHints;

  const screenWidth = clampInt(h.screenWidth, 20000);
  const screenHeight = clampInt(h.screenHeight, 20000);
  const viewportWidth = clampInt(h.viewportWidth, 20000);
  const viewportHeight = clampInt(h.viewportHeight, 20000);
  const pixelRatio = clampFloat(h.pixelRatio);

  const osName = clip(parsed.os.name);
  const osVersion = clip(parsed.os.version, 30);
  const browserName = clip(parsed.browser.name);
  const browserVersion = clip(parsed.browser.version, 30);
  const deviceType = clip(parsed.device.type) ?? 'desktop';
  const vendor = clip(parsed.device.vendor);
  const model = clip(parsed.device.model);

  // Only worth guessing for iOS where the UA hides the real model; on
  // Android/others ua-parser-js already extracts a real model most of the time.
  const isIOS = !!osName && /ios|ipados/i.test(osName);
  const modelGuess = isIOS ? guessIphoneModel(screenWidth, screenHeight, pixelRatio) : null;
  const osVersionFrozen = isIosVersionFrozen(osName, osVersion, browserName);

  return {
    ua: clip(userAgent, 512),
    os: { name: osName, version: osVersion },
    browser: { name: browserName, version: browserVersion },
    engine: clip(parsed.engine.name),
    deviceType,
    vendor,
    model,
    modelGuess,
    osVersionFrozen,
    label: buildLabel({
      osName,
      osVersion,
      osVersionFrozen,
      browserName,
      browserVersion,
      deviceType,
      vendor,
      model,
      modelGuess,
    }),
    timezone: clipUnknown(h.timezone, 60),
    platform: clipUnknown(h.platform, 60),
    screen:
      screenWidth !== null || screenHeight !== null
        ? { width: screenWidth, height: screenHeight, pixelRatio }
        : null,
    viewport:
      viewportWidth !== null || viewportHeight !== null
        ? { width: viewportWidth, height: viewportHeight }
        : null,
    hardwareConcurrency: clampInt(h.hardwareConcurrency, 128),
    deviceMemory: clampFloat(h.deviceMemory, 1024),
    touchPoints: clampInt(h.touchPoints, 50),
    colorScheme: h.colorScheme === 'dark' || h.colorScheme === 'light' ? h.colorScheme : null,
    connectionType: clipUnknown(h.connectionType, 30),
  };
}
