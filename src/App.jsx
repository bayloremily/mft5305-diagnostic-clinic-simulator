import { useEffect, useRef, useState } from 'react'
import { jsPDF } from 'jspdf'
import './App.css'
import scenarioCardImage from '../assets:/eLearning Scenario Card.jpg'
import casesData from './data/cases.json'
import answerKey from './data/answerKey.json'
import { LobbyScene } from './components/LobbyScene'
import { PatientRoomScene } from './components/PatientRoomScene'
import { createScormRuntime } from './lib/scorm'
import { buildCaseHotspots, buildLobbyHotspots } from './lib/roomHotspots'

const TOTAL_SECONDS = 2.5 * 60 * 60
const REQUIRED_ASSESSMENTS = 3
const DEV_DISABLE_TIMER = false
const DEV_AUTHOR_MODE = false
const DEV_SHOW_TIMER_RESET = false
const STORAGE_KEY = 'diagnostic-clinic-simulator-state'
const TIMER_SESSION_KEY = 'diagnostic-clinic-simulator-timer'
const AUTHOR_STORAGE_KEY = 'diagnostic-clinic-simulator-author-hotspots'

function getDeveloperToolsEnabled() {
  return import.meta.env.DEV && DEV_AUTHOR_MODE
}

function getTimerResetEnabled() {
  return import.meta.env.DEV && DEV_SHOW_TIMER_RESET
}

function buildRoomKey(caseItem) {
  return `room${caseItem.patientNumber}`
}

function createAuthorHotspot(id, name, label, yaw, pitch, variant = 'default') {
  return {
    id,
    name,
    label,
    yaw,
    pitch,
    variant,
  }
}

function buildInitialAuthorRoomHotspots(caseItem) {
  return buildCaseHotspots(caseItem).map((hotspot) =>
    createAuthorHotspot(hotspot.id, hotspot.name, hotspot.label, hotspot.yaw, hotspot.pitch),
  )
}

function buildInitialAuthorHotspotsByRoom() {
  const initialCaseStates = Object.fromEntries(casesData.cases.map((caseItem) => [caseItem.id, { completed: false }]))

  return {
    lobby: buildLobbyHotspots(casesData.cases, initialCaseStates).map((hotspot) =>
      createAuthorHotspot(hotspot.id, hotspot.name, hotspot.label, hotspot.yaw, hotspot.pitch, hotspot.variant),
    ),
    ...Object.fromEntries(casesData.cases.map((caseItem) => [buildRoomKey(caseItem), buildInitialAuthorRoomHotspots(caseItem)])),
  }
}

function loadAuthorHotspots(defaultHotspotsByRoom) {
  try {
    const savedValue = window.localStorage.getItem(AUTHOR_STORAGE_KEY)
    if (!savedValue) {
      return defaultHotspotsByRoom
    }

    const parsed = JSON.parse(savedValue)
    if (!parsed || typeof parsed !== 'object') {
      return defaultHotspotsByRoom
    }

    return Object.fromEntries(
      Object.entries(defaultHotspotsByRoom).map(([roomKey, defaultHotspots]) => [
        roomKey,
        Array.isArray(parsed[roomKey]) ? parsed[roomKey] : defaultHotspots,
      ]),
    )
  } catch {
    return defaultHotspotsByRoom
  }
}

function getInitialAuthorHotspotCounter(authorHotspotsByRoom) {
  const hotspotCount = Object.values(authorHotspotsByRoom).reduce(
    (count, hotspots) => count + (Array.isArray(hotspots) ? hotspots.length : 0),
    0,
  )

  return hotspotCount + 1
}

function serializeRoomHotspots(roomKey, hotspots) {
  return JSON.stringify(
    {
      [roomKey]: Object.fromEntries(
        hotspots.map((hotspot) => [
          hotspot.id,
          {
            yaw: Number(Number(hotspot.yaw).toFixed(2)),
            pitch: Number(Number(hotspot.pitch).toFixed(2)),
          },
        ]),
      ),
    },
    null,
    2,
  )
}

function createEmptyCaseState(caseId) {
  return {
    caseId,
    synopsisViewed: false,
    exploredHotspots: [],
    diagnosis: '',
    rationale: '',
    ruleOuts: '',
    submitted: false,
    completed: false,
    submittedAt: null,
  }
}

function createDefaultState() {
  return {
    launched: false,
    phase: 'cover',
    activeCaseId: null,
    timerEndsAt: null,
    cases: Object.fromEntries(casesData.cases.map((caseItem) => [caseItem.id, createEmptyCaseState(caseItem.id)])),
  }
}

function clearAttemptStorage() {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore localStorage cleanup failures.
  }

  try {
    window.sessionStorage.removeItem(TIMER_SESSION_KEY)
  } catch {
    // Ignore sessionStorage cleanup failures.
  }
}

function getRequiredHotspotIds(caseItem) {
  return Array.isArray(caseItem.completionRequired) && caseItem.completionRequired.length > 0
    ? caseItem.completionRequired
    : caseItem.hotspots.map((hotspot) => hotspot.id)
}

function getCaseProgress(caseItem, caseState) {
  const requiredHotspotIds = getRequiredHotspotIds(caseItem)
  const exploredRequiredCount = requiredHotspotIds.filter((hotspotId) =>
    caseState.exploredHotspots.includes(hotspotId),
  ).length

  return {
    requiredHotspotIds,
    exploredRequiredCount,
    totalRequiredCount: requiredHotspotIds.length,
    roomReadyToSubmit: exploredRequiredCount === requiredHotspotIds.length,
  }
}

