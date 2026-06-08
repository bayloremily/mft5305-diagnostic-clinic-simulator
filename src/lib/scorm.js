function findScormApi(win) {
  let currentWindow = win
  let attempts = 0

  while (currentWindow && attempts < 20) {
    if (currentWindow.API) {
      return currentWindow.API
    }
    if (currentWindow.parent === currentWindow) {
      break
    }
    currentWindow = currentWindow.parent
    attempts += 1
  }

  currentWindow = win?.opener
  attempts = 0

  while (currentWindow && attempts < 20) {
    if (currentWindow.API) {
      return currentWindow.API
    }
    if (currentWindow.parent === currentWindow) {
      break
    }
    currentWindow = currentWindow.parent
    attempts += 1
  }

  return null
}

export function createScormRuntime() {
  let api = null
  let ready = false
  let finished = false

  return {
    initialize() {
      api = findScormApi(window)
      if (!api) {
        return false
      }

      if (ready) {
        return true
      }

      ready = api.LMSInitialize('') === 'true'
      return ready
    },
    isReady() {
      return ready && !finished
    },
    getValue(key) {
      if (!this.isReady()) {
        return ''
      }
      return api.LMSGetValue(key)
    },
    setValue(key, value) {
      if (!this.isReady()) {
        return false
      }
      return api.LMSSetValue(key, value) === 'true'
    },
    commit() {
      if (!this.isReady()) {
        return false
      }
      return api.LMSCommit('') === 'true'
    },
    terminate() {
      if (!ready || finished) {
        return false
      }
      finished = api.LMSFinish('') === 'true'
      return finished
    },
  }
}
