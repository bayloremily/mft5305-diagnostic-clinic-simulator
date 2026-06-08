import { PanoramaViewer } from './PanoramaViewer'

const LOBBY_IMAGE_PATH = '/assets/Lobby.png'

const LOBBY_DOOR_HOTSPOTS = [
  { id: 'patient-1', yaw: 68, pitch: -4 },
  { id: 'patient-2', yaw: 80, pitch: -5 },
  { id: 'patient-3', yaw: 92, pitch: -5 },
  { id: 'patient-4', yaw: 108, pitch: -4 },
  { id: 'patient-5', yaw: 122, pitch: -4 },
  { id: 'patient-6', yaw: 138, pitch: -3 },
]

export function LobbyScene({ cases, caseStates, onHotspotClick, showHotspots = true }) {
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
    pitch: 10,
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
      showHotspots={showHotspots}
    />
  )
}