function getScoreSummary(state) {
  const lookup = Object.fromEntries(
    answerKey.cases.map((caseItem) => [caseItem.id, caseItem.correctDiagnosis.trim().toLowerCase()]),
  )

  const matchedCount = casesData.cases.reduce((count, caseItem) => {
    const caseState = state.cases[caseItem.id]
    return caseState.completed && caseState.diagnosis.trim().toLowerCase() === lookup[caseItem.id]
      ? count + 1
      : count
  }, 0)

  return {
    matchedCount,
    score: Math.round((matchedCount / casesData.cases.length) * 100),
  }
}

function formatRemainingTime(totalSeconds) {
  const safeSeconds = Math.max(0, totalSeconds)
  const hours = Math.floor(safeSeconds / 3600)
  const minutes = Math.floor((safeSeconds % 3600) / 60)
  const seconds = safeSeconds % 60

  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':')
}

function getTimerState(remainingSeconds) {
  if (remainingSeconds <= 120) {
    return 'critical'
  }
  if (remainingSeconds <= 600) {
    return 'danger'
  }
  if (remainingSeconds <= 1800) {
    return 'warning'
  }
  return 'normal'
}

function getTimerMessage(remainingSeconds) {
  if (remainingSeconds <= 120) {
    return '2-minute warning'
  }
  if (remainingSeconds <= 600) {
    return '10-minute warning'
  }
  if (remainingSeconds <= 1800) {
    return '30-minute warning'
  }
  return '2.5-hour clinical window'
}

function getLessonStatus({ launched, learnerPassed, allRoomsComplete }) {
  if (learnerPassed) {
    return 'passed'
  }
  if (allRoomsComplete) {
    return 'completed'
  }
  if (launched) {
    return 'incomplete'
  }
  return 'not attempted'
}

function getCompletedCases(state) {
  return casesData.cases.filter((caseItem) => state.cases[caseItem.id].completed)
}

function formatTimestamp(value) {
  return value ? new Date(value).toLocaleString() : 'Not available'
}

function sanitizeFilenameSegment(value) {
  return value.replace(/[^a-z0-9_-]+/gi, '_').replace(/^_+|_+$/g, '')
}

function buildPdfFilename(completedCases) {
  const firstCompletedCase = completedCases[0]
  const fallbackName = firstCompletedCase?.patientName?.split(/\s+/).at(-1) ?? 'Student'
  const dateStamp = new Date().toISOString().slice(0, 10)
  return `MFT5305_Diagnostic_Assessment_${sanitizeFilenameSegment(fallbackName)}_${dateStamp}.pdf`
}

function generateAssessmentPdf(completedCases, simState) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'letter',
  })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 54
  const lineHeight = 18
  const sectionGap = 14
  const footerText = 'Generated by the MFT 5305 Diagnostic Clinic Simulator'
  const accentColor = [31, 106, 85]
  const bodyColor = [23, 50, 45]
  let cursorY = margin

  const ensureSpace = (neededHeight = lineHeight) => {
    if (cursorY + neededHeight <= pageHeight - margin - 32) {
      return
    }
    doc.addPage()
    cursorY = margin
  }

  const addWrappedText = (text, options = {}) => {
    const {
      fontSize = 11,
      color = bodyColor,
      indent = 0,
      gapAfter = 8,
      width = pageWidth - margin * 2 - indent,
      fontStyle = 'normal',
    } = options

    doc.setFont('helvetica', fontStyle)
    doc.setFontSize(fontSize)
    doc.setTextColor(...color)
    const lines = doc.splitTextToSize(text, width)
    ensureSpace(lines.length * lineHeight)
    doc.text(lines, margin + indent, cursorY)
    cursorY += lines.length * lineHeight + gapAfter
  }

  const addField = (label, value) => {
    addWrappedText(`${label}:`, {
      fontSize: 11,
      fontStyle: 'bold',
      color: accentColor,
      gapAfter: 2,
    })
    addWrappedText(value || 'Not provided.', {
      fontSize: 11,
      gapAfter: 10,
    })
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(...accentColor)
  doc.text('MFT 5305 Diagnostic Clinic Simulator', margin, cursorY)
  cursorY += 24
  doc.setFontSize(15)
  doc.text('Clinical Assessment Submission', margin, cursorY)
  cursorY += 28

  addField('Completion Date', new Date().toLocaleString())
  addField('Assessments Completed', `${Math.min(completedCases.length, REQUIRED_ASSESSMENTS)} of ${REQUIRED_ASSESSMENTS}`)

  completedCases.slice(0, REQUIRED_ASSESSMENTS).forEach((caseItem, index) => {
    const caseState = simState.cases[caseItem.id]
    const reviewedEvidence = getRequiredHotspotIds(caseItem)
      .map((hotspotId) => caseItem.hotspots.find((hotspot) => hotspot.id === hotspotId)?.label)
      .filter(Boolean)

    ensureSpace(80)
    doc.setDrawColor(...accentColor)
    doc.setLineWidth(1)
    doc.line(margin, cursorY, pageWidth - margin, cursorY)
    cursorY += 18

    addWrappedText(`Patient ${caseItem.patientNumber}: ${caseItem.patientName}`, {
      fontSize: 14,
      fontStyle: 'bold',
      color: accentColor,
      gapAfter: 8,
    })
    addField('Case Synopsis', caseItem.synopsis)
    addField('Evidence Reviewed', reviewedEvidence.join('\n'))
    addField("Student's Selected Diagnosis", caseState.diagnosis)
    addField('Supporting Evidence / Clinical Rationale', caseState.rationale)
    addField('Rule-Outs / Differential Diagnostic Notes', caseState.ruleOuts)
    addField('Assessment Submitted', formatTimestamp(caseState.submittedAt))

    if (index < Math.min(completedCases.length, REQUIRED_ASSESSMENTS) - 1) {
      cursorY += sectionGap
    }
  })

  const totalPages = doc.getNumberOfPages()
  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
    doc.setPage(pageNumber)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...bodyColor)
    doc.text(footerText, margin, pageHeight - 18)
    doc.text(`Page ${pageNumber} of ${totalPages}`, pageWidth - margin, pageHeight - 18, { align: 'right' })
  }

  return {
    doc,
    filename: buildPdfFilename(completedCases),
  }
}

