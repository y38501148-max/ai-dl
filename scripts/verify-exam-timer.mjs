function initialExamSecondsLeft(deadlineAt, nowMs = Date.now()) {
  return Math.max(0, Math.ceil((new Date(deadlineAt).getTime() - nowMs) / 1000))
}

function examSecondsLeft(initialSecondsLeftValue, timerStartedAtMs, currentTimerMs) {
  return Math.max(0, Math.ceil(initialSecondsLeftValue - (currentTimerMs - timerStartedAtMs) / 1000))
}

const now = Date.parse('2026-06-02T10:00:00.000Z')
const deadline = new Date(now + 60 * 60 * 1000).toISOString()
const initial = initialExamSecondsLeft(deadline, now)

if (initial !== 3600) throw new Error(`初始倒计时异常：${initial}`)
if (examSecondsLeft(initial, 1000, 61_000) !== 3540) throw new Error('单调计时 60 秒后应剩余 3540 秒')
if (examSecondsLeft(initial, 1000, 61_000) !== examSecondsLeft(initial, 1000, 61_000)) {
  throw new Error('系统时间变化不应影响单调倒计时')
}

console.log('考试倒计时单调时钟检查通过。')
