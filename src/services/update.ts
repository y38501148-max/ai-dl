import packageInfo from '../../package.json'

const UPDATE_MANIFEST_URL = 'https://raw.githubusercontent.com/y38501148-max/AI-DL/main/package.json'
const RELEASE_URL = 'https://github.com/y38501148-max/AI-DL/releases'

export interface UpdateInfo {
  currentVersion: string
  latestVersion: string
  releaseUrl: string
}

function compareVersions(first: string, second: string): number {
  const left = first.split('.').map((item) => Number(item) || 0)
  const right = second.split('.').map((item) => Number(item) || 0)
  const length = Math.max(left.length, right.length)
  for (let index = 0; index < length; index += 1) {
    const delta = (left[index] ?? 0) - (right[index] ?? 0)
    if (delta !== 0) return delta
  }
  return 0
}

export async function checkForUpdate(): Promise<UpdateInfo | null> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 6000)
  try {
    const response = await fetch(`${UPDATE_MANIFEST_URL}?t=${Date.now()}`, {
      cache: 'no-store',
      signal: controller.signal,
    })
    if (!response.ok) return null
    const manifest = (await response.json()) as { version?: string }
    if (!manifest.version || compareVersions(manifest.version, packageInfo.version) <= 0) return null
    return {
      currentVersion: packageInfo.version,
      latestVersion: manifest.version,
      releaseUrl: RELEASE_URL,
    }
  } catch {
    return null
  } finally {
    window.clearTimeout(timeout)
  }
}
