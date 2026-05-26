const { app, BrowserWindow, ipcMain, shell } = require('electron')
const path = require('node:path')
const fs = require('node:fs/promises')
const AdmZip = require('adm-zip')

const FILES = {
  records: 'exam-records.json',
  wrongBook: 'wrong-book.json',
  progress: 'progress.json',
  activeExam: 'active-exam.json',
  settings: 'settings.json',
}

const DEFAULTS = {
  records: [],
  wrongBook: [],
  progress: { attemptedQuestionIds: [] },
  activeExam: null,
  settings: { questionBankVersion: 1 },
}

function dataDirectory() {
  return path.join(app.getPath('userData'), 'data')
}

function bankDirectory() {
  return path.join(dataDirectory(), 'question-bank')
}

function bundledQuestionBank() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'question-bank.zip')
    : path.join(__dirname, '..', 'resources', 'question-bank.zip')
}

async function writeJson(filePath, value) {
  const temporary = `${filePath}.tmp`
  await fs.writeFile(temporary, JSON.stringify(value, null, 2), 'utf8')
  await fs.rename(temporary, filePath)
}

async function readOrCreateJson(key) {
  const filePath = path.join(dataDirectory(), FILES[key])
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'))
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    await writeJson(filePath, DEFAULTS[key])
    return DEFAULTS[key]
  }
}

async function ensureDataFiles() {
  await fs.mkdir(dataDirectory(), { recursive: true })
  await fs.mkdir(bankDirectory(), { recursive: true })
  const questionsPath = path.join(bankDirectory(), 'questions.json')

  try {
    await fs.access(questionsPath)
  } catch {
    const archivePath = bundledQuestionBank()
    await fs.access(archivePath)
    const zip = new AdmZip(archivePath)
    zip.extractAllTo(bankDirectory(), true)
  }

  return questionsPath
}

async function bootstrap() {
  const questionsPath = await ensureDataFiles()
  const [questions, records, wrongBook, progress, activeExam, settings] = await Promise.all([
    fs.readFile(questionsPath, 'utf8').then(JSON.parse),
    readOrCreateJson('records'),
    readOrCreateJson('wrongBook'),
    readOrCreateJson('progress'),
    readOrCreateJson('activeExam'),
    readOrCreateJson('settings'),
  ])

  return { questions, records, wrongBook, progress, activeExam, settings }
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 1050,
    minHeight: 700,
    title: '人工智能导论题库',
    backgroundColor: '#f3f6fc',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  window.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    window.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    window.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }
}

ipcMain.handle('exam:bootstrap', bootstrap)
ipcMain.handle('exam:data-directory', () => dataDirectory())
ipcMain.handle('exam:save', async (_event, key, value) => {
  if (!Object.hasOwn(FILES, key)) {
    throw new Error(`Unsupported storage key: ${key}`)
  }
  await ensureDataFiles()
  await writeJson(path.join(dataDirectory(), FILES[key]), value)
  return true
})

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

