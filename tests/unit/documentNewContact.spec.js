// issues/024 — "Nou Contacte" (+) next to Clienta/Proveïdora opened
// #/contact/<document id>, an unrelated existing contact, from a saved document:
// navNew() resolved { name: 'contacts.edit' } without params and Vue Router 4
// reuses the current route's `id`. It must always open an empty contact form.
import { describe, it, expect, vi, afterEach } from 'vitest'
import { createRouter, createMemoryHistory } from 'vue-router'

vi.mock('@/service/index', () => ({ default: () => ({ get: vi.fn() }) }))

import DocumentForm from '@/components/DocumentForm.vue'

const Empty = { render: () => null }

async function routerAt (path) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/document/:id/:type', name: 'document.edit', component: Empty },
      { path: '/contact/:id', name: 'contacts.edit', component: Empty }
    ]
  })
  await router.push(path)
  return router
}

describe('DocumentForm navNew', () => {
  afterEach(() => vi.restoreAllMocks())

  for (const path of ['/document/0/received-invoices', '/document/57/received-invoices']) {
    it(`opens an empty contact form from ${path}`, async () => {
      const open = vi.spyOn(window, 'open').mockImplementation(() => null)
      const $router = await routerAt(path)
      DocumentForm.methods.navNew.call({ $router })
      expect(open).toHaveBeenCalledWith('/contact/0', '_blank')
    })
  }
})
