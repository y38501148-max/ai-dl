import { copyFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import packageInfo from '../package.json' with { type: 'json' }

const appName = 'muz-test'
const releaseName = `muz-choice-blank-bank_${packageInfo.version}`
const releaseDirectory = resolve('release', packageInfo.version)

const dmgTargets = [
  {
    source: resolve('src-tauri', 'target', 'release', 'bundle', 'dmg', `${appName}_${packageInfo.version}_aarch64.dmg`),
    target: resolve(releaseDirectory, `${releaseName}_macos-aarch64.dmg`),
  },
  {
    source: resolve(
      'src-tauri',
      'target',
      'universal-apple-darwin',
      'release',
      'bundle',
      'dmg',
      `${appName}_${packageInfo.version}_universal.dmg`,
    ),
    target: resolve(releaseDirectory, `${releaseName}_macos-universal.dmg`),
  },
]

function run(command, args, options = {}) {
  execFileSync(command, args, { stdio: 'inherit', ...options })
}

function detach(mountPoint) {
  try {
    run('hdiutil', ['detach', mountPoint])
  } catch {
    run('hdiutil', ['detach', '-force', mountPoint])
  }
}

for (const { source, target } of dmgTargets) {
  if (!existsSync(source)) continue

  const bundleDirectory = dirname(source)
  const bundleScript = resolve(bundleDirectory, 'bundle_dmg.sh')
  const volumeIcon = resolve(bundleDirectory, 'icon.icns')
  if (!existsSync(bundleScript) || !existsSync(volumeIcon)) {
    console.warn(`跳过 ${source}，缺少 Tauri DMG 布局脚本或卷图标。`)
    continue
  }

  const workDirectory = mkdtempSync(resolve(tmpdir(), 'aidl-macos-dmg-'))
  const mountPoint = resolve(workDirectory, 'mount')
  const stagingDirectory = resolve(workDirectory, 'staging')
  const appDirectory = resolve(stagingDirectory, `${appName}.app`)
  const fixedDmg = resolve(workDirectory, 'fixed.dmg')
  let mounted = false

  try {
    run('mkdir', ['-p', mountPoint, stagingDirectory])
    run('hdiutil', ['attach', source, '-readonly', '-nobrowse', '-mountpoint', mountPoint])
    mounted = true
    run('ditto', [resolve(mountPoint, `${appName}.app`), appDirectory])
    detach(mountPoint)
    mounted = false

    try {
      run('/usr/libexec/PlistBuddy', ['-c', 'Delete :LSRequiresCarbon', resolve(appDirectory, 'Contents', 'Info.plist')])
    } catch {
      // The key is absent in healthy bundles; keep the step idempotent.
    }

    run('xattr', ['-cr', appDirectory])
    run('codesign', ['--force', '--deep', '--sign', '-', appDirectory])
    run('codesign', ['--verify', '--deep', '--strict', '--verbose=2', appDirectory])

    let lastError
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      rmSync(fixedDmg, { force: true })
      try {
        run('bash', [
          bundleScript,
          '--volname',
          appName,
          '--volicon',
          volumeIcon,
          '--window-size',
          '660',
          '400',
          '--icon',
          `${appName}.app`,
          '190',
          '170',
          '--hide-extension',
          `${appName}.app`,
          '--app-drop-link',
          '470',
          '170',
          fixedDmg,
          stagingDirectory,
        ])
        lastError = undefined
        break
      } catch (error) {
        lastError = error
        if (attempt < 3) run('sleep', ['2'])
      }
    }
    if (lastError) throw lastError

    run('hdiutil', ['verify', fixedDmg])
    copyFileSync(fixedDmg, target)
    console.log(`已修复 macOS DMG：${target}`)
  } finally {
    if (mounted && existsSync(mountPoint)) {
      try {
        detach(mountPoint)
      } catch {
        // Already detached.
      }
    }
    rmSync(workDirectory, { recursive: true, force: true })
  }
}
