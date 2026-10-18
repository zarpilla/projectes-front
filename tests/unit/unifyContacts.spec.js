// issues/157: «Unificar» punts d'entrega moved the orders but left the source
// point behind, though the dialog says it is the one «a eliminar». After the
// move the user is now offered to delete it.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const api = { get: vi.fn(), post: vi.fn(), delete: vi.fn() }
vi.mock('@/service/index', () => ({ default: () => api }))
import ModalBoxUnifyContacts from '@/components/ModalBoxUnifyContacts.vue'

const { confirm } = ModalBoxUnifyContacts.methods

function ctx () {
  const dialogs = []
  const messages = []
  const c = {
    sourceContact: { id: 10, display: 'Vella (10)', num_orders: 2 },
    targetContact: { id: 20, display: 'Nova (20)' },
    canSubmit: true,
    submitted: false,
    $buefy: {
      dialog: { confirm: opts => dialogs.push(opts) },
      snackbar: { open: o => messages.push(o) }
    },
    $emit: vi.fn(),
    cancel: vi.fn(),
    dialogs,
    messages
  }
  for (const [name, fn] of Object.entries(ModalBoxUnifyContacts.methods)) {
    if (!(name in c)) c[name] = fn.bind(c)
  }
  return c
}

describe('Unificar punts d\'entrega (issues/157)', () => {
  beforeEach(() => {
    api.post.mockReset().mockResolvedValue({ data: { movedOrders: 2 } })
    api.delete.mockReset().mockResolvedValue({ data: {} })
  })

  it('offers to delete the source point after moving its orders, and deletes it', async () => {
    const c = ctx()
    await confirm.call(c)
    await c.dialogs[0].onConfirm()
    expect(api.post).toHaveBeenCalledWith('contacts/unify', { sourceContactId: 10, targetContactId: 20 })
    expect(c.dialogs).toHaveLength(2)
    expect(c.dialogs[1].message).toContain('Vella (10)')
    await c.dialogs[1].onConfirm()
    expect(api.delete).toHaveBeenCalledWith('contacts/10')
  })

  it('keeps the source point when the user says no', async () => {
    const c = ctx()
    await confirm.call(c)
    await c.dialogs[0].onConfirm()
    c.dialogs[1].onCancel && c.dialogs[1].onCancel()
    expect(api.delete).not.toHaveBeenCalled()
  })

  it('explains when the point cannot be deleted', async () => {
    api.delete.mockRejectedValue(new Error('in use'))
    const c = ctx()
    await confirm.call(c)
    await c.dialogs[0].onConfirm()
    await c.dialogs[1].onConfirm()
    expect(c.messages.at(-1).message).toContain('no s\'ha pogut eliminar')
  })
})
