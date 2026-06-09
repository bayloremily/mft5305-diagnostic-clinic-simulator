import { Suspense, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Html, OrbitControls, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { degreesToSpherePosition } from '../lib/panoramaMath'

function spherePositionToDegrees(point) {
  const normalizedPoint = point.clone().normalize()

  return {
    yaw: Number(THREE.MathUtils.radToDeg(Math.atan2(normalizedPoint.x, -normalizedPoint.z)).toFixed(2)),
    pitch: Number(THREE.MathUtils.radToDeg(Math.asin(normalizedPoint.y)).toFixed(2)),
  }
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

function PanoramaHotspot({
  hotspot,
  explored,
  onClick,
  authorMode = false,
  isSelected = false,
  onAuthorDragStart,
}) {
  const position = degreesToSpherePosition(hotspot.yaw, hotspot.pitch)
  const [isHovered, setIsHovered] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const shouldShowLabel = authorMode || hotspot.labelMode === 'always' || isHovered || isFocused
  const isComplete = hotspot.completed ?? explored
  const variantClass = hotspot.variant === 'door' ? 'is-door' : hotspot.variant === 'desk' ? 'is-desk' : ''

  return (
    <group position={position}>
      <Html transform sprite distanceFactor={10} position={[0, 0, 0]}>
        <button
          type="button"
          className={`panorama-hotspot ${variantClass} ${isComplete ? 'is-complete' : ''} ${authorMode ? 'is-author' : ''} ${isSelected ? 'is-selected' : ''}`}
          onClick={onClick}
          onPointerDown={(event) => {
            if (!authorMode) {
              return
            }

            event.stopPropagation()
            onAuthorDragStart?.(hotspot.id)
          }}
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

function PanoramaInteractionLayer({
  authorMode,
  draggingHotspotId,
  onAuthorCreateHotspot,
  onAuthorMoveHotspot,
  onAuthorDragEnd,
}) {
  useEffect(() => {
    if (!authorMode || !draggingHotspotId) {
      return undefined
    }

    const handlePointerUp = () => {
      onAuthorDragEnd?.()
    }

    window.addEventListener('pointerup', handlePointerUp)
    return () => window.removeEventListener('pointerup', handlePointerUp)
  }, [authorMode, draggingHotspotId, onAuthorDragEnd])

  return (
    <mesh
      scale={[-1, 1, 1]}
      onPointerDown={(event) => {
        if (!authorMode || draggingHotspotId) {
          return
        }

        event.stopPropagation()
        onAuthorCreateHotspot?.(spherePositionToDegrees(event.point))
      }}
      onPointerMove={(event) => {
        if (!authorMode || !draggingHotspotId) {
          return
        }

        event.stopPropagation()
        onAuthorMoveHotspot?.(draggingHotspotId, spherePositionToDegrees(event.point))
      }}
      onPointerUp={(event) => {
        if (!authorMode || !draggingHotspotId) {
          return
        }

        event.stopPropagation()
        onAuthorDragEnd?.()
      }}
    >
      <sphereGeometry args={[9.85, 64, 64]} />
      <meshBasicMaterial transparent opacity={0} side={THREE.BackSide} depthWrite={false} />
    </mesh>
  )
}

export function PanoramaViewer({
  imagePath,
  loadingText,
  errorText,
  hotspots,
  exploredHotspotIds = [],
  onHotspotClick,
  showHotspots = true,
  authorMode = false,
  selectedHotspotId = null,
  onAuthorCreateHotspot,
  onAuthorMoveHotspot,
  onAuthorDragStart,
  onAuthorDragEnd,
  draggingHotspotId = null,
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
        <PanoramaInteractionLayer
          authorMode={authorMode}
          draggingHotspotId={draggingHotspotId}
          onAuthorCreateHotspot={onAuthorCreateHotspot}
          onAuthorMoveHotspot={onAuthorMoveHotspot}
          onAuthorDragEnd={onAuthorDragEnd}
        />

        {showHotspots &&
          hotspots.map((hotspot) => (
            <PanoramaHotspot
              key={hotspot.id}
              hotspot={hotspot}
              explored={exploredHotspotIds.includes(hotspot.id)}
              onClick={() => onHotspotClick(hotspot.id)}
              authorMode={authorMode}
              isSelected={selectedHotspotId === hotspot.id}
              onAuthorDragStart={onAuthorDragStart}
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
