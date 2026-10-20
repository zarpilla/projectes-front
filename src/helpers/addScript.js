import { applyKendoCulture } from './kendoCulture'

const addScript = async (src, id) => {
  return new Promise((resolve, reject) => {
    if (document.getElementById(id)) {
      applyKendoCulture()
      resolve()
      return
    }
    const head = document.head || document.getElementsByTagName('head')[0]
    const script = document.createElement('script')
    script.id = id
    script.src = src
    // the pivot reports load Kendo through here: give it the app's number format
    script.addEventListener('load', () => { applyKendoCulture(); resolve() })
    script.addEventListener('error', (e) => reject(e))
    script.addEventListener('abort', (e) => reject(e))
    head.appendChild(script)
  })
}

const addStyle = async (src, id) => {
  return new Promise((resolve, reject) => {
    if (document.getElementById(id)) {
      resolve()
      return
    }
    const head = document.head || document.getElementsByTagName('head')[0]
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.id = id
    link.href = src
    link.addEventListener('load', resolve)
    link.addEventListener('error', (e) => reject(e))
    link.addEventListener('abort', (e) => reject(e))
    head.appendChild(link)
  })
}

export { addScript, addStyle }

// A file under the app's base path, with one "/" between them. "/" + "/vendor/…"
// gave "//vendor/…", which the browser reads as a host: Intercooperació opened
// blank (issues/182).
export const underBase = (base, path) =>
  String(base || '').replace(/\/+$/, '') + '/' + String(path).replace(/^\/+/, '')

// The Kendo scripts and styles of the pivot reports, under the app's base path.
// Every Kendo page built "/" + "/vendor/…" by hand, blank with base «/» (issues/248).
export const KENDO_FILES = [
  ['vendor/kendo/kendo.all.min.js', 'kendo-all-min-js'],
  ['vendor/kendo/kendo.common.min.css', 'kendo-common-min-css'],
  ['vendor/kendo/kendo.custom.css', 'kendo-custom-css'],
  ['vendor/kendo/custom.css', 'custom-css']
]

export const loadKendo = async (base = import.meta.env.VUE_APP_PATH) => {
  for (const [file, id] of KENDO_FILES) {
    const src = underBase(base, file)
    await (file.endsWith('.js') ? addScript(src, id) : addStyle(src, id))
  }
}
