import { PanoramaViewer } from './PanoramaViewer'
import { buildLobbyHotspots } from '../lib/roomHotspots'

const LOBBY_IMAGE_PATH = '/assets/Lobby.png'

export function LobbyScene({
  cases,
  caseStates,
  onHotspotClick,
  showHotspots = true,
  authorMode = false,
  authorHotspots = [],
  selectedHotspotId = null,
  draggingHotspotId = null,
  onAuthorCreateHotspot,
  onAuthorMoveHotspot,
  onAuthorDragStart,
  onAuthorDragEnd,
}) {
  const hotspots = authorMode
    ? authorHotspots.map((hotspot) => ({
        id: hotspot.id,
        label: hotspot.label || hotspot.name,
        yaw: hotspot.yaw,
        pitch: hotspot.pitch,
        variant: hotspot.variant,
        labelMode: 'always',
      }))
    : buildLobbyHotspots(cases, caseStates)

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
      authorMode={authorMode}
      selectedHotspotId={selectedHotspotId}
      draggingHotspotId={draggingHotspotId}
      onAuthorCreateHotspot={onAuthorCreateHotspot}
      onAuthorMoveHotspot={onAuthorMoveHotspot}
      onAuthorDragStart={onAuthorDragStart}
      onAuthorDragEnd={onAuthorDragEnd}
    />
  )
}
