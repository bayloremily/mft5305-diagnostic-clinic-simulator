import { Suspense, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Html, OrbitControls, Text, useTexture } from '@react-three/drei'
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

  return (
    <group position={position}>
      <mesh onClick={onClick}>
        <sphereGeometry args={[0.2, 24, 24]} />
        <meshStandardMaterial
          color={explored ? '#5f9b6d' : '#c7a53f'}
          emissive={explored ? '#346742' : '#7a6624'}
          emissiveIntensity={0.55}
        />
      </mesh>
      <mesh position={[0, -0.18, 0]} lookAt={[0, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.34, 12]} />
        <meshStandardMaterial color="#6a787d" />
      </mesh>
      <Text
        position={[0, 0.46, 0]}
        fontSize={0.2}
        maxWidth={2}
        color="#143136"
        outlineWidth={0.018}
        outlineColor="#f5fbf8"
        anchorX="center"
        anchorY="middle"
      >
        {hotspot.label}
      </Text>
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
  title,
  subtitle,
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

        {title && (
          <Text position={[0, 5.35, -6.9]} fontSize={0.46} color="#f4faf8" anchorX="center">
            {title}
          </Text>
        )}

        {subtitle && (
          <Text position={[0, 4.8, -6.9]} fontSize={0.22} color="#d8ebe3" anchorX="center">
            {subtitle}
          </Text>
        )}

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
          dampingFactor={0.08}
          rotateSpeed={-0.35}
          minDistance={0.1}
          maxDistance={0.8}
          minPolarAngle={0.3}
          maxPolarAngle={Math.PI - 0.3}
          target={[0, 0, 0]}
        />
      </Suspense>
    </Canvas>
  )
}
