import { Suspense, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Html, OrbitControls, useTexture } from '@react-three/drei'
import * as THREE from 'three'

function degreesToSpherePosition(yaw, pitch, radius = 9.7) {
  const yawRadians = THREE.MathUtils.degToRad(yaw)
  const pitchRadians = THREE.MathUtils.degToRad(pitch)

  return [
    radius * Math.sin(yawRadians) * Math.cos(pitchRadians),
    radius * Math.sin(pitchRadians),
    -radius * Math.cos(yawRadians) * Math.cos(pitchRadians),
  ]
}

function useImageStatus(src) {
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    let cancelled = false
    const image = new Image()

    image.onload = () => {
      if (!cancelled) {
        setStatus('loaded')
      }
    }

    image.onerror = () => {
      if (!cancelled) {
        setStatus('error')
      }
    }

    image.src = src

    return () => {
      cancelled = true
    }
  }, [src])

  return status
}

function PanoramaSphere({ imagePath }) {
  const texture = useTexture(imagePath)

  return (
    <mesh scale={[-1, 1, 1]}>
      <sphereGeometry args={[10, 64, 64]} />
      <meshBasicMaterial map={texture} side={THREE.BackSide} />
    </mesh>
  )
}

function PanoramaHotspot({ hotspot, explored, onClick }) {
  const position = degreesToSpherePosition(hotspot.yaw, hotspot.pitch)
  const [isHovered, setIsHovered] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const shouldShowLabel = hotspot.labelMode === 'always' || isHovered || isFocused
  const isComplete = hotspot.completed ?? explored
  const variantClass = hotspot.variant === 'door' ? 'is-door' : hotspot.variant === 'desk' ? 'is-desk' : ''

  return (
    <group position={position}>
      <Html transform sprite distanceFactor={10} position={[0, 0, 0]}>
        <button
          type="button"
          className={`panorama-hotspot ${variantClass} ${isComplete ? 'is-complete' : ''}`}
          onClick={onClick}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        >
          <span className="panorama-hotspot-marker" aria-hidden="true" />
          {isComplete && <span className="panorama-hotspot-check" aria-hidden="true">✓</span>}
          {shouldShowLabel && <span className="panorama-hotspot-label">{hotspot.label}</span>}
        </button>
      </Html>
    </group>
  )
}

export function PanoramaViewer({
  imagePath,
  loadingText,
  errorText,
  hotspots,
  exploredHotspotIds = [],
  onHotspotClick,
}) {
  const imageStatus = useImageStatus(imagePath)

  if (imageStatus === 'error') {
    return <div className="scene-error">{errorText}</div>
  }

  if (imageStatus === 'loading') {
    return <div className="scene-fallback">{loadingText}</div>
  }

  return (
    <Canvas camera={{ position: [0, 0, 0.1], fov: 72 }}>
      <Suspense
        fallback={
          <Html center>
            <div className="scene-fallback">{loadingText}</div>
          </Html>
        }
      >
        <ambientLight intensity={1.2} />
        <pointLight position={[0, 3, 0]} intensity={0.35} color="#fff5de" />
        <PanoramaSphere imagePath={imagePath} />

        {hotspots.map((hotspot) => (
          <PanoramaHotspot
            key={hotspot.id}
            hotspot={hotspot}
            explored={exploredHotspotIds.includes(hotspot.id)}
            onClick={() => onHotspotClick(hotspot.id)}
          />
        ))}

        <OrbitControls
          enablePan={false}
          enableZoom
          enableDamping
          dampingFactor={0.1}
          rotateSpeed={0.45}
          minDistance={0.1}
          maxDistance={0.65}
          minPolarAngle={0.3}
          maxPolarAngle={Math.PI - 0.3}
          target={[0, 0, 0]}
        />
      </Suspense>
    </Canvas>
  )
}
