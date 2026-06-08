import { useEffect, useRef, useState } from 'react'
import './App.css'
import casesData from './data/cases.json'
import answerKey from './data/answerKey.json'
import { LobbyScene } from './components/LobbyScene'
import { PatientRoomScene } from './components/PatientRoomScene'
import { createScormRuntime } from './lib/scorm'

const TOTAL_SECONDS = 2.5 * 60 * 60
const STORAGE_KEY = 'diagnostic-clinic-simulator-state'

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

function normalizeCaseState(caseId, caseState = {}) {
  return {
    ...createEmptyCaseState(caseId),
    ...caseState,
    caseId,
    exploredHotspots: Array.isArray(caseState.exploredHotspots)
      ? caseState.exploredHotspots.filter((value) => typeof value === 'string')
      : [],
  }
}

function normalizeState(rawState) {
  if (!rawState || typeof rawState !== 'object') {
    return createDefaultState()
  }

  const baseState = createDefaultState()
  const allowedPhases = ['cover', 'instructions', 'lobby', 'synopsis', 'room', 'timeout', 'complete']
  const caseIds = new Set(casesData.cases.map((caseItem) => caseItem.id))

  return {
    ...baseState,
    ...rawState,
    launched: Boolean(rawState.launched),
    phase: allowedPhases.includes(rawState.phase) ? rawState.phase : baseState.phase,
    activeCaseId: caseIds.has(rawState.activeCaseId) ? rawState.activeCaseId : null,
    timerEndsAt: Number.isFinite(rawState.timerEndsAt) ? rawState.timerEndsAt : null,
    cases: Object.fromEntries(
      casesData.cases.map((caseItem) => [
        caseItem.id,
        normalizeCaseState(caseItem.id, rawState.cases?.[caseItem.id]),
      ]),
    ),
  }
}

function loadLocalState() {
  try {
    const savedValue = window.localStorage.getItem(STORAGE_KEY)
    return savedValue ? normalizeState(JSON.parse(savedValue)) : createDefaultState()
  } catch {
    return createDefaultState()
  }
}

function serializeSuspendData(state) {
  return JSON.stringify({
    l: state.launched ? 1 : 0,
    p: state.phase,
    a: state.activeCaseId,
    t: state.timerEndsAt,
    c: Object.fromEntries(
      Object.entries(state.cases).map(([caseId, caseState]) => [
        caseId,
        {
          v: caseState.synopsisViewed ? 1 : 0,
          h: caseState.exploredHotspots,
          d: caseState.diagnosis,
          r: caseState.rationale.slice(0, 400),
          o: caseState.ruleOuts.slice(0, 400),
          s: caseState.submitted ? 1 : 0,
          m: caseState.completed ? 1 : 0,
        },
      ]),
    ),
  })
}

