/** True when this client is a phone/tablet or a viewport too narrow for the current UI. */
export function isUnsupportedClient(win: Window = window): boolean {
  const ua = win.navigator.userAgent || ''
  if (/Mobi|Android|iPhone|iPod|iPad|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
    return true
  }
  if (win.navigator.maxTouchPoints > 1 && win.innerWidth < 900) {
    return true
  }
  return win.innerWidth < 768
}
