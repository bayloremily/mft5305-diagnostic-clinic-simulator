import { Canvas } from '@react-three/fiber'
import { OrbitControls, RoundedBox, Text } from '@react-three/drei'

const HOTSPOT_ANCHORS = {
  patient: [-1.45, 1.95, -0.3],
  chart: [2.85, 1.18, -1.2],
  monitor: [2.85, 2.35, -2.78],
  sink: [4.25, 1.35, 1.8],
  bulletin: [-4.2, 2.35, -2.88],
  environment: [-3.4, 1.12, 2.05],
}

function Chair({ position, rotation = [0, 0, 0], color = '#7b8e98' }) {
  return (
    <group position={position} rotation={rotation}>
      <RoundedBox args={[0.8, 0.12, 0.8]} radius={0.04} position={[0, 0.46, 0]}>
        <meshStandardMaterial color={color} />
      </RoundedBox>
      <RoundedBox args={[0.8, 0.86, 0.12]} radius={0.04} position={[0, 0.94, -0.32]}>
        <meshStandardMaterial color={color} />
      </RoundedBox>
      {[
        [-0.28, 0.2, -0.26],
        [0.28, 0.2, -0.26],
        [-0.28, 0.2, 0.26],
        [0.28, 0.2, 0.26],
      ].map((leg) => (
        <mesh key={leg.join('-')} position={leg}>
          <boxGeometry args={[0.07, 0.4, 0.07]} />
          <meshStandardMaterial color="#58666f" />
        </mesh>
      ))}
    </group>
  )
}

function Bed({ blanketColor }) {
  return (
    <group position={[-1.8, 0, -0.45]}>
      <RoundedBox args={[4.2, 0.35, 2.15]} radius={0.05} position={[0, 0.42, 0]}>
        <meshStandardMaterial color="#cad4d7" />
      </RoundedBox>
      <RoundedBox args={[3.7, 0.22, 1.72]} radius={0.06} position={[0.05, 0.73, 0]}>
        <meshStandardMaterial color={blanketColor} />
      </RoundedBox>
      <RoundedBox args={[0.95, 0.14, 0.62]} radius={0.05} position={[-1.32, 0.83, 0]}>
        <meshStandardMaterial color="#f8faf9" />
      </RoundedBox>
      {[
        [-1.85, 0.16, -0.88],
        [1.85, 0.16, -0.88],
        [-1.85, 0.16, 0.88],
        [1.85, 0.16, 0.88],
      ].map((leg) => (
        <mesh key={leg.join('-')} position={leg}>
          <cylinderGeometry args={[0.06, 0.06, 0.32, 12]} />
          <meshStandardMaterial color="#6b7880" />
        </mesh>
      ))}
      <mesh position={[2.15, 0.82, 0]}>
        <boxGeometry args={[0.12, 1.02, 1.85]} />
        <meshStandardMaterial color="#6d7a83" />
      </mesh>
    </group>
  )
}

function BulletinBoard({ items, accentColor }) {
  return (
    <group position={[-4.25, 2.2, -2.9]}>
      <mesh>
        <boxGeometry args={[2.2, 1.4, 0.08]} />
        <meshStandardMaterial color="#ccb98f" />
      </mesh>
      <mesh position={[0, 0, 0.05]}>
        <boxGeometry args={[2, 1.2, 0.02]} />
        <meshStandardMaterial color="#efe4c8" />
      </mesh>
      {items.slice(0, 3).map((item, index) => (
        <group key={item} position={[-0.58 + index * 0.58, 0.18 - index * 0.18, 0.08]}>
          <mesh>
            <boxGeometry args={[0.52, 0.32, 0.02]} />
            <meshStandardMaterial color={index === 1 ? accentColor : '#fffaf1'} />
          </mesh>
          <Text position={[0, 0, 0.02]} fontSize={0.08} color="#3d3d32" maxWidth={0.45} anchorX="center" anchorY="middle">
            {item}
          </Text>
        </group>
      ))}
    </group>
  )
}

