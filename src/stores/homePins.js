import { defineStore } from 'pinia'
import service from '@/service/index'
import { currentUserId } from '@/domain/currentUser'
import { storedPermissions } from '@/domain/routeAccess'
import menu from '@/service/menu'
import { defaultPrefs, dropPin, menuGroups, movePin, parsePrefs, readPrefs, writePrefs } from '@/domain/home'

// the PUTs, one after another, so a quick second star can't be overtaken by the first
let queue = Promise.resolve()

const defaults = () =>
  defaultPrefs(menuGroups(menu, storedPermissions() || []).flatMap(g => g.items.map(i => i.to)))

/** The person's Inici from the API (GET users/me/home): null if never saved, undefined if it can't be read. */
export async function fetchHome () {
  try {
    const response = await service({ requiresAuth: true }).get('users/me/home')
    return parsePrefs(response.data && response.data.home)
  } catch {
    return undefined
  }
}

// The stars of the side menu and the Inici page share these pins (domain/home.js).
// They are saved on the person's user; the local copy shows them at once and
// stands in when the API can't be reached.
export const useHomePins = defineStore('homePins', {
  state: () => ({ me: null, pins: [], landing: 'home', savedAt: 0, saveFailed: false }),
  getters: {
    isPinned: state => to => state.pins.includes(to)
  },
  actions: {
    apply (prefs) {
      this.pins = prefs.pins
      this.landing = prefs.landing
    },
    async load () {
      const me = currentUserId()
      if (!me) return
      this.me = me
      this.apply(readPrefs(me) || defaults())
      const saved = await fetchHome()
      if (this.me !== me) return
      if (saved) {
        this.apply(saved)
        writePrefs(me, saved)
      } else if (saved === null && readPrefs(me)) {
        // chosen while the API couldn't keep it: send it up now
        this.save()
      }
    },
    ensureLoaded () {
      if (this.me !== currentUserId()) this.load()
    },
    save () {
      const me = this.me
      const prefs = { pins: this.pins.slice(), landing: this.landing }
      writePrefs(me, prefs)
      queue = queue.then(async () => {
        try {
          await service({ requiresAuth: true }).put('users/me/home', prefs)
          this.saveFailed = false
          this.savedAt = Date.now()
        } catch {
          this.saveFailed = true
        }
      })
      return queue
    },
    toggle (to) {
      this.ensureLoaded()
      this.pins = this.isPinned(to) ? this.pins.filter(p => p !== to) : [...this.pins, to]
      return this.save()
    },
    move (to, delta) {
      this.pins = movePin(this.pins, to, delta)
      return this.save()
    },
    drop (to, before) {
      this.pins = dropPin(this.pins, to, before)
      return this.save()
    },
    setLanding (landing) {
      this.landing = landing
      return this.save()
    },
    reset () {
      this.pins = defaults().pins
      return this.save()
    }
  }
})
