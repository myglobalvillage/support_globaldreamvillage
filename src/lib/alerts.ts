/** New-ticket alerts: short beep and (if permitted) a desktop notification. */

export function beep() {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext
    const ctx = new Ctx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = 880
    gain.gain.value = 0.05
    osc.connect(gain); gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.18)
    osc.onended = () => ctx.close()
  } catch { /* audio blocked until user interaction */ }
}

export function requestNotifyPermission() {
  if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission()
}

export function desktopNotify(title: string, body: string) {
  if ('Notification' in window && Notification.permission === 'granted') new Notification(title, { body })
}