function PatientFigure({ patientVisual }) {
  return (
    <group position={[-1.4, 0.88, -0.28]} rotation={[0, Math.PI / 2.9, 0]}>
      <mesh position={[0, 0.72, 0]}>
        <capsuleGeometry args={[0.34, 0.98, 8, 16]} />
        <meshStandardMaterial color={patientVisual.top} />
      </mesh>
      <mesh position={[0.02, 1.62, 0]}>
        <sphereGeometry args={[0.36, 20, 20]} />
        <meshStandardMaterial color={patientVisual.skin} />
      </mesh>
      <mesh position={[0.02, 1.84, -0.02]}>
        <sphereGeometry args={[0.37, 18, 18, 0, Math.PI * 2, 0, Math.PI / 1.9]} />
        <meshStandardMaterial color={patientVisual.hair} />
      </mesh>
      <mesh position={[-0.08, 0.28, 0.34]} rotation={[0.12, 0, 0]}>
        <boxGeometry args={[0.32, 0.52, 0.2]} />
        <meshStandardMaterial color="#5c7681" />
      </mesh>
    </group>
  )
}

function HotspotMarker({ hotspot, explored, onClick }) {
  const position = HOTSPOT_ANCHORS[hotspot.anchor] ?? [0, 1.4, 0]

  return (
    <group position={position}>
      <mesh onClick={onClick}>
        <sphereGeometry args={[0.17, 24, 24]} />
        <meshStandardMaterial
          color={explored ? '#5f9b6d' : '#c7a53f'}
          emissive={explored ? '#346742' : '#7a6624'}
          emissiveIntensity={0.45}
        />
      </mesh>
      <mesh position={[0, 0.32, 0]}>
        <boxGeometry args={[0.06, 0.3, 0.06]} />
        <meshStandardMaterial color="#56656e" />
      </mesh>
      <Text
        position={[0, 0.62, 0]}
        fontSize={0.12}
        maxWidth={1.5}
        color="#133034"
        outlineWidth={0.015}
        outlineColor="#f6faf7"
        anchorX="center"
        anchorY="middle"
      >
        {hotspot.label}
      </Text>
    </group>
  )
}

