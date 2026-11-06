// 2026-11-06: a project with documents or logged hours can't go to the trash
// any more (the reports by project would stop adding up with Tresoreria and
// each person's hours). The backend answers 400 with the reason; «Esborrar»
// showed nothing (an unhandled rejection) and the list dropped the row anyway.
import { describe, it, expect, vi, beforeEach } from 'vitest'

// a plain function: what each test answers
let answer
const put = (...args) => answer(...args)
vi.mock('@/service/index', () => ({ default: () => ({ put }) }))

const { projectTrashErrorMessage } = await import('@/domain/projectTrash')
const ProjectsTable = (await import('@/components/ProjectsTable.vue')).default
const ProjectForm = (await import('@/views/ProjectForm.vue')).default

const REASON = "No es pot esborrar el projecte: té 1 factura emesa. Si ja no hi treballeu, tanca'l canviant-ne l'estat."
const refused = () => Object.assign(new Error('400'), { response: { status: 400, data: { error: { message: REASON } } } })

const buefy = () => ({ toast: { open: vi.fn() }, snackbar: { open: vi.fn() } })

describe('a project with documents or hours stays out of the trash', () => {
  beforeEach(() => { answer = async () => ({ data: {} }) })

  it('the message is the backend reason, or a generic one', () => {
    expect(projectTrashErrorMessage(refused())).toBe(REASON)
    expect(projectTrashErrorMessage(new Error('Network Error'))).toBe("No s'ha pogut esborrar el projecte")
  })

  it('the projects list keeps the row and says why', async () => {
    answer = async () => { throw refused() }
    const vm = { trashObject: { id: 7 }, projectsData: [{ id: 7 }, { id: 8 }], isModalActive: true, $buefy: buefy() }
    await ProjectsTable.methods.trashConfirm.call(vm)
    expect(vm.projectsData.map(p => p.id)).toEqual([7, 8])
    expect(vm.$buefy.toast.open).toHaveBeenCalledWith(expect.objectContaining({ message: REASON, type: 'is-danger' }))
    expect(vm.$buefy.snackbar.open).not.toHaveBeenCalled()
  })

  it('the list drops the row when the trash accepts it', async () => {
    answer = async () => ({ data: {} })
    const vm = { trashObject: { id: 7 }, projectsData: [{ id: 7 }, { id: 8 }], isModalActive: true, $buefy: buefy() }
    await ProjectsTable.methods.trashConfirm.call(vm)
    expect(vm.projectsData.map(p => p.id)).toEqual([8])
  })

  it('the project form stays on the project and says why', async () => {
    answer = async () => { throw refused() }
    const vm = { form: { id: 7 }, dirty: true, isDeleteModalActive: true, $buefy: buefy(), $router: { push: vi.fn() } }
    await ProjectForm.methods.deleteConfirmed.call(vm)
    expect(vm.$router.push).not.toHaveBeenCalled()
    expect(vm.dirty).toBe(true)
    expect(vm.$buefy.toast.open).toHaveBeenCalledWith(expect.objectContaining({ message: REASON }))
  })
})
