import roomHotspotsData from '../data/roomHotspots.json'

const DEFAULT_ANCHOR_COORDINATES = {
  patient: { yaw: 0, pitch: -6 },
  chart: { yaw: 105, pitch: -8 },
  monitor: { yaw: 18, pitch: 8 },
  sink: { yaw: 58, pitch: -5 },
  bulletin: { yaw: -82, pitch: 6 },
  environment: { yaw: -42, pitch: -5 },
}

const DEFAULT_LOBBY_HOTSPOTS = [
  { id: 'patient-1', label: 'Patient 1', yaw: 68, pitch: -4, variant: 'door', labelMode: 'hover' },
  { id: 'patient-2', label: 'Patient 2', yaw: 80, pitch: -5, variant: 'door', labelMode: 'hover' },
  { id: 'patient-3', label: 'Patient 3', yaw: 92, pitch: -5, variant: 'door', labelMode: 'hover' },
  { id: 'patient-4', label: 'Patient 4', yaw: 108, pitch: -4, variant: 'door', labelMode: 'hover' },
  { id: 'patient-5', label: 'Patient 5', yaw: 122, pitch: -4, variant: 'door', labelMode: 'hover' },
  { id: 'patient-6', label: 'Patient 6', yaw: 138, pitch: -3, variant: 'door', labelMode: 'hover' },
  { id: 'instructions', label: 'Instructions', yaw: 0, pitch: 10, variant: 'desk', labelMode: 'hover' },
]

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

export function buildLobbyHotspots(cases, caseStates) {
  const savedLobbyCoordinates = roomHotspotsData.lobby ?? {}

  return DEFAULT_LOBBY_HOTSPOTS.map((hotspot) => {
    const coordinates = savedLobbyCoordinates[hotspot.id] ?? { yaw: hotspot.yaw, pitch: hotspot.pitch }
    const linkedCase = cases.find((caseItem) => caseItem.id === hotspot.id)

    return {
      id: hotspot.id,
      name: hotspot.id,
      label: linkedCase ? `Patient ${linkedCase.patientNumber}` : hotspot.label,
      yaw: coordinates.yaw,
      pitch: coordinates.pitch,
      variant: hotspot.variant,
      labelMode: hotspot.labelMode,
      completed: linkedCase ? caseStates[linkedCase.id].completed : false,
    }
  })
}
