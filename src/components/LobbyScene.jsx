import { Canvas } from '@react-three/fiber'
import { OrbitControls, RoundedBox, Text } from '@react-three/drei'

function Plant({ position }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.35, 0]}>
        <cylinderGeometry args={[0.34, 0.42, 0.7, 20]} />
        <meshStandardMaterial color="#c8d0d4" />
      </mesh>
      <mesh position={[0, 1.15, 0]}>
        <sphereGeometry args={[0.55, 18, 18]} />
        <meshStandardMaterial color="#547a46" />
      </mesh>
      <mesh position={[-0.24, 1.42, 0.12]}>
        <sphereGeometry args={[0.28, 16, 16]} />
        <meshStandardMaterial color="#6f985f" />
      </mesh>
      <mesh position={[0.24, 1.38, -0.08]}>
        <sphereGeometry args={[0.26, 16, 16]} />
        <meshStandardMaterial color="#6f985f" />
      </mesh>
    </group>
  )
}

function WaitingChair({ position, rotation = [0, 0, 0] }) {
  return (
    <group position={position} rotation={rotation}>
      <RoundedBox args={[1.15, 0.18, 1.05]} radius={0.05} position={[0, 0.5, 0]}>
        <meshStandardMaterial color="#8ca4b1" />
      </RoundedBox>
      <RoundedBox args={[1.15, 1.05, 0.18]} radius={0.05} position={[0, 1, -0.42]}>
        <meshStandardMaterial color="#9bb3bf" />
      </RoundedBox>
      {[
        [-0.44, 0.22, -0.34],
        [0.44, 0.22, -0.34],
        [-0.44, 0.22, 0.34],
        [0.44, 0.22, 0.34],
      ].map((leg) => (
        <mesh key={leg.join('-')} position={leg}>
          <boxGeometry args={[0.09, 0.44, 0.09]} />
          <meshStandardMaterial color="#5c6c77" />
        </mesh>
      ))}
    </group>
  )
}

function ReceptionDesk() {
  return (
    <group position={[-7.7, 0, -3.6]}>
      <RoundedBox args={[4.5, 1.25, 1.5]} radius={0.08} position={[0, 0.62, 0]}>
        <meshStandardMaterial color="#d9ddd9" />
      </RoundedBox>
      <RoundedBox args={[4.8, 0.18, 1.7]} radius={0.04} position={[0, 1.34, 0]}>
        <meshStandardMaterial color="#8b6f29" />
      </RoundedBox>
      <RoundedBox args={[1.4, 1, 0.4]} radius={0.04} position={[1.25, 1.12, 0.46]}>
        <meshStandardMaterial color="#f2f6f8" />
      </RoundedBox>
      <Text position={[-0.55, 1.24, 0.84]} fontSize={0.22} color="#1d3a33" anchorX="center">
        Intake Reception
      </Text>
    </group>
  )
}

