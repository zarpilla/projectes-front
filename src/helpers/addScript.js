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
