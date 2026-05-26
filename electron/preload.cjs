const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('examAPI', {
  bootstrap: () => ipcRenderer.invoke('exam:bootstrap'),
  save: (key, value) => ipcRenderer.invoke('exam:save', key, value),
  getDataDirectory: () => ipcRenderer.invoke('exam:data-directory'),
})

