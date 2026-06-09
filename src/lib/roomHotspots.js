import roomHotspotsData from '../data/roomHotspots.json'

const DEFAULT_ANCHOR_COORDINATES = {
  patient: { yaw: 0, pitch: -6 },
  chart: { yaw: 105, pitch: -8 },
  monitor: { yaw: 18, pitch: 8 },
  sink: { yaw: 58, pitch: -5 },
  bulletin: { yaw: -82, pitch: 6 },
  environment: { yaw: -42, pitch: -5 },
}

function getRoomKey(caseData) {
  return `room${caseData.patientNumber}`
}

export function getRoomHotspotCoordinates(caseData) {
  return roomHotspotsData[getRoomKey(caseData)] ?? {}
}

export function resolveHotspotCoordinates(caseData, hotspot) {
  const roomCoordinates = getRoomHotspotCoordinates(caseData)
  return roomCoordinates[hotspot.id] ?? DEFAULT_ANCHOR_COORDINATES[hotspot.anchor] ?? { yaw: 0, pitch: 0 }
}

export function buildCaseHotspots(caseData) {
  return caseData.hotspots.map((hotspot) => {
    const coordinates = resolveHotspotCoordinates(caseData, hotspot)

    return {
      id: hotspot.id,
      name: hotspot.id,
      label: hotspot.label,
      yaw: coordinates.yaw,
      pitch: coordinates.pitch,
    }
  })
}
