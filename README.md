# Diagnostic Clinic Simulator

Diagnostic Clinic Simulator is a SCORM 1.2-compatible React + Vite learning experience for MFT 5305. Learners begin on a cover page, review launch instructions, enter a 360-degree hospital intake lobby, open one of six patient rooms, inspect all required evidence hotspots, and submit a diagnosis with supporting rationale before the timer expires.

## Current build highlights

- 360-degree lobby panorama with clickable patient-room door hotspots
- Six 360-degree patient room panoramas mapped to case-driven room variants
- Case-file overlay before room entry
- Six required hotspots per patient room:
  - Patient Interview
  - Intake Chart
  - Observation Notes
  - Medication / History Record
  - Family or Collateral Note
  - Environmental Observation
- Room checklist gating before diagnosis submission unlocks
- Global patient-progress checklist and 2.5-hour countdown timer
- SCORM 1.2 initialization, suspend/resume, score reporting, and local fallback mode

## Project structure

- `src/App.jsx`: main simulation flow, timer, progress state, and overlays
- `src/components/PanoramaViewer.jsx`: reusable 360-degree panorama viewer and hotspot renderer
- `src/components/LobbyScene.jsx`: lobby panorama with six clickable door hotspots
- `src/components/PatientRoomScene.jsx`: patient-room panorama wrapper with hotspot placement
- `src/data/cases.json`: learner-facing patient case data
- `src/data/answerKey.json`: instructor-only diagnosis key and scoring references
- `src/lib/scorm.js`: lightweight SCORM 1.2 runtime wrapper
- `public/assets/`: panorama PNGs served at `/assets/FILENAME.png`
- `public/imsmanifest.xml`: SCORM package manifest copied into `dist/`

## Local development

1. Install dependencies:

```bash
npm install
```

2. Start the Vite dev server:

```bash
npm run dev
```

3. Open the local URL shown in the terminal.

When no LMS API is available, the app runs in local fallback mode and saves resume data in `localStorage`.

## Build and package

Build the web app:

```bash
npm run build
```

Create a SCORM 1.2 zip with `imsmanifest.xml` at the package root:

```bash
npm run package:scorm
```

The packaged file is written to `diagnostic-clinic-simulator-scorm12.zip`.

## Editing patient cases

Update `src/data/cases.json` to change learner-facing content. Each case includes:

- `id`
- `patientNumber`
- `patientName`
- `patientAge`
- `presentingConcern`
- `referralSource`
- `primaryGoal`
- `synopsis`
- `diagnosisOptions`
- `roomVariant`
- `hotspots`
- `completionRequired`

Each hotspot entry should map to one of the room anchors already supported by the panorama room scene:

- `patient`
- `chart`
- `monitor`
- `sink`
- `bulletin`
- `environment`

Hotspots use this structure:

```json
{
  "id": "patient-interview",
  "anchor": "patient",
  "label": "Patient Interview",
  "title": "Patient Interview",
  "summary": "Short learner-facing summary.",
  "detail": "Full learner-facing hotspot content."
}
```

## Editing the instructor key

Update `src/data/answerKey.json` for instructor-only grading references. Each entry includes:

- `id`
- `correctDiagnosis`
- `supportingFeatures`
- `ruleOuts`

Learners do not see this file in the simulation UI.

## Panorama assets

Panorama images are stored in `public/assets` and referenced by absolute Vite-safe paths such as `/assets/Lobby.png`.

This is the cleanest option for this project because:

- the same image paths work in local dev
- the same files are copied automatically into `dist/`
- SCORM packaging includes them without extra import logic

If you replace a panorama, keep the filename stable or update the mapping in `src/components/LobbyScene.jsx` or `src/components/PatientRoomScene.jsx`.

## SCORM 1.2 notes

The app reports:

- `cmi.core.lesson_status`
  - `passed` when all six rooms are completed and the score meets the passing threshold
  - `completed` when all six rooms are submitted but the score does not meet the pass threshold
  - `incomplete` while the learner is still working or time expires before all rooms are complete
- `cmi.core.score.raw`: diagnosis-match score as a percentage
- `cmi.core.lesson_location`: current phase and patient id
- `cmi.suspend_data`: compact persisted progress snapshot

For LMS packaging:

1. Run `npm run package:scorm`.
2. Upload `diagnostic-clinic-simulator-scorm12.zip` to the LMS or SCORM Cloud.
3. Verify suspend/resume, timer behavior, and lesson status updates in the LMS test attempt.
