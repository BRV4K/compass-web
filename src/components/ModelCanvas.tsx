import { Center, OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { Vector3, type BufferGeometry } from 'three'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import type { CatalogModel, ModelPrimitive } from '../types/app'

function SceneGeometry({
  primitive,
}: {
  primitive: ModelPrimitive
}) {
  switch (primitive) {
    case 'cylinder':
      return (
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[1.1, 1.1, 0.7, 48]} />
          <meshStandardMaterial color="#5f768c" metalness={0.35} roughness={0.4} />
        </mesh>
      )
    case 'radar':
      return (
        <group>
          <mesh position={[0, 1.2, 0]} castShadow receiveShadow>
            <boxGeometry args={[2.4, 1.4, 0.18]} />
            <meshStandardMaterial color="#9fb5c8" metalness={0.25} roughness={0.35} />
          </mesh>
          <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.32, 0.32, 1.3, 32]} />
            <meshStandardMaterial color="#55697a" metalness={0.45} roughness={0.45} />
          </mesh>
          <mesh position={[0, -0.4, 0]} rotation={[0, 0, Math.PI / 4]} castShadow receiveShadow>
            <boxGeometry args={[1.4, 1.4, 0.22]} />
            <meshStandardMaterial color="#33434f" metalness={0.45} roughness={0.48} />
          </mesh>
        </group>
      )
    case 'support':
      return (
        <group>
          <mesh position={[0, 0.1, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.6, 0.24, 1.1]} />
            <meshStandardMaterial color="#6f7d68" metalness={0.18} roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.8, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.2, 0.2, 1.2, 28]} />
            <meshStandardMaterial color="#45523c" metalness={0.22} roughness={0.62} />
          </mesh>
        </group>
      )
    case 'box':
    default:
      return (
        <mesh castShadow receiveShadow rotation={[0.25, 0.45, -0.1]}>
          <boxGeometry args={[1.5, 1, 1]} />
          <meshStandardMaterial color="#7b6f68" metalness={0.25} roughness={0.55} />
        </mesh>
      )
  }
}

function StlScene({
  modelPath,
  setCanFallback,
  setIsLoading,
}: {
  modelPath: string
  setCanFallback: Dispatch<SetStateAction<boolean>>
  setIsLoading: Dispatch<SetStateAction<boolean>>
}) {
  const [geometry, setGeometry] = useState<BufferGeometry | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    const loader = new STLLoader()

    setGeometry(null)
    setError(false)
    setCanFallback(false)
    setIsLoading(true)

    loader.load(
      modelPath,
      (loadedGeometry) => {
        if (cancelled) {
          loadedGeometry.dispose()
          return
        }

        loadedGeometry.computeBoundingBox()
        const size = loadedGeometry.boundingBox
          ? loadedGeometry.boundingBox.getSize(new Vector3())
          : new Vector3()
        const maxDimension = size ? Math.max(size.x, size.y, size.z) : 0
        const scaleFactor = maxDimension > 0 ? 2.8 / maxDimension : 1

        if (scaleFactor !== 1) {
          loadedGeometry.scale(scaleFactor, scaleFactor, scaleFactor)
        }

        loadedGeometry.center()
        loadedGeometry.computeVertexNormals()
        setGeometry(loadedGeometry)
        setIsLoading(false)
      },
      undefined,
      () => {
        if (cancelled) {
          return
        }

        setError(true)
        setCanFallback(true)
        setIsLoading(false)
      },
    )

    return () => {
      cancelled = true
    }
  }, [modelPath, setCanFallback, setIsLoading])

  if (error) {
    return null
  }

  if (!geometry) {
    return null
  }

  return (
    <Center>
      <mesh geometry={geometry}>
        <meshStandardMaterial color="#8a9380" metalness={0.08} roughness={0.78} />
      </mesh>
    </Center>
  )
}

export function ModelCanvas({
  model,
  primitive,
}: {
  model: CatalogModel
  primitive: ModelPrimitive
}) {
  const [canFallbackToPrimitive, setCanFallbackToPrimitive] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const isStlModel = model.modelPath.toLowerCase().endsWith('.stl')

  return (
    <div className="viewer-panel">
      <div className="viewer-panel__header">
        <div>
          <span className="eyebrow">3D-просмотр</span>
          <h2>{model.name}</h2>
        </div>
        <div className="viewer-hint">ЛКМ: вращение, ПКМ: сдвиг, колесо: масштаб</div>
      </div>
      <div className="viewer-stage">
        {isStlModel && !canFallbackToPrimitive && isLoading ? (
          <div className="viewer-status viewer-status--inline">Загрузка STL...</div>
        ) : null}
        <Canvas camera={{ position: [6.4, 4.4, 6.6], fov: 38 }} dpr={[1, 1.5]}>
          <color attach="background" args={['#dbe6eb']} />
          <ambientLight intensity={1.2} />
          <directionalLight position={[4, 6, 5]} intensity={1.3} />
          <group position={[0, 0.3, 0]}>
            {isStlModel && !canFallbackToPrimitive ? (
              <StlScene
                modelPath={model.modelPath}
                setCanFallback={setCanFallbackToPrimitive}
                setIsLoading={setIsLoading}
              />
            ) : (
              <SceneGeometry primitive={primitive} />
            )}
          </group>
          <OrbitControls
            enablePan
            enableZoom
            autoRotate
            autoRotateSpeed={0.6}
            minDistance={2.8}
            maxDistance={18}
          />
        </Canvas>
      </div>
    </div>
  )
}
