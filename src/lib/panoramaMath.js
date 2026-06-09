import * as THREE from 'three'

export function degreesToSpherePosition(yaw, pitch, radius = 9.7) {
  const yawRadians = THREE.MathUtils.degToRad(yaw)
  const pitchRadians = THREE.MathUtils.degToRad(pitch)

  return [
    radius * Math.sin(yawRadians) * Math.cos(pitchRadians),
    radius * Math.sin(pitchRadians),
    -radius * Math.cos(yawRadians) * Math.cos(pitchRadians),
  ]
}