function App() {
  const [startup] = useState(() => {
    const scorm = createScormRuntime()
    return {
      scorm,
      connected: scorm.initialize(),
    }
  })
  const scormRef = useRef(startup.scorm)
  const [simState, setSimState] = useState(() => createDefaultState())
  const [clockNow, setClockNow] = useState(() => Date.now())
  const [selectedHotspotId, setSelectedHotspotId] = useState(null)
  const [lobbyOverlay, setLobbyOverlay] = useState(null)
  const [developerToolsEnabled] = useState(() => getDeveloperToolsEnabled())
  const [timerResetEnabled] = useState(() => getTimerResetEnabled())
  const [authorMode, setAuthorMode] = useState(false)
  const [authorHotspotsByRoom, setAuthorHotspotsByRoom] = useState(() => {
    const defaultHotspotsByRoom = buildInitialAuthorHotspotsByRoom()
    return loadAuthorHotspots(defaultHotspotsByRoom)
  })
  const [draggingAuthorHotspotId, setDraggingAuthorHotspotId] = useState(null)
  const [authorJsonPanelOpen, setAuthorJsonPanelOpen] = useState(false)
  const [authorJsonCopied, setAuthorJsonCopied] = useState(false)
  const [authorSavedAt, setAuthorSavedAt] = useState(null)
  const [authorSaveError, setAuthorSaveError] = useState('')
  const [pdfError, setPdfError] = useState('')
  const [pdfGenerating, setPdfGenerating] = useState(false)
  const authorHotspotCounterRef = useRef(getInitialAuthorHotspotCounter(authorHotspotsByRoom))

  const activeCase = casesData.cases.find((caseItem) => caseItem.id === simState.activeCaseId) ?? null
  const activeCaseState = activeCase ? simState.cases[activeCase.id] : null
  const selectedRoomHotspot = activeCase?.hotspots.find((hotspot) => hotspot.id === selectedHotspotId) ?? null

  const completedCases = getCompletedCases(simState)
  const completedRooms = completedCases.length
  const requiredAssessmentsComplete = completedRooms >= REQUIRED_ASSESSMENTS
  const timerDisabled = DEV_DISABLE_TIMER
  const completionTimestamp = requiredAssessmentsComplete
    ? Math.max(...completedCases.map((caseItem) => simState.cases[caseItem.id].submittedAt || 0))
    : null
  const timerReferenceTime = requiredAssessmentsComplete && completionTimestamp ? completionTimestamp : clockNow
  const remainingSeconds = simState.timerEndsAt
    ? Math.max(0, Math.floor((simState.timerEndsAt - timerReferenceTime) / 1000))
    : TOTAL_SECONDS
  const timerExpired = !timerDisabled && !requiredAssessmentsComplete && remainingSeconds === 0
  const simulationTimedOut = Boolean(
    !timerDisabled && simState.launched && simState.timerEndsAt && timerExpired && !requiredAssessmentsComplete,
  )
  const displayPhase = simulationTimedOut ? 'timeout' : simState.phase
  const prelaunchMode = !simState.launched
  const timerState = timerDisabled ? 'normal' : getTimerState(remainingSeconds)
  const timerMessage = requiredAssessmentsComplete
    ? 'Assessment requirement complete'
    : prelaunchMode
      ? 'Timer begins when you launch the clinic'
    : timerDisabled
      ? 'Timer Disabled (Development Mode)'
      : getTimerMessage(remainingSeconds)
  const isLobbyAuthorScene = displayPhase === 'lobby'
  const activeAuthorSceneKey = isLobbyAuthorScene ? 'lobby' : activeCase ? buildRoomKey(activeCase) : null
  const activeAuthorHotspots = activeAuthorSceneKey
    ? Array.isArray(authorHotspotsByRoom[activeAuthorSceneKey])
      ? authorHotspotsByRoom[activeAuthorSceneKey]
      : activeCase
        ? buildInitialAuthorRoomHotspots(activeCase)
        : []
    : []
  const selectedAuthorHotspot = authorMode
    ? activeAuthorHotspots.find((hotspot) => hotspot.id === selectedHotspotId) ?? null
    : null
  const scoreSummary = getScoreSummary(simState)
  const learnerPassed = requiredAssessmentsComplete && scoreSummary.score >= answerKey.passingScore
  const lessonStatus = getLessonStatus({
    launched: simState.launched,
    learnerPassed,
    allRoomsComplete: requiredAssessmentsComplete,
  })
  const hasPanoramaOverlay =
    prelaunchMode ||
    displayPhase === 'synopsis' ||
    lobbyOverlay === 'instructions' ||
    (!authorMode && Boolean(selectedRoomHotspot))
  const showPanoramaHotspots = authorMode || !hasPanoramaOverlay
  const authorExportJson = activeAuthorSceneKey ? serializeRoomHotspots(activeAuthorSceneKey, activeAuthorHotspots) : ''

  function clearAttemptScormState() {
    const scorm = scormRef.current
    if (!scorm?.isReady()) {
      return
    }

    scorm.setValue('cmi.core.lesson_location', 'lobby')
    scorm.setValue('cmi.core.lesson_status', 'not attempted')
    scorm.setValue('cmi.core.score.min', '0')
    scorm.setValue('cmi.core.score.max', '100')
    scorm.setValue('cmi.core.score.raw', '0')
    scorm.setValue('cmi.core.exit', '')
    scorm.setValue('cmi.suspend_data', '')
    scorm.commit()
  }

  useEffect(() => {
    return () => {
      startup.scorm.terminate()
    }
  }, [startup.scorm])

  useEffect(() => {
    clearAttemptStorage()
    clearAttemptScormState()
  }, [])

  useEffect(() => {
    if (timerDisabled || !simState.timerEndsAt) {
      return undefined
    }

    const updateRemainingTime = () => {
      setClockNow(Date.now())
    }

    updateRemainingTime()
    const intervalId = window.setInterval(updateRemainingTime, 1000)
    return () => window.clearInterval(intervalId)
  }, [simState.timerEndsAt, timerDisabled, requiredAssessmentsComplete])

  useEffect(() => {
    if (!authorJsonCopied) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => setAuthorJsonCopied(false), 1800)
    return () => window.clearTimeout(timeoutId)
  }, [authorJsonCopied])

  useEffect(() => {
    const scorm = scormRef.current
    if (!scorm?.isReady()) {
      return
    }

    scorm.setValue(
      'cmi.core.lesson_location',
      simState.activeCaseId ? `${displayPhase}:${simState.activeCaseId}` : displayPhase,
    )
    scorm.setValue('cmi.core.lesson_status', lessonStatus)
    scorm.setValue('cmi.core.score.min', '0')
    scorm.setValue('cmi.core.score.max', '100')
    scorm.setValue('cmi.core.score.raw', String(scoreSummary.score))
    scorm.setValue('cmi.core.exit', '')
    scorm.setValue('cmi.suspend_data', '')
    scorm.commit()
  }, [displayPhase, lessonStatus, requiredAssessmentsComplete, scoreSummary.score, simState])

  useEffect(() => {
    const handleBeforeUnload = () => {
      clearAttemptStorage()
      clearAttemptScormState()
      scormRef.current?.commit()
      scormRef.current?.terminate()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  function updateCase(caseId, updater) {
    setSimState((currentState) => ({
      ...currentState,
      cases: {
        ...currentState.cases,
        [caseId]: updater(currentState.cases[caseId]),
      },
    }))
  }

  function openInstructions() {
    setSimState((currentState) => ({
      ...currentState,
      phase: 'instructions',
    }))
  }

  function launchSimulation() {
    setSimState((currentState) => ({
      ...currentState,
      launched: true,
      phase: 'lobby',
      timerEndsAt: timerDisabled ? currentState.timerEndsAt : currentState.timerEndsAt ?? Date.now() + TOTAL_SECONDS * 1000,
    }))
  }

  function handleResetTimer() {
    if (!timerResetEnabled || !simState.launched) {
      return
    }

    const nextNow = Date.now()
    setClockNow(nextNow)
    setSimState((currentState) => ({
      ...currentState,
      activeCaseId: currentState.phase === 'timeout' ? null : currentState.activeCaseId,
      phase: currentState.phase === 'timeout' ? 'lobby' : currentState.phase,
      timerEndsAt: nextNow + TOTAL_SECONDS * 1000,
    }))
  }

  function openSynopsis(caseId) {
    if (timerExpired) {
      return
    }

    setLobbyOverlay(null)
    setSimState((currentState) => ({
      ...currentState,
      launched: true,
      activeCaseId: caseId,
      phase: 'synopsis',
      timerEndsAt: timerDisabled ? currentState.timerEndsAt : currentState.timerEndsAt ?? Date.now() + TOTAL_SECONDS * 1000,
      cases: {
        ...currentState.cases,
        [caseId]: {
          ...currentState.cases[caseId],
          synopsisViewed: true,
        },
      },
    }))
  }

  function continueToRoom() {
    setSelectedHotspotId(null)
    setSimState((currentState) => ({
      ...currentState,
      phase: 'room',
    }))
  }

  function returnToLobby() {
    setSelectedHotspotId(null)
    setLobbyOverlay(null)
    setDraggingAuthorHotspotId(null)
    setPdfError('')
    setSimState((currentState) => ({
      ...currentState,
      activeCaseId: null,
      phase: 'lobby',
    }))
  }

  function handleHotspotOpen(hotspotId) {
    if (authorMode) {
      setSelectedHotspotId(hotspotId)
      return
    }

    if (!activeCase) {
      return
    }

    setSelectedHotspotId(hotspotId)
    updateCase(activeCase.id, (caseState) => ({
      ...caseState,
      exploredHotspots: caseState.exploredHotspots.includes(hotspotId)
        ? caseState.exploredHotspots
        : [...caseState.exploredHotspots, hotspotId],
    }))
  }

  function updateAuthorScene(sceneKey, fallbackHotspots, updater) {
    setAuthorHotspotsByRoom((currentState) => {
      const currentHotspots = currentState[sceneKey] ?? fallbackHotspots
      return {
        ...currentState,
        [sceneKey]: updater(currentHotspots),
      }
    })
  }

  function enterAuthorMode() {
    if (activeAuthorSceneKey) {
      updateAuthorScene(activeAuthorSceneKey, activeAuthorHotspots, (hotspots) => hotspots)
    }

    setAuthorMode(true)
    setAuthorSaveError('')
  }

  function exitAuthorMode() {
    setAuthorMode(false)
    setSelectedHotspotId(null)
    setDraggingAuthorHotspotId(null)
    setAuthorSaveError('')
    setAuthorJsonPanelOpen(false)
  }

  function createRoomAuthorHotspot({ yaw, pitch }) {
    if (!activeAuthorSceneKey) {
      return
    }

    const nextIndex = activeAuthorHotspots.length + 1
    const nextId = `author-hotspot-${authorHotspotCounterRef.current}`
    authorHotspotCounterRef.current += 1
    const nextHotspot = createAuthorHotspot(
      nextId,
      `hotspot${nextIndex}`,
      `Hotspot ${nextIndex}`,
      yaw,
      pitch,
      isLobbyAuthorScene ? 'door' : 'default',
    )

    setSelectedHotspotId(nextId)
    updateAuthorScene(activeAuthorSceneKey, activeAuthorHotspots, (hotspots) => [...hotspots, nextHotspot])
  }

  function moveRoomAuthorHotspot(hotspotId, coordinates) {
    if (!activeAuthorSceneKey) {
      return
    }

    updateAuthorScene(activeAuthorSceneKey, activeAuthorHotspots, (hotspots) =>
      hotspots.map((hotspot) =>
        hotspot.id === hotspotId
          ? {
              ...hotspot,
              yaw: coordinates.yaw,
              pitch: coordinates.pitch,
            }
          : hotspot,
      ),
    )
  }

  function deleteRoomAuthorHotspot(hotspotId) {
    if (!activeAuthorSceneKey) {
      return
    }

    updateAuthorScene(activeAuthorSceneKey, activeAuthorHotspots, (hotspots) =>
      hotspots.filter((hotspot) => hotspot.id !== hotspotId),
    )
    setSelectedHotspotId((currentValue) => (currentValue === hotspotId ? null : currentValue))
  }

  function handleAuthorSave() {
    if (!developerToolsEnabled || !activeAuthorSceneKey) {
      return
    }

    setAuthorSaveError('')
    try {
      window.localStorage.setItem(AUTHOR_STORAGE_KEY, JSON.stringify(authorHotspotsByRoom))
      setAuthorSavedAt(Date.now())
      setAuthorJsonPanelOpen(true)
    } catch {
      setAuthorSaveError('Unable to save hotspot coordinates to localStorage.')
    }
  }

  function handleAuthorExportJson() {
    if (!activeAuthorSceneKey) {
      return
    }
    setAuthorJsonPanelOpen(true)
  }

  async function handleAuthorCopyJson() {
    try {
      await navigator.clipboard.writeText(authorExportJson)
      setAuthorJsonCopied(true)
    } catch {
      setAuthorJsonCopied(false)
    }
  }

  function handleLobbyHotspotOpen(hotspotId) {
    if (authorMode) {
      setSelectedHotspotId(hotspotId)
      return
    }

    if (!simState.launched) {
      return
    }

    if (hotspotId === 'instructions') {
      setLobbyOverlay('instructions')
      return
    }

    openSynopsis(hotspotId)
  }

  function handleDiagnosisChange(value) {
    if (!activeCase) {
      return
    }

    updateCase(activeCase.id, (caseState) => ({
      ...caseState,
      diagnosis: value,
    }))
  }

  function handleRationaleChange(value) {
    if (!activeCase) {
      return
    }

    updateCase(activeCase.id, (caseState) => ({
      ...caseState,
      rationale: value,
    }))
  }

  function handleRuleOutsChange(value) {
    if (!activeCase) {
      return
    }

    updateCase(activeCase.id, (caseState) => ({
      ...caseState,
      ruleOuts: value,
    }))
  }

  function handleDiagnosisSubmit(event) {
    event.preventDefault()
    if (!activeCase || !activeCaseState || timerExpired) {
      return
    }

    const progress = getCaseProgress(activeCase, activeCaseState)
    if (!progress.roomReadyToSubmit || !activeCaseState.diagnosis || !activeCaseState.rationale || !activeCaseState.ruleOuts) {
      return
    }

    setSelectedHotspotId(null)
    setPdfError('')
    setSimState((currentState) => {
      const nextCases = {
        ...currentState.cases,
        [activeCase.id]: {
          ...currentState.cases[activeCase.id],
          submitted: true,
          completed: true,
          submittedAt: Date.now(),
        },
      }
      const nextCompletedCount = casesData.cases.filter((caseItem) => nextCases[caseItem.id].completed).length

      return {
        ...currentState,
        cases: nextCases,
        activeCaseId: null,
        phase: nextCompletedCount >= REQUIRED_ASSESSMENTS ? 'complete' : 'lobby',
      }
    })
  }

  async function handleDownloadSubmissionPdf() {
    setPdfGenerating(true)
    setPdfError('')

    try {
      const completedCaseList = getCompletedCases(simState)
        .sort((leftCase, rightCase) => {
          const leftTimestamp = simState.cases[leftCase.id].submittedAt ?? 0
          const rightTimestamp = simState.cases[rightCase.id].submittedAt ?? 0
          return leftTimestamp - rightTimestamp
        })
        .slice(0, REQUIRED_ASSESSMENTS)

      const { doc, filename } = generateAssessmentPdf(completedCaseList, simState)
      doc.save(filename)
    } catch (error) {
      console.error('PDF generation failed:', error)
      setPdfError('We could not generate your submission PDF just now. Please try again.')
    } finally {
      setPdfGenerating(false)
    }
  }

  if (!simState.launched && simState.phase === 'cover') {
    return (
      <main className="landing-shell">
        <section className="cover-card">
          <div className="cover-copy">
            <p className="eyebrow">MFT 5305 Interactive Simulation</p>
            <h1>Diagnostic Clinic Simulator</h1>
            <p className="lead">
              Work a six-patient hospital floor, inspect every chart and bedside clue, and document clinical
              reasoning before the clock runs out.
            </p>
            <div className="cover-badges">
              <span>6 patient rooms</span>
              <span>2.5-hour timer</span>
            </div>
            <div className="button-row">
              <button type="button" onClick={openInstructions}>
                Enter Simulation
              </button>
            </div>
          </div>
          <div className="cover-stage">
            <img src={scenarioCardImage} alt="Illustrated eLearning scenario card preview" className="cover-stage-image" />
          </div>
        </section>
      </main>
    )
  }

  if (!simState.launched && simState.phase === 'instructions') {
    return (
      <main className="landing-shell">
        <section className="instruction-card">
          <p className="eyebrow">Before You Launch</p>
          <h1>Clinical Floor Instructions</h1>
          <div className="instruction-grid">
            <article>
              <h2>Objective</h2>
              <p>
                Move through the lobby and choose any three patient rooms to complete. In each selected room, review
                all required hotspots before you submit a diagnosis, supporting evidence, and differential notes.
              </p>
            </article>
            <article>
              <h2>Navigation</h2>
              <p>
                Door selections open a case-file overlay first. Inside each room, you can use either the 3D hotspots
                or the keyboard-accessible hotspot list in the side panel.
              </p>
            </article>
            <article>
              <h2>Timer</h2>
              <p>
                The simulation runs for 2.5 hours once launched. Warning states appear at 30 minutes, 10 minutes,
                and 2 minutes remaining.
              </p>
            </article>
            <article>
              <h2>Restarting</h2>
              <p>
                You may restart the simulation and complete it again at any time. When you exit or restart, your
                current answers, feedback, progress, and results will be cleared. Each new attempt begins from the
                start.
              </p>
            </article>
          </div>
          <div className="button-row">
            <button type="button" className="ghost" onClick={() => setSimState(createDefaultState())}>
              Back to Cover
            </button>
            <button type="button" onClick={launchSimulation}>
              Launch Hospital Floor
            </button>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">MFT 5305 Hospital Simulation</p>
          <h1>Diagnostic Clinic Simulator</h1>
          <p className="subtitle">
            Review clinical evidence carefully, complete any three patient assessments, and download your submission
            PDF before exiting the simulation.
          </p>
        </div>

        <div className="status-stack">
          <div className="status-cluster learner-status-cluster">
            <div className={`timer-card ${timerState}`}>
              <span>Time Remaining</span>
              <strong>{timerDisabled ? 'Timer Disabled' : formatRemainingTime(remainingSeconds)}</strong>
              <small>{timerMessage}</small>
            </div>
            <div className="mini-card">
              <span>Assessments Completed</span>
              <strong>
                {Math.min(completedRooms, REQUIRED_ASSESSMENTS)} / {REQUIRED_ASSESSMENTS}
              </strong>
              <small>{simState.activeCaseId ? `Current room: Patient ${activeCase?.patientNumber}` : 'Lobby overview'}</small>
            </div>
          </div>
          {timerResetEnabled && simState.launched && (
            <div className="dev-timer-row">
              <button type="button" className="ghost dev-timer-button" onClick={handleResetTimer}>
                Reset Timer
              </button>
            </div>
          )}
        </div>
      </header>

      <section className="workspace">
        <section className="experience-panel is-full-width">
          {developerToolsEnabled && (displayPhase === 'room' && activeCase || displayPhase === 'lobby') && (
            <section className="author-toolbar-panel">
              <div className="author-toolbar">
                <button type="button" className="ghost" onClick={enterAuthorMode} disabled={authorMode}>
                  Edit Hotspots
                </button>
                <button type="button" className="ghost" onClick={handleAuthorSave} disabled={!authorMode}>
                  Save Hotspots
                </button>
                <button type="button" className="ghost" onClick={handleAuthorExportJson} disabled={!authorMode}>
                  Export JSON
                </button>
                <button type="button" className="ghost" onClick={exitAuthorMode} disabled={!authorMode}>
                  Exit Edit Mode
                </button>
              </div>

              {authorMode && (
                <div className="author-toolbar-details">
                  <p className="author-status">
                    {authorSaveError
                      ? authorSaveError
                      : selectedAuthorHotspot
                        ? `Selected hotspot: ${selectedAuthorHotspot.name} | yaw ${selectedAuthorHotspot.yaw.toFixed(2)} | pitch ${selectedAuthorHotspot.pitch.toFixed(2)}`
                        : 'Click a hotspot to select it, drag to reposition, or click the panorama to create a new hotspot.'}
                  </p>
                  <p className="author-status">
                    {authorSavedAt
                      ? `Saved hotspot coordinates to localStorage at ${new Date(authorSavedAt).toLocaleTimeString()}.`
                      : 'Learner hotspot behavior is disabled while editing is active.'}
                  </p>
                  {selectedAuthorHotspot && (
                    <div className="author-toolbar-actions">
                      <button
                        type="button"
                        className="ghost"
                        onClick={() => deleteRoomAuthorHotspot(selectedAuthorHotspot.id)}
                      >
                        Delete Hotspot
                      </button>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          <div className={`canvas-card ${hasPanoramaOverlay ? 'has-active-overlay' : ''}`}>
            {displayPhase === 'room' && activeCase ? (
              <PatientRoomScene
                caseData={activeCase}
                exploredHotspots={activeCaseState.exploredHotspots}
                onHotspotClick={handleHotspotOpen}
                showHotspots={showPanoramaHotspots}
                authorMode={authorMode}
                authorHotspots={activeAuthorHotspots}
                selectedHotspotId={selectedHotspotId}
                draggingHotspotId={draggingAuthorHotspotId}
                onAuthorCreateHotspot={createRoomAuthorHotspot}
                onAuthorMoveHotspot={moveRoomAuthorHotspot}
                onAuthorDragStart={setDraggingAuthorHotspotId}
                onAuthorDragEnd={() => setDraggingAuthorHotspotId(null)}
              />
            ) : (
              <LobbyScene
                cases={casesData.cases}
                caseStates={simState.cases}
                onHotspotClick={handleLobbyHotspotOpen}
                showHotspots={showPanoramaHotspots}
                authorMode={authorMode}
                authorHotspots={activeAuthorHotspots}
                selectedHotspotId={selectedHotspotId}
                draggingHotspotId={draggingAuthorHotspotId}
                onAuthorCreateHotspot={createRoomAuthorHotspot}
                onAuthorMoveHotspot={moveRoomAuthorHotspot}
                onAuthorDragStart={setDraggingAuthorHotspotId}
                onAuthorDragEnd={() => setDraggingAuthorHotspotId(null)}
              />
            )}

            {prelaunchMode && (
              <>
                <div className="panorama-overlay-backdrop is-prelaunch" />
                <section className="prelaunch-panel-shell">
                  <article className="overlay-card prelaunch-panel">
                    <p className="eyebrow">① Begin</p>
                    <h2>Welcome to the Clinic Floor</h2>
                    <p className="panel-copy">
                      Review the information below before you launch the clinic. The clinic floor is visible now, but
                      patient rooms and hotspots will remain inactive until you begin the timed attempt.
                    </p>
                  </article>

                  <article className="overlay-card prelaunch-panel prelaunch-panel-wide">
                    <p className="eyebrow">② Objectives and Important Information</p>
                    <div className="prelaunch-info-grid">
                      <div>
                        <h2>Objective</h2>
                        <p>
                          Complete any three of the six patient assessments. In each selected room, review all
                          required hotspots before you submit a diagnosis, supporting evidence, and differential notes.
                        </p>
                      </div>
                      <div>
                        <h2>Navigation</h2>
                        <p>
                          Select a patient room from the clinic floor to open the case file first. After reviewing the
                          case, continue into the room and use the hotspots or accessible hotspot list to gather
                          evidence.
                        </p>
                      </div>
                      <div>
                        <h2>Timer and Completion</h2>
                        <p>
                          Your timer begins when you select Launch Clinic. Complete any three patient assessments
                          during the 2.5-hour clinical window, and download your submission PDF before exiting.
                        </p>
                      </div>
                      <div>
                        <h2>Attempt and Exit Information</h2>
                        <p>
                          Your timer begins when you select Launch Clinic. Complete any three patient assessments
                          during the 2.5-hour clinical window. If you exit or close the simulation before downloading
                          your submission PDF, all answers, progress, feedback, and results from the current attempt
                          will be permanently cleared. Reopening the simulation will begin a new attempt from the
                          start.
                        </p>
                      </div>
                    </div>
                    <div className="button-row">
                      <button type="button" onClick={launchSimulation}>
                        Launch Clinic
                      </button>
                    </div>
                  </article>
                </section>
              </>
            )}

            {displayPhase === 'room' && activeCase && (
              <button type="button" className="ghost panorama-back-button" onClick={returnToLobby}>
                Back to Lobby
              </button>
            )}

            {displayPhase === 'synopsis' && activeCase && (
              <>
                <div className="panorama-overlay-backdrop" />
                <section className="overlay-card synopsis-card is-panorama-modal">
                  <div className="tablet-frame">
                    <p className="eyebrow">Case File</p>
                    <h2>{`Patient ${activeCase.patientNumber}: ${activeCase.patientName}`}</h2>
                    <p className="meta-line">
                      {activeCase.patientAge} • {activeCase.presentingConcern}
                    </p>
                    <p>{activeCase.synopsis}</p>
                    <div className="button-row">
                      <button type="button" className="ghost" onClick={returnToLobby}>
                        Back to Lobby
                      </button>
                      <button type="button" onClick={continueToRoom}>
                        Continue to Room
                      </button>
                    </div>
                  </div>
                </section>
              </>
            )}

            {displayPhase === 'room' && activeCase && activeCaseState && (
              <div className="visually-hidden">
                <ul className="hotspot-list">
                  {activeCase.hotspots.map((hotspot) => (
                    <li key={hotspot.id}>
                      <button type="button" onClick={() => handleHotspotOpen(hotspot.id)} className="hotspot-button">
                        <span>{hotspot.label}</span>
                        <small>
                          {activeCaseState.exploredHotspots.includes(hotspot.id) ? 'Explored' : 'Open hotspot'}
                        </small>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {lobbyOverlay === 'instructions' && (
              <>
                <div className="panorama-overlay-backdrop" />
                <section className="panorama-overlay is-centered">
                  <div className="panorama-overlay-header">
                    <div>
                      <p className="eyebrow">Lobby Instructions</p>
                      <h2>How to Complete the Simulation</h2>
                    </div>
                    <button type="button" className="ghost" onClick={() => setLobbyOverlay(null)}>
                      Close
                    </button>
                  </div>
                  <ul className="overlay-list">
                    <li>Review each patient case file before entering the room.</li>
                    <li>Explore all required hotspots in the patient room.</li>
                    <li>Use the Word document to take notes.</li>
                    <li>Submit diagnosis, supporting evidence, and rule-outs.</li>
                    <li>Complete any three patient assessments before time expires.</li>
                    <li>Download your submission PDF before closing the simulation.</li>
                    <li>Leaving the webpage clears the current attempt and starts a new attempt on reopening.</li>
                  </ul>
                </section>
              </>
            )}

            {displayPhase === 'room' && activeCase && activeCaseState && selectedRoomHotspot && !authorMode && (
              <>
                <div className="panorama-overlay-backdrop" />
                <section className="panorama-overlay is-docked">
                  <div className="panorama-overlay-header">
                    <div>
                      <p className="eyebrow">Hotspot Detail</p>
                      <h2>{selectedRoomHotspot.title}</h2>
                    </div>
                    <button type="button" className="ghost" onClick={() => setSelectedHotspotId(null)}>
                      Close
                    </button>
                  </div>
                  <span className="pill">
                    {activeCaseState.exploredHotspots.includes(selectedRoomHotspot.id) ? 'Explored' : 'New evidence'}
                  </span>
                  <p className="panel-copy">{selectedRoomHotspot.summary}</p>
                  <p>{selectedRoomHotspot.detail}</p>
                </section>
              </>
            )}

            {developerToolsEnabled && authorMode && authorJsonPanelOpen && activeAuthorSceneKey && (
              <>
                <div className="panorama-overlay-backdrop" />
                <section className="panorama-overlay is-docked">
                  <div className="panorama-overlay-header">
                    <div>
                      <p className="eyebrow">Developer JSON</p>
                      <h2>
                        {activeCase
                          ? `Room ${activeCase.patientNumber} Hotspot Coordinates`
                          : 'Lobby Hotspot Coordinates'}
                      </h2>
                    </div>
                    <button type="button" className="ghost" onClick={() => setAuthorJsonPanelOpen(false)}>
                      Close
                    </button>
                  </div>
                  <p className="author-status">
                    {authorJsonCopied ? 'Copied JSON to clipboard.' : 'Use this JSON preview for debugging or copying back into the hotspot data file.'}
                  </p>
                  <div className="author-actions">
                    <button type="button" onClick={handleAuthorCopyJson}>
                      Copy JSON
                    </button>
                  </div>
                  <label className="author-json-block">
                    <span>Current room JSON</span>
                    <textarea value={authorExportJson} readOnly />
                  </label>
                </section>
              </>
            )}
          </div>

          {displayPhase === 'room' && activeCase && activeCaseState && (
            <section className="overlay-card room-ui">
              <div className="room-main">
                <div className="room-header">
                  <div>
                    <p className="eyebrow">Active Room</p>
                    <h2>{`Patient ${activeCase.patientNumber}: ${activeCase.patientName}`}</h2>
                  </div>
                </div>

                <div className="checklist-strip">
                  <div>
                    <span>Checklist</span>
                    <strong>
                      {getCaseProgress(activeCase, activeCaseState).exploredRequiredCount} of{' '}
                      {getCaseProgress(activeCase, activeCaseState).totalRequiredCount} explored
                    </strong>
                  </div>
                </div>

                <div className="content-grid room-content-grid">
                  <article className="detail-card">
                    <small>Patient synopsis</small>
                    <p>{activeCase.synopsis}</p>
                  </article>
                </div>
              </div>

              <div className="room-sidebar">
                <form className="panel diagnosis-card" onSubmit={handleDiagnosisSubmit}>
                  <h2>Diagnosis Submission</h2>
                  <label>
                    <span>Diagnosis</span>
                    <select
                      value={activeCaseState.diagnosis}
                      onChange={(event) => handleDiagnosisChange(event.target.value)}
                      disabled={!getCaseProgress(activeCase, activeCaseState).roomReadyToSubmit || timerExpired}
                    >
                      <option value="">Select a diagnosis</option>
                      {activeCase.diagnosisOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span>Supporting evidence / rationale</span>
                    <textarea
                      rows={5}
                      value={activeCaseState.rationale}
                      onChange={(event) => handleRationaleChange(event.target.value)}
                      disabled={!getCaseProgress(activeCase, activeCaseState).roomReadyToSubmit || timerExpired}
                    />
                  </label>

                  <label>
                    <span>Rule-outs / differential notes</span>
                    <textarea
                      rows={4}
                      value={activeCaseState.ruleOuts}
                      onChange={(event) => handleRuleOutsChange(event.target.value)}
                      disabled={!getCaseProgress(activeCase, activeCaseState).roomReadyToSubmit || timerExpired}
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={
                      !getCaseProgress(activeCase, activeCaseState).roomReadyToSubmit ||
                      !activeCaseState.diagnosis ||
                      !activeCaseState.rationale.trim() ||
                      !activeCaseState.ruleOuts.trim() ||
                      timerExpired
                    }
                  >
                    Submit Patient Assessment
                  </button>
                </form>
              </div>
            </section>
          )}

          {displayPhase === 'timeout' && (
            <section className="overlay-card center-card danger-card">
              <p className="eyebrow">Time Expired</p>
              <h2>Clinical Window Closed</h2>
              <p className="panel-copy">
                The 2.5-hour timer has ended. If you leave this webpage and return later, the simulator will begin
                again from the start with a new attempt.
              </p>
              <p className="score-line">
                Assessments completed: <strong>{Math.min(completedRooms, REQUIRED_ASSESSMENTS)} / {REQUIRED_ASSESSMENTS}</strong>
              </p>
            </section>
          )}

          {displayPhase === 'complete' && (
            <section className="overlay-card center-card success-card">
              <p className="eyebrow">Completion Ready</p>
              <h2>Clinical Assessment Complete</h2>
              <p className="panel-copy">
                You have completed the required three patient assessments. Download your submission PDF now or return
                to the lobby to review completed cases before downloading.
              </p>
              <div className="progress-summary">
                <p>
                  Assessments completed: <strong>{Math.min(completedRooms, REQUIRED_ASSESSMENTS)} / {REQUIRED_ASSESSMENTS}</strong>
                </p>
                <p>
                  Completed patients:{' '}
                  <strong>{completedCases.slice(0, REQUIRED_ASSESSMENTS).map((caseItem) => caseItem.patientName).join(', ')}</strong>
                </p>
              </div>
              {pdfError && <p className="error-note">{pdfError}</p>}
              <div className="button-row">
                <button type="button" onClick={handleDownloadSubmissionPdf} disabled={pdfGenerating}>
                  {pdfGenerating ? 'Preparing PDF...' : 'Download Submission PDF'}
                </button>
                <button type="button" className="ghost" onClick={returnToLobby}>
                  Review Completed Assessments
                </button>
              </div>
            </section>
          )}
        </section>
      </section>
    </main>
  )
}

export default App
