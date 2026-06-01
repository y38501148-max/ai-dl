import packageInfo from '../../package.json'

const LATEST_RELEASE_API_URL = 'https://api.github.com/repos/y38501148-max/AI-DL/releases/latest'
const FALLBACK_MANIFEST_URL = 'https://raw.githubusercontent.com/y38501148-max/AI-DL/main/package.json'
const RELEASE_URL = 'https://github.com/y38501148-max/AI-DL/releases'

export interface UpdateInfo {
  currentVersion: string
  latestVersion: string
  releaseUrl: string
}

interface GitHubRelease {
  name?: string
  tag_name?: string
  html_url?: string
  draft?: boolean
  prerelease?: boolean
  assets?: { name?: string }[]
}

type FetchResult<T> =
  | { ok: true; value: T }
  | { ok: false; unavailable: boolean }

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

function normalizeVersion(value: string | undefined): string | null {
  const match = value?.trim().match(/^v?(\d+(?:\.\d+){1,3})$/)
  return match?.[1] ?? null
}

async function fetchJson<T>(url: string): Promise<FetchResult<T>> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 6000)
  try {
    const response = await fetch(`${url}?t=${Date.now()}`, {
      cache: 'no-store',
      signal: controller.signal,
    })
    if (!response.ok) return { ok: false, unavailable: response.status >= 500 || response.status === 0 }
    return { ok: true, value: (await response.json()) as T }
  } catch {
    return { ok: false, unavailable: true }
  } finally {
    window.clearTimeout(timeout)
  }
}

async function checkLatestRelease(): Promise<{ checked: boolean; info: UpdateInfo | null }> {
  const result = await fetchJson<GitHubRelease>(LATEST_RELEASE_API_URL)
  if (!result.ok) return { checked: !result.unavailable, info: null }
  const release = result.value
  if (release.draft || release.prerelease || !release.assets?.length) return { checked: true, info: null }
  const latestVersion = normalizeVersion(release.name) ?? normalizeVersion(release.tag_name)
  if (!latestVersion || compareVersions(latestVersion, packageInfo.version) <= 0) return { checked: true, info: null }
  return {
    checked: true,
    info: {
      currentVersion: packageInfo.version,
      latestVersion,
      releaseUrl: release.html_url ?? RELEASE_URL,
    },
  }
}

async function checkFallbackManifest(): Promise<UpdateInfo | null> {
  const result = await fetchJson<{ version?: string }>(FALLBACK_MANIFEST_URL)
  if (!result.ok) return null
  const latestVersion = normalizeVersion(result.value.version)
  if (!latestVersion || compareVersions(latestVersion, packageInfo.version) <= 0) return null
  return {
    currentVersion: packageInfo.version,
    latestVersion,
    releaseUrl: RELEASE_URL,
  }
}

export async function checkForUpdate(): Promise<UpdateInfo | null> {
  const releaseResult = await checkLatestRelease()
  if (releaseResult.checked) return releaseResult.info
  return checkFallbackManifest()
}