function deserializeSuspendData(value) {
  if (!value) {
    return null
  }

  try {
    const parsed = JSON.parse(value)
    return normalizeState({
      launched: Boolean(parsed.l),
      phase: parsed.p,
      activeCaseId: parsed.a,
      timerEndsAt: parsed.t,
      cases: Object.fromEntries(
        casesData.cases.map((caseItem) => {
          const source = parsed.c?.[caseItem.id] ?? {}
          return [
            caseItem.id,
            {
              synopsisViewed: Boolean(source.v),
              exploredHotspots: Array.isArray(source.h) ? source.h : [],
              diagnosis: source.d ?? '',
              rationale: source.r ?? '',
              ruleOuts: source.o ?? '',
              submitted: Boolean(source.s),
              completed: Boolean(source.m),
            },
          ]
        }),
      ),
    })
  } catch {
    return null
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

function App() {
  const [startup] = useState(() => {
    const scorm = createScormRuntime()
    const connected = scorm.initialize()
    return {
      scorm,
      connected,
      suspendedState: connected ? deserializeSuspendData(scorm.getValue('cmi.suspend_data')) : null,
    }
  })
  const scormRef = useRef(startup.scorm)
  const [simState, setSimState] = useState(() => startup.suspendedState ?? loadLocalState())
  const [clockNow, setClockNow] = useState(() => Date.now())
  const [selectedHotspotId, setSelectedHotspotId] = useState(null)
  const [lobbyOverlay, setLobbyOverlay] = useState(null)

  const activeCase = casesData.cases.find((caseItem) => caseItem.id === simState.activeCaseId) ?? null
  const activeCaseState = activeCase ? simState.cases[activeCase.id] : null
  const selectedRoomHotspot = activeCase?.hotspots.find((hotspot) => hotspot.id === selectedHotspotId) ?? null

  const completedRooms = casesData.cases.filter((caseItem) => simState.cases[caseItem.id].completed).length
  const allRoomsComplete = completedRooms === casesData.cases.length
  const remainingSeconds = simState.timerEndsAt
    ? Math.max(0, Math.floor((simState.timerEndsAt - clockNow) / 1000))
    : TOTAL_SECONDS
  const simulationTimedOut = Boolean(simState.launched && simState.timerEndsAt && remainingSeconds === 0 && !allRoomsComplete)
  const displayPhase = simulationTimedOut ? 'timeout' : simState.phase
  const timerState = getTimerState(remainingSeconds)
  const timerMessage = getTimerMessage(remainingSeconds)
  const scoreSummary = getScoreSummary(simState)
  const learnerPassed = allRoomsComplete && scoreSummary.score >= answerKey.passingScore
  const lessonStatus = getLessonStatus({
    launched: simState.launched,
    learnerPassed,
    allRoomsComplete,
  })
  const hasPanoramaOverlay =
    displayPhase === 'synopsis' ||
    (displayPhase === 'room' && activeCase) ||
    lobbyOverlay === 'instructions' ||
    Boolean(selectedRoomHotspot)

  useEffect(() => {
    return () => {
      startup.scorm.terminate()
    }
  }, [startup.scorm])

  useEffect(() => {
    if (!simState.timerEndsAt) {
      return undefined
    }

    const updateRemainingTime = () => {
      setClockNow(Date.now())
    }

    updateRemainingTime()
    const intervalId = window.setInterval(updateRemainingTime, 1000)
    return () => window.clearInterval(intervalId)
  }, [simState.timerEndsAt])

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(simState))
  }, [simState])

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
    scorm.setValue('cmi.core.exit', allRoomsComplete ? '' : 'suspend')
    scorm.setValue('cmi.suspend_data', serializeSuspendData(simState))
    scorm.commit()
  }, [allRoomsComplete, displayPhase, lessonStatus, scoreSummary.score, simState])

  useEffect(() => {
    const handleBeforeUnload = () => {
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
      timerEndsAt: currentState.timerEndsAt ?? Date.now() + TOTAL_SECONDS * 1000,
    }))
  }

  function openSynopsis(caseId) {
    if (remainingSeconds === 0) {
      return
    }

    setLobbyOverlay(null)
    setSimState((currentState) => ({
      ...currentState,
      launched: true,
      activeCaseId: caseId,
      phase: 'synopsis',
      timerEndsAt: currentState.timerEndsAt ?? Date.now() + TOTAL_SECONDS * 1000,
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
    setSimState((currentState) => ({
      ...currentState,
      activeCaseId: null,
      phase: allRoomsComplete ? 'complete' : 'lobby',
    }))
  }

  function handleHotspotOpen(hotspotId) {
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

  function handleLobbyHotspotOpen(hotspotId) {
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
    if (!activeCase || !activeCaseState || remainingSeconds === 0) {
      return
    }

    const progress = getCaseProgress(activeCase, activeCaseState)
    if (!progress.roomReadyToSubmit || !activeCaseState.diagnosis || !activeCaseState.rationale || !activeCaseState.ruleOuts) {
      return
    }

    setSelectedHotspotId(null)
    setSimState((currentState) => {
      const nextCases = {
        ...currentState.cases,
        [activeCase.id]: {
          ...currentState.cases[activeCase.id],
          submitted: true,
          completed: true,
        },
      }
      const nextCompletedCount = casesData.cases.filter((caseItem) => nextCases[caseItem.id].completed).length

      return {
        ...currentState,
        cases: nextCases,
        activeCaseId: null,
        phase: nextCompletedCount === casesData.cases.length ? 'complete' : 'lobby',
      }
    })
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
              <span>SCORM 1.2 ready</span>
              <span>2.5-hour timer</span>
            </div>
            <div className="button-row">
              <button type="button" onClick={openInstructions}>
                Enter Simulation
              </button>
            </div>
          </div>
          <div className="cover-stage">
            <div className="cover-stage-grid" />
            <div className="cover-monitor">
              <div className="cover-monitor-screen">
                <span>INTAKE</span>
                <strong>Patient Flow Online</strong>
                <small>Lobby, six rooms, full checklist tracking</small>
              </div>
            </div>
            <div className="cover-pillars">
              <div />
              <div />
              <div />
            </div>
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
                Move through the lobby and six patient rooms. In every room, review all six required hotspots before
                you submit a diagnosis, supporting evidence, and differential notes.
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
              <h2>SCORM Tracking</h2>
              <p>
                Progress saves to `cmi.suspend_data` in an LMS and to `localStorage` during local testing. Completed
                room submissions are tracked automatically.
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
            Prioritize navigation, evidence gathering, and clinical reasoning. Primitive rooms can be upgraded later
            with higher-fidelity props, but the learner flow is fully active now.
          </p>
        </div>

        <div className="status-cluster learner-status-cluster">
          <div className={`timer-card ${timerState}`}>
            <span>Time Remaining</span>
            <strong>{formatRemainingTime(remainingSeconds)}</strong>
            <small>{timerMessage}</small>
          </div>
          <div className="mini-card">
            <span>Patients Completed</span>
            <strong>
              {completedRooms} / {casesData.cases.length}
            </strong>
            <small>{simState.activeCaseId ? `Current room: Patient ${activeCase?.patientNumber}` : 'Lobby overview'}</small>
          </div>
        </div>
      </header>

      <section className="workspace">
        <section className="experience-panel is-full-width">
          <div className={`canvas-card ${hasPanoramaOverlay ? 'has-active-overlay' : ''}`}>
            {displayPhase === 'room' && activeCase ? (
              <PatientRoomScene
                caseData={activeCase}
                exploredHotspots={activeCaseState.exploredHotspots}
                onHotspotClick={handleHotspotOpen}
              />
            ) : (
              <LobbyScene cases={casesData.cases} caseStates={simState.cases} onHotspotClick={handleLobbyHotspotOpen} />
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
                    <div className="info-grid">
                      <div>
                        <span>Referral Source</span>
                        <strong>{activeCase.referralSource}</strong>
                      </div>
                      <div>
                        <span>Clinical Goal</span>
                        <strong>{activeCase.primaryGoal}</strong>
                      </div>
                    </div>
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
              <>
                <div className="panorama-overlay-backdrop" />
                <section className="overlay-card room-ui is-panorama-docked">
                  <div>
                    <div className="room-header">
                      <div>
                        <p className="eyebrow">Active Room</p>
                        <h2>{`Patient ${activeCase.patientNumber}: ${activeCase.patientName}`}</h2>
                      </div>
                      <button type="button" className="ghost" onClick={returnToLobby}>
                        Back to Lobby
                      </button>
                    </div>

                    <div className="checklist-strip">
                      <div>
                        <span>Checklist</span>
                        <strong>
                          {getCaseProgress(activeCase, activeCaseState).exploredRequiredCount} of{' '}
                          {getCaseProgress(activeCase, activeCaseState).totalRequiredCount} explored
                        </strong>
                      </div>
                      <div>
                        <span>Room Unlock</span>
                        <strong>
                          {getCaseProgress(activeCase, activeCaseState).roomReadyToSubmit
                            ? 'Diagnosis panel unlocked'
                            : 'Explore all required hotspots'}
                        </strong>
                      </div>
                    </div>

                    <div className="content-grid">
                      <article className="detail-card">
                        <small>Patient synopsis</small>
                        <p>{activeCase.synopsis}</p>
                      </article>
                      <article className="detail-card">
                        <small>Room variant clue</small>
                        <p>{activeCase.roomVariant.environmentalCue}</p>
                      </article>
                    </div>
                  </div>

                  <div className="room-sidebar">
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

                    <form className="panel diagnosis-card" onSubmit={handleDiagnosisSubmit}>
                      <h2>Diagnosis Submission</h2>
                      <label>
                        <span>Diagnosis</span>
                        <select
                          value={activeCaseState.diagnosis}
                          onChange={(event) => handleDiagnosisChange(event.target.value)}
                          disabled={!getCaseProgress(activeCase, activeCaseState).roomReadyToSubmit || remainingSeconds === 0}
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
                          disabled={!getCaseProgress(activeCase, activeCaseState).roomReadyToSubmit || remainingSeconds === 0}
                        />
                      </label>

                      <label>
                        <span>Rule-outs / differential notes</span>
                        <textarea
                          rows={4}
                          value={activeCaseState.ruleOuts}
                          onChange={(event) => handleRuleOutsChange(event.target.value)}
                          disabled={!getCaseProgress(activeCase, activeCaseState).roomReadyToSubmit || remainingSeconds === 0}
                        />
                      </label>

                      <button
                        type="submit"
                        disabled={
                          !getCaseProgress(activeCase, activeCaseState).roomReadyToSubmit ||
                          !activeCaseState.diagnosis ||
                          !activeCaseState.rationale.trim() ||
                          !activeCaseState.ruleOuts.trim() ||
                          remainingSeconds === 0
                        }
                      >
                        Submit Patient Assessment
                      </button>
                    </form>
                  </div>
                </section>
              </>
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
                    <li>Complete all six patients before time expires.</li>
                  </ul>
                </section>
              </>
            )}

            {displayPhase === 'room' && activeCase && activeCaseState && selectedRoomHotspot && (
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
          </div>

          {displayPhase === 'timeout' && (
            <section className="overlay-card center-card danger-card">
              <p className="eyebrow">Time Expired</p>
              <h2>Clinical Window Closed</h2>
              <p className="panel-copy">
                The 2.5-hour timer has ended. Progress has been saved, including hotspot exploration and any submitted
                patient assessments.
              </p>
              <p className="score-line">
                Patients completed: <strong>{completedRooms} / 6</strong>
              </p>
            </section>
          )}

          {displayPhase === 'complete' && (
            <section className="overlay-card center-card success-card">
              <p className="eyebrow">Simulation Complete</p>
              <h2>All Six Patients Submitted</h2>
              <p className="panel-copy">
                Final diagnosis score: {scoreSummary.score}% ({scoreSummary.matchedCount} of 6 matched the instructor
                key).
              </p>
            </section>
          )}
        </section>
      </section>
    </main>
  )
}

export default App
