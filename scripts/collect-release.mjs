import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs'
import { basename, resolve } from 'node:path'
import packageInfo from '../package.json' with { type: 'json' }

const releaseDirectory = resolve('release', packageInfo.version)
const releaseName = `muz-choice-blank-bank_${packageInfo.version}`
mkdirSync(releaseDirectory, { recursive: true })

for (const file of readdirSync(releaseDirectory)) {
  if (file.startsWith('.')) continue
  rmSync(resolve(releaseDirectory, file), { force: true, recursive: true })
}

const artifactGroups = [
  ['src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release.apk', `${releaseName}_android-universal.apk`],
  ['src-tauri/gen/android/app/build/outputs/bundle/universalRelease/app-universal-release.aab', `${releaseName}_android-universal.aab`],
  [`src-tauri/target-linux-arm64/release/bundle/deb/muz-选填题库_${packageInfo.version}_arm64.deb`, `${releaseName}_linux-arm64.deb`],
  [`src-tauri/target/release/bundle/dmg/muz-选填题库_${packageInfo.version}_aarch64.dmg`, `${releaseName}_macos-aarch64.dmg`],
  [`src-tauri/target/universal-apple-darwin/release/bundle/dmg/muz-选填题库_${packageInfo.version}_universal.dmg`, `${releaseName}_macos-universal.dmg`],
  [`src-tauri/target/x86_64-pc-windows-gnu/release/bundle/nsis/muz-选填题库_${packageInfo.version}_x64-setup.exe`, `${releaseName}_windows-x64-setup.exe`],
  [`src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis/muz-选填题库_${packageInfo.version}_x64-setup.exe`, `${releaseName}_windows-x64-setup.exe`],
]

const copied = []

for (const [source, targetName] of artifactGroups) {
  if (!existsSync(source)) continue
  const target = resolve(releaseDirectory, targetName)
  copyFileSync(source, target)
  copied.push(target)
}

if (!copied.length) {
  console.error('没有找到可汇总的安装包。请先完成对应平台构建。')
  process.exit(1)
}

for (const file of readdirSync(releaseDirectory).filter((file) => !file.startsWith('.')).sort()) {
  const path = resolve(releaseDirectory, file)
  const sizeMb = (statSync(path).size / 1024 / 1024).toFixed(1)
  console.log(`${basename(path)} ${sizeMb} MB`)
}
