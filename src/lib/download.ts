/** Saves bytes/text as a file on the user's computer (no network involved). */
export function saveFile(fileName: string, data: Blob | ArrayBuffer | Uint8Array | string, mime = 'application/octet-stream') {
  const part = data instanceof Uint8Array ? (data.slice().buffer as ArrayBuffer) : data
  const blob = part instanceof Blob ? part : new Blob([part], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
