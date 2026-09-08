/** App version from package.json (injected at build time). */
export const APP_VERSION: string = __APP_VERSION__

export function versionParts(version = APP_VERSION): { number: string; channel: string | null } {
  const dash = version.indexOf('-')
  if (dash === -1) return { number: version, channel: null }
  return { number: version.slice(0, dash), channel: version.slice(dash + 1) }
}
