const port = Number(process.argv[2] ?? 9333)

const pages = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json())
const page = pages.find((item) => item.type === 'page')
if (!page) throw new Error('未找到可验证的桌面应用页面')

const socket = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true })
  socket.addEventListener('error', reject, { once: true })
})

let requestId = 0
const pending = new Map()
socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data)
  if (!message.id || !pending.has(message.id)) return
  const request = pending.get(message.id)
  pending.delete(message.id)
  if (message.error) request.reject(new Error(message.error.message))
  else request.resolve(message.result)
})

async function send(method, params = {}) {
  const id = ++requestId
  const response = new Promise((resolve, reject) => pending.set(id, { resolve, reject }))
  socket.send(JSON.stringify({ id, method, params }))
  return response
}

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  })
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? '页面执行失败')
  return result.result.value
}

async function wait(milliseconds = 200) {
  await new Promise((resolve) => setTimeout(resolve, milliseconds))
}

async function clickButton(label) {
  const clicked = await evaluate(`(() => {
    const target = [...document.querySelectorAll('button')].find(
      (button) => button.textContent.trim() === ${JSON.stringify(label)}
    )
    if (!target) return false
    target.click()
    return true
  })()`)
  if (!clicked) throw new Error(`无法找到按钮：${label}`)
  await wait()
}

const initial = await evaluate('document.body.innerText')
if (!initial.includes('开始随机考试')) throw new Error('应用未进入首页')

await clickButton('开始随机考试')
await clickButton('确认开始')
const duringExam = await evaluate('document.body.innerText')
if (!duringExam.includes('正式随机考试') || !duringExam.includes('已答 0 / 50')) {
  throw new Error('确认开始后未进入正式考试页面')
}

const answered = await evaluate(`(() => {
  const option = document.querySelector('.option input')
  if (!option) return false
  option.click()
  return true
})()`)
if (!answered) throw new Error('未找到题目选项')
await wait()
const afterAnswer = await evaluate('document.body.innerText')
if (!afterAnswer.includes('已答 1 / 50')) throw new Error('答案选择未正常保存')

await clickButton('交卷')
await clickButton('确认交卷')
const result = await evaluate('document.body.innerText')
if (!result.includes('考试完成') || !result.includes('未答 49')) {
  throw new Error('只答一题后未正常进入结果页面')
}

const dataDirectory = await evaluate('window.examAPI.getDataDirectory()')
console.log('桌面冒烟测试通过：确认开始可进入考试，只答一题交卷可进入结果页。')
console.log(`测试数据目录：${dataDirectory}`)
socket.close()