function RoomDoor({ caseItem, caseState, position, onSelect }) {
  const complete = caseState.completed

  return (
    <group position={position}>
      <RoundedBox args={[2.05, 3.55, 0.22]} radius={0.08}>
        <meshStandardMaterial color="#d5dfdf" />
      </RoundedBox>
      <mesh position={[0, -0.05, 0.13]} onClick={onSelect}>
        <boxGeometry args={[1.78, 3.05, 0.1]} />
        <meshStandardMaterial color={complete ? '#4f8962' : '#3f5e73'} />
      </mesh>
      <mesh position={[0.62, -0.1, 0.2]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#d3ba66" />
      </mesh>
      <mesh position={[0, 0.98, 0.2]}>
        <boxGeometry args={[1.18, 0.42, 0.06]} />
        <meshStandardMaterial color={complete ? '#d8efdf' : '#f6f5ef'} />
      </mesh>
      <Text position={[0, 0.98, 0.25]} fontSize={0.19} color="#163027" anchorX="center" anchorY="middle">
        {`Patient ${caseItem.patientNumber}`}
      </Text>
      <Text position={[0, -1.37, 0.25]} fontSize={0.18} color="#f5fbfe" anchorX="center">
        {caseItem.patientName}
      </Text>
      {complete && (
        <>
          <mesh position={[-0.62, 1.32, 0.18]}>
            <boxGeometry args={[0.42, 0.42, 0.06]} />
            <meshStandardMaterial color="#d4b04b" />
          </mesh>
          <Text position={[-0.62, 1.32, 0.24]} fontSize={0.16} color="#183326" anchorX="center" anchorY="middle">
            DONE
          </Text>
        </>
      )}
    </group>
  )
}

function WallSign({ position, text, width = 2.8 }) {
  return (
    <group position={position}>
      <RoundedBox args={[width, 0.62, 0.08]} radius={0.04}>
        <meshStandardMaterial color="#f2f4ef" />
      </RoundedBox>
      <Text position={[0, 0, 0.08]} fontSize={0.18} color="#24463f" anchorX="center" anchorY="middle">
        {text}
      </Text>
    </group>
  )
}

export function LobbyScene({ cases, caseStates, onSelectRoom }) {
  return (
    <Canvas camera={{ position: [0, 7.8, 18], fov: 42 }}>
      <color attach="background" args={['#dce6e5']} />
      <fog attach="fog" args={['#dce6e5', 16, 34]} />
      <ambientLight intensity={1.3} />
      <directionalLight position={[6, 12, 7]} intensity={2} color="#ffffff" />
      <pointLight position={[-8, 4, -3]} intensity={0.8} color="#f2d890" />
      <pointLight position={[0, 5, -8]} intensity={0.65} color="#9fc3ba" />

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 24]} />
        <meshStandardMaterial color="#d6ddd9" />
      </mesh>

      <mesh position={[0, 4.55, -10]}>
        <boxGeometry args={[30, 9.1, 0.35]} />
        <meshStandardMaterial color="#f6f8f7" />
      </mesh>
      <mesh position={[-14.85, 4.55, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[20, 9.1, 0.35]} />
        <meshStandardMaterial color="#eef3f2" />
      </mesh>
      <mesh position={[14.85, 4.55, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[20, 9.1, 0.35]} />
        <meshStandardMaterial color="#eef3f2" />
      </mesh>
      <mesh position={[0, 9.1, 0]}>
        <boxGeometry args={[30, 0.3, 20]} />
        <meshStandardMaterial color="#fbfcfb" />
      </mesh>

      <mesh position={[0, 0.03, -1.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[24, 8.4]} />
        <meshStandardMaterial color="#c9d5ce" />
      </mesh>
      <mesh position={[0, 0.04, -1.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.1, 3.6, 4]} />
        <meshStandardMaterial color="#2f5d4f" />
      </mesh>

      <ReceptionDesk />

      <WallSign position={[-8.2, 4.8, -9.78]} text="Baylor Diagnostic Intake" width={4.4} />
      <WallSign position={[0, 6.2, -9.78]} text="Patient Hallway" width={3.6} />
      <WallSign position={[9.25, 4.8, -9.78]} text="Assessment Wing" width={3.9} />

      <mesh position={[0, 4.4, -6.2]}>
        <boxGeometry args={[24, 0.18, 0.28]} />
        <meshStandardMaterial color="#a3842c" />
      </mesh>
      <mesh position={[0, 2.25, -6.24]}>
        <boxGeometry args={[24, 4.3, 0.1]} />
        <meshStandardMaterial color="#edf2f1" />
      </mesh>

      <mesh position={[-10.5, 0.65, -6.1]}>
        <boxGeometry args={[0.2, 1.3, 7.2]} />
        <meshStandardMaterial color="#e4ece9" />
      </mesh>
      <mesh position={[10.5, 0.65, -6.1]}>
        <boxGeometry args={[0.2, 1.3, 7.2]} />
        <meshStandardMaterial color="#e4ece9" />
      </mesh>

      {[-8.3, -5.6, -2.9, 2.9, 5.6, 8.3].map((xPosition, index) => (
        <RoomDoor
          key={cases[index].id}
          caseItem={cases[index]}
          caseState={caseStates[cases[index].id]}
          position={[xPosition, 1.8, -6.05]}
          onSelect={() => onSelectRoom(cases[index].id)}
        />
      ))}

      <WaitingChair position={[-6.4, 0, 2.8]} />
      <WaitingChair position={[-3.9, 0, 2.8]} />
      <WaitingChair position={[-1.4, 0, 2.8]} />
      <WaitingChair position={[-6.4, 0, 5.2]} />
      <WaitingChair position={[-3.9, 0, 5.2]} />
      <WaitingChair position={[-1.4, 0, 5.2]} />

      <Plant position={[10.9, 0, 5.2]} />
      <Plant position={[7.9, 0, 4.6]} />

      <mesh position={[9.2, 1.1, 2.6]}>
        <boxGeometry args={[3.8, 0.22, 1.2]} />
        <meshStandardMaterial color="#f4f7f5" />
      </mesh>
      <mesh position={[9.2, 0.52, 2.6]}>
        <boxGeometry args={[3.8, 0.88, 1.2]} />
        <meshStandardMaterial color="#d3ddd9" />
      </mesh>
      <Text position={[9.2, 1.48, 2.6]} fontSize={0.17} color="#355d50" anchorX="center">
        Family Waiting
      </Text>

      <OrbitControls
        enablePan={false}
        minPolarAngle={0.95}
        maxPolarAngle={1.42}
        minDistance={13}
        maxDistance={23}
        target={[0, 2.4, -2]}
      />
    </Canvas>
  )
}
