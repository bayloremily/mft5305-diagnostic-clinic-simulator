import { PanoramaViewer } from './PanoramaViewer'

const LOBBY_IMAGE_PATH = '/assets/Lobby.png'

const LOBBY_DOOR_HOTSPOTS = [
  { id: 'patient-1', yaw: -50, pitch: -4 },
  { id: 'patient-2', yaw: -31, pitch: -4 },
  { id: 'patient-3', yaw: -12, pitch: -4 },
  { id: 'patient-4', yaw: 9, pitch: -4 },
  { id: 'patient-5', yaw: 28, pitch: -4 },
  { id: 'patient-6', yaw: 47, pitch: -4 },
]

export function LobbyScene({ cases, caseStates, onSelectRoom }) {
  const hotspots = cases.map((caseItem, index) => ({
    id: caseItem.id,
    label: caseStates[caseItem.id].completed ? `Patient ${caseItem.patientNumber} Done` : `Patient ${caseItem.patientNumber}`,
    yaw: LOBBY_DOOR_HOTSPOTS[index]?.yaw ?? 0,
    pitch: LOBBY_DOOR_HOTSPOTS[index]?.pitch ?? -4,
  }))

  const exploredHotspotIds = cases.filter((caseItem) => caseStates[caseItem.id].completed).map((caseItem) => caseItem.id)

  return (
    <PanoramaViewer
      imagePath={LOBBY_IMAGE_PATH}
      loadingText="Loading 360 hospital lobby..."
      errorText="The lobby panorama could not be loaded. Check /public/assets/Lobby.png."
      hotspots={hotspots}
      exploredHotspotIds={exploredHotspotIds}
      onHotspotClick={onSelectRoom}
      title="Diagnostic Clinic Lobby"
      subtitle="Drag to look around and select a patient room door."
    />
  )
}
