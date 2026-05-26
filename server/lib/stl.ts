import fs from 'node:fs/promises'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { Vector3 } from 'three'

export type ExtractedStlMetrics = {
  lengthMm: number
  widthMm: number
  heightMm: number
}

function arrayBufferFromNodeBuffer(buffer: Buffer) {
  return Uint8Array.from(buffer).buffer
}

export async function extractStlMetricsFromFile(filePath: string) {
  const loader = new STLLoader()
  const fileBuffer = await fs.readFile(filePath)
  const geometry = loader.parse(arrayBufferFromNodeBuffer(fileBuffer))
  geometry.computeBoundingBox()

  if (!geometry.boundingBox) {
    return null
  }

  const size = geometry.boundingBox.getSize(new Vector3())
  return {
    lengthMm: Math.round(size.x),
    widthMm: Math.round(size.y),
    heightMm: Math.round(size.z),
  } satisfies ExtractedStlMetrics
}
