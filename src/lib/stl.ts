import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { Vector3 } from 'three'

export type ExtractedStlMetrics = {
  lengthMm: number
  widthMm: number
  heightMm: number
}

export async function extractStlMetricsFromFile(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase()

  if (extension !== 'stl') {
    return null
  }

  const loader = new STLLoader()
  const geometry = loader.parse(await file.arrayBuffer())
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
