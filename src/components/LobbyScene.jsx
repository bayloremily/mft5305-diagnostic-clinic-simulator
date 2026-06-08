import { PanoramaViewer } from './PanoramaViewer'

const LOBBY_IMAGE_PATH = '/assets/Lobby.png'

const LOBBY_DOOR_HOTSPOTS = [
  { id: 'patient-1', yaw: 42, pitch: -5 },
  { id: 'patient-2', yaw: 50, pitch: -4 },
  { id: 'patient-3', yaw: 58, pitch: -3 },
  { id: 'patient-4', yaw: 66, pitch: -2 },
  { id: 'patient-5', yaw: 74, pitch: -1 },
  { id: 'patient-6', yaw: 82, pitch: 0 },
]

export function LobbyScene({ cases, caseStates, onHotspotClick }) {
  const hotspots = cases.map((caseItem, index) => ({
    id: caseItem.id,
    label: `Patient ${caseItem.patientNumber}`,
    yaw: LOBBY_DOOR_HOTSPOTS[index]?.yaw ?? 0,
    pitch: LOBBY_DOOR_HOTSPOTS[index]?.pitch ?? -4,
    variant: 'door',
    labelMode: 'hover',
    completed: caseStates[caseItem.id].completed,
  }))

  hotspots.push({
    id: 'instructions',
    label: 'Instructions',
    yaw: 0,
    pitch: -8,
    variant: 'desk',
    labelMode: 'hover',
  })

  const exploredHotspotIds = cases.filter((caseItem) => caseStates[caseItem.id].completed).map((caseItem) => caseItem.id)

  return (
    <PanoramaViewer
      imagePath={LOBBY_IMAGE_PATH}
      loadingText="Loading 360 hospital lobby..."
      errorText="The lobby panorama could not be loaded. Check /public/assets/Lobby.png."
      hotspots={hotspots}
      exploredHotspotIds={exploredHotspotIds}
      onHotspotClick={onHotspotClick}
      title="Diagnostic Clinic Lobby"
      subtitle="Drag to look around the hall. Click a patient room door to begin."
      titleYaw={180}
      titlePitch={31}
      subtitleYaw={180}
      subtitlePitch={25}
    />
  )
}
