import { getWindowPinned, setWindowPinned, openSettingsWindow } from '@shared/api'

function emitPinStateChanged(state) {
  if (typeof window === 'undefined') {
    return
  }

  window.dispatchEvent(new CustomEvent('window-pin-state-changed', {
    detail: { pinned: state }
  }))
}

export async function toggleWindowPin() {
  const currentState = Boolean(await getWindowPinned())
  const nextState = !currentState
  await setWindowPinned(nextState)
  emitPinStateChanged(nextState)
  return nextState
}

export async function openAppSettings() {
  await openSettingsWindow()
}
