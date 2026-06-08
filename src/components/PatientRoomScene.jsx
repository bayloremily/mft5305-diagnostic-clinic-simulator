import { PanoramaViewer } from './PanoramaViewer'

const ROOM_IMAGE_BY_PATIENT = {
  1: '/assets/Psychotic-Disorder.png',
  2: '/assets/Personality-Disorder.png',
  3: '/assets/Mood-Disorder.png',
  4: '/assets/Neurodevelopment.png',
  5: '/assets/Neurocognitive.png',
  6: '/assets/General-Room.png',
}

const ROOM_HOTSPOT_COORDINATES = {
  default: {
    patient: { yaw: 0, pitch: -6 },
    chart: { yaw: 105, pitch: -8 },
    monitor: { yaw: 18, pitch: 8 },
    sink: { yaw: 58, pitch: -5 },
    bulletin: { yaw: -82, pitch: 6 },
    environment: { yaw: -42, pitch: -5 },
  },
  1: {
    patient: { yaw: 6, pitch: -5 },
    chart: { yaw: 96, pitch: -8 },
  },
  2: {
    environment: { yaw: -36, pitch: -5 },
  },
  3: {
    monitor: { yaw: 24, pitch: 9 },
  },
  4: {
    bulletin: { yaw: -88, pitch: 8 },
  },
  5: {
    sink: { yaw: 62, pitch: -6 },
  },
  6: {
    patient: { yaw: -6, pitch: -6 },
  },
}

function resolveHotspotCoordinates(patientNumber, anchor) {
  return ROOM_HOTSPOT_COORDINATES[patientNumber]?.[anchor] ?? ROOM_HOTSPOT_COORDINATES.default[anchor] ?? { yaw: 0, pitch: 0 }
}

export function PatientRoomScene({ caseData, exploredHotspots, onHotspotClick }) {
  const imagePath = ROOM_IMAGE_BY_PATIENT[caseData.patientNumber] ?? ROOM_IMAGE_BY_PATIENT[6]
  const hotspots = caseData.hotspots.map((hotspot) => {
    const coordinates = resolveHotspotCoordinates(caseData.patientNumber, hotspot.anchor)
    return {
      id: hotspot.id,
      label: hotspot.label,
      yaw: coordinates.yaw,
      pitch: coordinates.pitch,
    }
  })

  return (
    <PanoramaViewer
      imagePath={imagePath}
      loadingText="Loading 360 patient room..."
      errorText={`The panorama image for Patient ${caseData.patientNumber} could not be loaded.`}
      hotspots={hotspots}
      exploredHotspotIds={exploredHotspots}
      onHotspotClick={onHotspotClick}
    />
  )
}