export function PatientRoomScene({ caseData, exploredHotspots, onHotspotClick }) {
  const { roomVariant } = caseData

  return (
    <Canvas camera={{ position: [0.9, 4.8, 10.5], fov: 42 }}>
      <color attach="background" args={['#dfe8e8']} />
      <fog attach="fog" args={['#dfe8e8', 12, 22]} />
      <ambientLight intensity={1.15} />
      <directionalLight position={[5, 8, 6]} intensity={1.7} color={roomVariant.lightingColor} />
      <pointLight position={[-2.5, 4.8, 1.2]} intensity={1.1} color={roomVariant.lightingColor} />
      <pointLight position={[4.4, 3.2, -1.8]} intensity={0.5} color={roomVariant.accentColor} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[14, 12]} />
        <meshStandardMaterial color="#d4dbd9" />
      </mesh>
      <mesh position={[0, 4.25, -3.1]}>
        <boxGeometry args={[14, 8.5, 0.22]} />
        <meshStandardMaterial color="#f8fbfa" />
      </mesh>
      <mesh position={[-6.9, 4.25, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[12, 8.5, 0.22]} />
        <meshStandardMaterial color="#eef4f2" />
      </mesh>
      <mesh position={[6.9, 4.25, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[12, 8.5, 0.22]} />
        <meshStandardMaterial color="#eef4f2" />
      </mesh>
      <mesh position={[0, 8.5, 0]}>
        <boxGeometry args={[14, 0.22, 12]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>

      <mesh position={[0, 4.3, -2.95]}>
        <boxGeometry args={[14, 0.2, 0.14]} />
        <meshStandardMaterial color={roomVariant.accentColor} />
      </mesh>

      <mesh position={[3.9, 4.6, -2.95]}>
        <boxGeometry args={[3.8, 2.1, 0.08]} />
        <meshStandardMaterial color="#c8dceb" />
      </mesh>
      <mesh position={[3.9, 4.6, -2.9]}>
        <boxGeometry args={[3.45, 1.8, 0.04]} />
        <meshStandardMaterial color="#dcedf7" />
      </mesh>
      <mesh position={[3.9, 4.6, -2.86]}>
        <boxGeometry args={[0.08, 1.9, 0.06]} />
        <meshStandardMaterial color="#f7fbff" />
      </mesh>
      <mesh position={[3.9, 4.6, -2.86]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[0.08, 3.55, 0.06]} />
        <meshStandardMaterial color="#f7fbff" />
      </mesh>

      <Bed blanketColor={roomVariant.patientVisual.blanket} />
      <PatientFigure patientVisual={roomVariant.patientVisual} />

      <group position={[2.85, 0, -1.2]}>
        <RoundedBox args={[0.95, 0.95, 0.7]} radius={0.05} position={[0, 0.48, 0]}>
          <meshStandardMaterial color="#c6d0cf" />
        </RoundedBox>
        <mesh position={[0, 1.02, 0]}>
          <boxGeometry args={[0.82, 0.05, 0.56]} />
          <meshStandardMaterial color="#f8fbfa" />
        </mesh>
      </group>

      <Chair position={[1.3, 0, 2.4]} rotation={[0, -0.35, 0]} color="#8b9ea7" />
      <Chair position={[3.35, 0, 2.35]} rotation={[0, 0.28, 0]} color="#6e8271" />

      <group position={[4.55, 0, 1.75]}>
        <RoundedBox args={[2.1, 0.12, 1.05]} radius={0.04} position={[0, 0.94, 0]}>
          <meshStandardMaterial color="#d9dfdc" />
        </RoundedBox>
        <mesh position={[0, 0.52, 0]}>
          <boxGeometry args={[2.1, 0.82, 1.05]} />
          <meshStandardMaterial color="#c6d0cc" />
        </mesh>
        <mesh position={[-0.64, 0.9, 0]}>
          <cylinderGeometry args={[0.24, 0.24, 0.08, 20]} />
          <meshStandardMaterial color="#9aa7ad" />
        </mesh>
        <mesh position={[-0.64, 0.82, 0]}>
          <cylinderGeometry args={[0.16, 0.16, 0.1, 20]} />
          <meshStandardMaterial color="#dfe8ea" />
        </mesh>
        <mesh position={[0.74, 1.85, -0.38]}>
          <boxGeometry args={[0.12, 1.9, 0.12]} />
          <meshStandardMaterial color="#adb8ba" />
        </mesh>
      </group>

      <group position={[2.9, 2.4, -2.82]}>
        <mesh>
          <boxGeometry args={[1.45, 0.9, 0.08]} />
          <meshStandardMaterial color="#1c252c" />
        </mesh>
        <mesh position={[0, 0, 0.05]}>
          <boxGeometry args={[1.22, 0.68, 0.02]} />
          <meshStandardMaterial color="#9bd3e5" />
        </mesh>
      </group>

      <group position={[2.8, 1.18, -1.16]} rotation={[-0.22, 0, -0.1]}>
        <mesh>
          <boxGeometry args={[0.7, 0.05, 0.48]} />
          <meshStandardMaterial color="#222e36" />
        </mesh>
        <mesh position={[0, 0.04, 0]}>
          <boxGeometry args={[0.62, 0.01, 0.4]} />
          <meshStandardMaterial color="#f0f7fb" />
        </mesh>
      </group>

      <BulletinBoard items={roomVariant.bulletinBoardItems} accentColor={roomVariant.accentSoft} />

      <group position={[-3.4, 0.08, 2.05]}>
        <mesh position={[0, 0.58, 0]}>
          <boxGeometry args={[1.2, 0.1, 0.76]} />
          <meshStandardMaterial color="#d3d9d7" />
        </mesh>
        <mesh position={[0, 0.24, 0]}>
          <boxGeometry args={[1.2, 0.56, 0.76]} />
          <meshStandardMaterial color="#bfc9c6" />
        </mesh>
        <mesh position={[0, 1.02, 0]}>
          <boxGeometry args={[0.76, 0.18, 0.5]} />
          <meshStandardMaterial color="#8b6f29" />
        </mesh>
      </group>

      <Text position={[0, 7.32, -2.92]} fontSize={0.28} color="#264139" anchorX="center">
        {`Patient ${caseData.patientNumber}: ${caseData.patientName}`}
      </Text>
      <Text position={[0, 6.92, -2.92]} fontSize={0.15} color="#4d635f" anchorX="center">
        {`${caseData.patientAge} • ${roomVariant.lightingTone}`}
      </Text>

      {caseData.hotspots.map((hotspot) => (
        <HotspotMarker
          key={hotspot.id}
          hotspot={hotspot}
          explored={exploredHotspots.includes(hotspot.id)}
          onClick={() => onHotspotClick(hotspot.id)}
        />
      ))}

      <OrbitControls
        enablePan={false}
        minPolarAngle={0.95}
        maxPolarAngle={1.52}
        minDistance={7.8}
        maxDistance={12.5}
        target={[0, 2.1, 0]}
      />
    </Canvas>
  )
}
