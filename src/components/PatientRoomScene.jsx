import { PanoramaViewer } from './PanoramaViewer'
import { buildCaseHotspots } from '../lib/roomHotspots'

const ROOM_IMAGE_BY_PATIENT = {
  1: '/assets/Patient-1.png',
  2: '/assets/Patient-2.png',
  3: '/assets/Patient-3.png',
  4: '/assets/Patient-4.png',
  5: '/assets/Patient-5.png',
  6: '/assets/Patient-6.png',
}

export function PatientRoomScene({
  caseData,
  exploredHotspots,
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
  const imagePath = ROOM_IMAGE_BY_PATIENT[caseData.patientNumber] ?? ROOM_IMAGE_BY_PATIENT[6]
  const hotspots = authorMode
    ? authorHotspots.map((hotspot) => ({
        id: hotspot.id,
        label: hotspot.label || hotspot.name,
        yaw: hotspot.yaw,
        pitch: hotspot.pitch,
        labelMode: 'always',
      }))
    : buildCaseHotspots(caseData).map((hotspot) => ({
        id: hotspot.id,
        label: hotspot.label,
        yaw: hotspot.yaw,
        pitch: hotspot.pitch,
      }))

  return (
    <PanoramaViewer
      imagePath={imagePath}
      loadingText="Loading 360 patient room..."
      errorText={`The panorama image for Patient ${caseData.patientNumber} could not be loaded.`}
      hotspots={hotspots}
      exploredHotspotIds={exploredHotspots}
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
