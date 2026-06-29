/// <reference lib="webworker" />

import { FFmpeg } from '@ffmpeg/ffmpeg'

type WorkerRequest = {
  id: string
  audioInputs: Array<{
    data: ArrayBuffer
    duration: number
    extension: string
    start: number
    trimStart: number
    volume: number
  }>
  fps: number
  frames: ArrayBuffer[]
  quality: number
  width: number
  height: number
}

type WorkerResponse =
  | { id: string; type: 'progress'; progress: number; status: string }
  | { id: string; type: 'done'; output: ArrayBuffer; mimeType: string }
  | { id: string; type: 'error'; message: string }

const scope = self as DedicatedWorkerGlobalScope
const ffmpeg = new FFmpeg()
let loaded = false

function respond(message: WorkerResponse, transfer?: Transferable[]) {
  scope.postMessage(message, transfer || [])
}

async function loadFfmpeg(id: string) {
  if (loaded) return
  respond({ id, type: 'progress', progress: 4, status: 'Carregando FFmpeg.wasm' })
  ffmpeg.on('progress', ({ progress }) => {
    respond({ id, type: 'progress', progress: 55 + Math.round(Math.min(1, progress) * 38), status: 'Codificando MP4 com FFmpeg' })
  })
  await ffmpeg.load({
    coreURL: new URL('/ffmpeg/ffmpeg-core.js', scope.location.href).href,
    wasmURL: new URL('/ffmpeg/ffmpeg-core.wasm', scope.location.href).href,
  })
  loaded = true
}

scope.onmessage = async ({ data }: MessageEvent<WorkerRequest>) => {
  const { id, audioInputs, fps, frames, quality, width, height } = data
  try {
    await loadFfmpeg(id)
    respond({ id, type: 'progress', progress: 8, status: 'Enviando frames para o worker' })

    for (let index = 0; index < frames.length; index += 1) {
      const name = `frame_${String(index).padStart(6, '0')}.png`
      await ffmpeg.writeFile(name, new Uint8Array(frames[index]))
      if (index % 8 === 0) {
        respond({ id, type: 'progress', progress: 8 + Math.round((index / frames.length) * 42), status: 'Preparando sequencia de imagens' })
      }
    }
    for (let index = 0; index < audioInputs.length; index += 1) {
      await ffmpeg.writeFile(`audio_${index}.${audioInputs[index].extension}`, new Uint8Array(audioInputs[index].data))
    }

    const outputName = 'videolab-output.mp4'
    const audioArgs = audioInputs.flatMap((input, index) => ['-i', `audio_${index}.${input.extension}`])
    const audioFilter = buildAudioFilter(audioInputs)
    const args = [
      '-framerate',
      String(fps),
      '-i',
      'frame_%06d.png',
      ...audioArgs,
      '-vf',
      `scale=${width}:${height}:flags=lanczos,format=yuv420p`,
      ...(audioFilter ? ['-filter_complex', audioFilter.filter, '-map', '0:v', '-map', audioFilter.output] : []),
      '-c:v',
      'mpeg4',
      '-q:v',
      String(quality),
      ...(audioFilter ? ['-c:a', 'aac', '-b:a', '128k', '-shortest'] : []),
      '-movflags',
      'faststart',
      outputName,
    ]
    const exitCode = await ffmpeg.exec(args, 120000)
    if (exitCode !== 0) throw new Error(`FFmpeg finalizou com codigo ${exitCode}.`)

    const output = await ffmpeg.readFile(outputName)
    for (let index = 0; index < frames.length; index += 1) {
      await ffmpeg.deleteFile(`frame_${String(index).padStart(6, '0')}.png`).catch(() => undefined)
    }
    for (let index = 0; index < audioInputs.length; index += 1) {
      await ffmpeg.deleteFile(`audio_${index}.${audioInputs[index].extension}`).catch(() => undefined)
    }
    await ffmpeg.deleteFile(outputName).catch(() => undefined)

    const outputBytes = output instanceof Uint8Array ? output : new TextEncoder().encode(String(output))
    const buffer = outputBytes.slice().buffer
    respond({ id, type: 'done', output: buffer, mimeType: 'video/mp4' }, [buffer])
  } catch (error) {
    respond({ id, type: 'error', message: error instanceof Error ? error.message : String(error || 'Falha no FFmpeg.wasm.') })
  }
}

function buildAudioFilter(audioInputs: WorkerRequest['audioInputs']) {
  if (!audioInputs.length) return undefined
  const chains = audioInputs.map((input, index) => {
    const delayMs = Math.max(0, Math.round(input.start * 1000))
    const duration = Math.max(0.1, input.duration)
    const trimStart = Math.max(0, input.trimStart)
    return `[${index + 1}:a]atrim=start=${trimStart}:duration=${duration},asetpts=PTS-STARTPTS,adelay=${delayMs}|${delayMs},volume=${input.volume}[a${index}]`
  })
  if (audioInputs.length === 1) {
    return { filter: chains[0], output: '[a0]' }
  }
  return {
    filter: `${chains.join(';')};${audioInputs.map((_, index) => `[a${index}]`).join('')}amix=inputs=${audioInputs.length}:duration=longest:dropout_transition=0[aout]`,
    output: '[aout]',
  }
}
