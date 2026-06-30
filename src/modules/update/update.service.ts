import { Capacitor, registerPlugin } from '@capacitor/core'

export const APP_VERSION_CODE = 6
export const APP_VERSION_NAME = '1.5'
export const UPDATE_FEED_URL = 'https://raw.githubusercontent.com/everton191/editor-de-video/main/downloads/update.json'

type VideoLabUpdatePlugin = {
  downloadAndInstall(options: { url: string; versionCode: number }): Promise<{
    upToDate?: boolean
    installedVersionCode?: number
    downloadedVersionCode?: number
    apkPath?: string
  }>
}

export type UpdateManifest = {
  versionCode: number
  versionName: string
  apkUrl: string
  apkFile?: string
  notes?: string[]
}

export type UpdateStatus = {
  state: 'idle' | 'checking' | 'available' | 'downloading' | 'up-to-date' | 'unsupported' | 'error'
  message: string
  manifest?: UpdateManifest
}

const VideoLabUpdate = registerPlugin<VideoLabUpdatePlugin>('VideoLabUpdate')
const LAST_AUTO_UPDATE_KEY = 'videolab:last-auto-update-version'

export async function checkForAndroidUpdate(autoInstall = true): Promise<UpdateStatus> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
    return { state: 'unsupported', message: 'Atualizacao automatica disponivel apenas no APK Android.' }
  }

  const manifest = await fetchUpdateManifest()
  if (manifest.versionCode <= APP_VERSION_CODE) {
    return { state: 'up-to-date', message: 'Voce esta na versao mais recente.', manifest }
  }

  if (!autoInstall) {
    return { state: 'available', message: `Atualizacao ${manifest.versionName} disponivel.`, manifest }
  }

  const lastAutoUpdate = localStorage.getItem(LAST_AUTO_UPDATE_KEY)
  if (lastAutoUpdate === String(manifest.versionCode)) {
    return { state: 'available', message: `Atualizacao ${manifest.versionName} disponivel.`, manifest }
  }

  localStorage.setItem(LAST_AUTO_UPDATE_KEY, String(manifest.versionCode))
  await VideoLabUpdate.downloadAndInstall({ url: manifest.apkUrl, versionCode: manifest.versionCode })
  return { state: 'downloading', message: 'Atualizacao baixada. Confirme a instalacao do APK.', manifest }
}

export async function installAndroidUpdate(manifest: UpdateManifest): Promise<UpdateStatus> {
  await VideoLabUpdate.downloadAndInstall({ url: manifest.apkUrl, versionCode: manifest.versionCode })
  return { state: 'downloading', message: 'Atualizacao baixada. Confirme a instalacao do APK.', manifest }
}

async function fetchUpdateManifest(): Promise<UpdateManifest> {
  const response = await fetch(`${UPDATE_FEED_URL}?t=${Date.now()}`, { cache: 'no-store' })
  if (!response.ok) {
    throw new Error(`Falha ao consultar atualizacao: HTTP ${response.status}`)
  }
  const manifest = await response.json() as UpdateManifest
  if (!Number.isFinite(manifest.versionCode) || !manifest.versionName || !manifest.apkUrl) {
    throw new Error('Feed de atualizacao invalido.')
  }
  return manifest
}
