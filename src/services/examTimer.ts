export function initialExamSecondsLeft(deadlineAt: string, nowMs = Date.now()): number {
  return Math.max(0, Math.ceil((new Date(deadlineAt).getTime() - nowMs) / 1000))
}

export function examSecondsLeft(initialSecondsLeft: number, timerStartedAtMs: number, currentTimerMs: number): number {
  return Math.max(0, Math.ceil(initialSecondsLeft - (currentTimerMs - timerStartedAtMs) / 1000))
}
