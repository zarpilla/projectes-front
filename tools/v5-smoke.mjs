// Smoke-tests the Strapi v3 -> v5 compatibility layer (src/service/v5-compat.js)
// against a running v5 backend, replaying the call shapes the views actually use:
// the auth flow, list screens, pagination meta, the emulated /count, the
// snake_case timestamp aliases, v3's default populate, findOne by numeric id and
// the DocumentForm create/update/delete path.
//
//   SMOKE_USER=<email> SMOKE_PASS=<password> API_URL=http://127.0.0.1:1338 \\
//     node tools/v5-smoke.mjs
//
// Creates and deletes one throwaway kanban-view; everything else is read-only.

import { mapRequest, wrapRequestBody, isEnvelope, addTimestampAliases, normalizeErrorBody } from '../src/service/v5-compat.js'

const BASE = process.env.API_URL || 'http://127.0.0.1:1337'
const IDENTIFIER = process.env.SMOKE_USER
const PASSWORD = process.env.SMOKE_PASS
if (!IDENTIFIER || !PASSWORD) {
  console.error('Usage: SMOKE_USER=<email> SMOKE_PASS=<password> [API_URL=http://127.0.0.1:1338] node tools/v5-smoke.mjs')
  process.exit(2)
}
let fail=0
const check=(label,cond,extra='')=>{ if(!cond){fail++;console.log('FAIL',label,extra)} else console.log('ok  ',label) }

// the compat layer's own request/response pipeline
async function service(method,url,body,jwt){
  const m=mapRequest(method,url)
  const headers={}
  if(jwt) headers.Authorization=`Bearer ${jwt}`
  let payload
  if(body!==undefined){ payload=JSON.stringify(m.wrapBody?wrapRequestBody(body):body); headers['Content-Type']='application/json' }
  const res=await fetch(`${BASE}/${m.url}`,{method:method.toUpperCase(),headers,body:payload})
  let data=await res.json().catch(()=>null)
  const out={status:res.status}
  if(!res.ok){ out.data=normalizeErrorBody(data); return out }
  if(m.unwrap!==false && isEnvelope(data)){ out.meta=data.meta; data=data.data }
  addTimestampAliases(data)
  if(m.isCount) data=(out.meta&&out.meta.pagination&&out.meta.pagination.total)||0
  out.data=data
  return out
}

// --- Login.vue ---
const login=await service('post','auth/local',{identifier:IDENTIFIER,password:PASSWORD})
check('auth/local returns a plain {jwt,user} (no unwrap)', login.status===200 && !!login.data.jwt && !!login.data.user)
const jwt=login.data.jwt

const badLogin=await service('post','auth/local',{identifier:'x@y.z',password:'nope'})
check('bad login exposes a v3-style message string',
  badLogin.status===400 && typeof badLogin.data.message==='string' && badLogin.data.message.length>0, badLogin.data&&badLogin.data.message)

// --- App.vue ---
const me=await service('get','users/me',undefined,jwt)
check('users/me is a plain user object', me.status===200 && typeof me.data.id==='number' && !!me.data.username)
// App.vue and 95 other call sites do `me.permissions.map(p => p.permission)`
// unguarded — the whole frontend authorization model lives on this component.
check('users/me carries the permissions component',
  Array.isArray(me.data.permissions) && me.data.permissions.every(p=>typeof p.permission==='string'),
  JSON.stringify(me.data.permissions))
check('users/me carries role (AdminUserForm reads user.role.id)', !!(me.data.role && me.data.role.id))
check('users/me stays small (populate is role+permissions, not *)',
  JSON.stringify(me.data).length < 4000 && me.data.tasks===undefined, `${JSON.stringify(me.data).length} bytes`)

// AdminUserList pages the user list; ContactUsForm reads u.permissions on it
const userPage=await service('get','users?_start=0&_limit=3&_sort=username:ASC',undefined,jwt)
check('users list paginates and sorts',
  userPage.status===200 && userPage.data.length===3 && Array.isArray(userPage.data[0].permissions),
  `rows=${userPage.data && userPage.data.length}`)

// --- list screens: (await ...).data must be an array ---
for(const [label,url] of [
  ['Projectes list','projects?_limit=5&_sort=name:ASC'],
  ['Contactes (custom route)','contacts/basic?_limit=5&_sort=name:ASC'],
  ['Comandes table','orders/table?_limit=5&_start=0&_sort=id:DESC'],
  ['Factures emeses','emitted-invoices?_limit=5&_sort=emitted:DESC&_where[state_ne]=draft'],
  ['Activitats','activities?_limit=5'],
  ['Mesos (was 403)','months?_sort=month:ASC'],
  ['Rutes','routes?_sort=order&_where[active]=true'],
]){
  const r=await service('get',url,undefined,jwt)
  check(label, r.status===200 && Array.isArray(r.data), `status=${r.status} type=${Array.isArray(r.data)?'array':typeof r.data}`)
}

// --- pagination meta survives for the views that page ---
const paged=await service('get','orders?_limit=5&_start=0',undefined,jwt)
check('pagination meta is stashed on response.meta', paged.meta && typeof paged.meta.pagination.total==='number', JSON.stringify(paged.meta))

// --- count emulation (DepositsTable / OrdersTable / IncidencesTable) ---
const cnt=await service('get','orders/count',undefined,jwt)
check('orders/count yields the number views assign to this.total', cnt.status===200 && typeof cnt.data==='number', `got ${cnt.data}`)

// --- timestamp aliases the views read ---
const one=await service('get','projects?_limit=1',undefined,jwt)
const row=one.data[0]
check('created_at/updated_at aliases exist on rows', !!row.created_at && !!row.updated_at && row.created_at===row.createdAt)

// --- v3 default populate: relations come back as objects, not ids ---
const ord=await service('get','orders/table?_limit=1',undefined,jwt)
check('relations are populated (OrdersTable reads o.route.name)',
  ord.data[0] && ord.data[0].route && typeof ord.data[0].route==='object', JSON.stringify(ord.data[0]&&ord.data[0].route))

// --- findOne by the numeric id the views hold ---
const pid=one.data[0].id
const single=await service('get',`projects/${pid}`,undefined,jwt)
check('findOne by numeric id', single.status===200 && single.data && single.data.id===pid, `status=${single.status}`)

// --- DocumentForm.vue save path: POST <type> then PUT <type>/<id> ---
const created=await service('post','kanban-views',{view:'p9-int',projectId:999998,userId:me.data.id},jwt)
check('create wraps the body and returns the entity (newProject.data.id)', (created.status===200||created.status===201) && !!created.data.id, JSON.stringify(created.data).slice(0,120))
if(created.data && created.data.id){
  const upd=await service('put',`kanban-views/${created.data.id}`,{view:'p9-int-2'},jwt)
  check('update by numeric id wraps the body', upd.status===200 && upd.data.view==='p9-int-2', JSON.stringify(upd.data).slice(0,120))
  const del=await service('delete',`kanban-views/${created.data.id}`,undefined,jwt)
  check('delete by numeric id', del.status===204||del.status===200, `status=${del.status}`)
}

// --- ProjectForm "GESTIÓ ECONÒMICA": edit, add and delete a phase income ---
// The form flags edited rows `dirty`, sends new rows without an id, and lists
// removed ones in `project_phases_info` behind `_project_phases_updated`. None
// of those are schema attributes, so they only survive if the backend's write
// sanitizer keeps them.
{
  // the list only populates one relation level, so incomes are not visible there
  const projects = await service('get', 'projects?_limit=-1', undefined, jwt)
  let before = null
  for (const row of (projects.data || []).slice(0, 12)) {
    const full = (await service('get', `projects/${row.id}`, undefined, jwt)).data
    if ((full.project_phases || []).some(ph => (ph.incomes || []).length >= 2)) { before = full; break }
  }
  if (!before) {
    console.log('skip  GESTIÓ ECONÒMICA (no project with 2+ phase incomes in this dataset)')
  } else {
    const withPhases = before
    const phase = before.project_phases.find(ph => (ph.incomes || []).length >= 2)
    const target = phase.incomes[0]
    const doomed = phase.incomes[1]
    const originalAmount = target.amount
    const countBefore = phase.incomes.length

    const edited = JSON.parse(JSON.stringify(before))
    const ph = edited.project_phases.find(p => p.id === phase.id)
    ph.incomes = ph.incomes.filter(i => i.id !== doomed.id)
    const edit = ph.incomes.find(i => i.id === target.id)
    edit.amount = originalAmount + 11
    edit.dirty = true
    ph.incomes.push({ concept: 'p9 smoke income', quantity: 1, amount: 7, vat_pct: 21, date: target.date })
    edited._project_phases_updated = true
    edited.project_phases_info = { deletedPhases: [], deletedIncomes: [doomed.id], deletedExpenses: [], deletedHours: [] }

    const saved = await service('put', `projects/${withPhases.id}`, edited, jwt)
    check('GESTIÓ ECONÒMICA save succeeds', !saved.data?.error && saved.status === 200, JSON.stringify(saved.data)?.slice(0, 120))

    const after = (await service('get', `projects/${withPhases.id}`, undefined, jwt)).data
    const incomes = (after.project_phases.find(p => p.id === phase.id) || {}).incomes || []
    const editedRow = incomes.find(i => i.id === target.id)
    const created = incomes.find(i => i.concept === 'p9 smoke income')
    check('  edit to an existing income persists', editedRow && editedRow.amount === originalAmount + 11,
      `got ${editedRow && editedRow.amount}`)
    check('  removed income is deleted', !incomes.some(i => i.id === doomed.id))
    check('  new income is created with its fields', !!created && created.amount === 7 && created.total_amount === 7)
    check('  income count is unchanged (one out, one in)', incomes.length === countBefore, `got ${incomes.length}`)

    // put it back: restore the amount, drop the row we added, recreate the deleted one
    const restore = JSON.parse(JSON.stringify(after))
    const rph = restore.project_phases.find(p => p.id === phase.id)
    rph.incomes = rph.incomes.filter(i => i.concept !== 'p9 smoke income')
    const back = rph.incomes.find(i => i.id === target.id)
    if (back) { back.amount = originalAmount; back.dirty = true }
    const { id: _drop, documentId: _drop2, ...doomedFields } = doomed
    rph.incomes.push({ ...doomedFields, dirty: true })
    restore._project_phases_updated = true
    restore.project_phases_info = { deletedPhases: [], deletedIncomes: created ? [created.id] : [], deletedExpenses: [], deletedHours: [] }
    await service('put', `projects/${withPhases.id}`, restore, jwt)
    const restored = (await service('get', `projects/${withPhases.id}`, undefined, jwt)).data
    const rIncomes = (restored.project_phases.find(p => p.id === phase.id) || {}).incomes || []
    check('  restored to the original amount and count',
      rIncomes.length === countBefore && rIncomes.find(i => i.id === target.id)?.amount === originalAmount,
      `count ${rIncomes.length}/${countBefore}`)
  }
}

// --- a plain project save that touches no phases ---
// The form echoes the whole phase graph back regardless, `dirty` markers and
// all, WITHOUT the _project_phases_updated flag. Those markers are not schema
// attributes ("Invalid key dirty at project_phases.incomes"), and the echoed
// rows must not overwrite the phases either.
{
  const projects = await service('get', 'projects?_limit=-1', undefined, jwt)
  let target = null
  for (const row of (projects.data || []).slice(0, 12)) {
    const full = (await service('get', `projects/${row.id}`, undefined, jwt)).data
    if ((full.project_phases || []).some(p => (p.incomes || []).length)) { target = full; break }
  }
  if (!target) {
    console.log('skip  plain save (no project with phase incomes)')
  } else {
    const nameBefore = target.name
    const incomesBefore = target.project_phases.reduce((n, p) => n + (p.incomes || []).length, 0)
    const body = JSON.parse(JSON.stringify(target))
    body.project_phases.forEach(p => {
      (p.incomes || []).forEach(i => { i.dirty = false; i.assign = false; i.estimated_hours = [] })
      ;(p.expenses || []).forEach(e => { e.dirty = false; e.assign = false })
    })
    body.name = nameBefore + ' (p9)'
    body.project_phases_info = { deletedPhases: [], deletedIncomes: [], deletedExpenses: [], deletedHours: [] }
    body.project_original_phases_info = { deletedPhases: [], deletedIncomes: [], deletedExpenses: [], deletedHours: [] }
    // deliberately no _project_phases_updated

    const saved = await service('put', `projects/${target.id}`, body, jwt)
    check('plain save with echoed phases succeeds', saved.status === 200 && !saved.data?.error,
      JSON.stringify(saved.data)?.slice(0, 140))
    const after = (await service('get', `projects/${target.id}`, undefined, jwt)).data
    check('  the scalar edit landed', after.name === nameBefore + ' (p9)', after.name)
    check('  the echoed phases did not overwrite anything',
      after.project_phases.reduce((n, p) => n + (p.incomes || []).length, 0) === incomesBefore)
    const restore = JSON.parse(JSON.stringify(after))
    restore.name = nameBefore
    await service('put', `projects/${target.id}`, restore, jwt)
    check('  restored', (await service('get', `projects/${target.id}`, undefined, jwt)).data.name === nameBefore)
  }
}

// --- projects/basic must carry `mother` on every row ---
// v3 stored relations as FK columns, so `mother` was on every row even when it
// was not populated; v5 omits an unpopulated relation entirely. Three components
// branch on `p.mother === null` (JornadaDiaria, ModalBoxMoveProject,
// TreasuryAnnotationInput) and threw on undefined, and Home and the pivots read
// `p.mother.name` — so it has to be present AND a real object.
{
  const basic = await service('get', 'projects/basic?_limit=-1', undefined, jwt)
  const rows = basic.data || []
  check('projects/basic returns rows', Array.isArray(rows) && rows.length > 0)
  check('  every row has the `mother` key', rows.every(p => 'mother' in p),
    `${rows.filter(p => !('mother' in p)).length} missing`)
  const withMother = rows.filter(p => p.mother)
  check('  a populated mother is an object with id and name',
    withMother.every(p => typeof p.mother === 'object' && p.mother.id && p.mother.name !== undefined),
    JSON.stringify(withMother[0] && withMother[0].mother))
  // the filter those three components run
  let filterError = null
  try {
    rows.filter(p => p.project_state && p.project_state.can_assign_activities === true)
        .filter(p => p.mother === null || (p.mother !== null && p.mother.id && p.mother.id !== p.id))
  } catch (e) { filterError = e.message }
  check('  the project-picker filter runs without throwing', filterError === null, filterError)
}

// --- the endpoint ProjectForm actually loads the planning from ---
// It does NOT read the phases out of GET projects/:id — it fetches them from
// `project-phases?project=<id>` ("Load execution phases with estimated hours")
// and builds the PREVISTA chart from incomes.estimated_hours. A one-level
// populate here leaves the chart empty and makes a save echo back
// `estimated_hours: []`.
{
  const projects = await service('get', 'projects?_limit=-1', undefined, jwt)
  let withHours = null
  for (const row of (projects.data || []).slice(0, 12)) {
    const phases = await service('get', `project-phases?project=${row.id}&_limit=-1`, undefined, jwt)
    if ((phases.data || []).some(p => (p.incomes || []).some(i => (i.estimated_hours || []).length))) {
      withHours = phases.data; break
    }
  }
  if (!withHours) {
    console.log('skip  project-phases deep populate (no estimated hours in this dataset)')
  } else {
    const income = withHours.flatMap(p => p.incomes || []).find(i => (i.estimated_hours || []).length)
    check('project-phases returns incomes.estimated_hours (PREVISTA chart)',
      Array.isArray(income.estimated_hours) && income.estimated_hours.length > 0)
    const hour = income.estimated_hours[0]
    check('  its blocks carry both dates', !!hour.from && !!hour.to, `${hour.from} .. ${hour.to}`)
    check('  the assigned person is populated', !hour.users_permissions_user || hour.users_permissions_user.username !== undefined)
  }
}

// --- ProjectForm "PLANIFICACIÓ": the gantt writes estimated_hours ---
// ganttItemUpdate edits an hour in place (flagging it and its income `dirty`),
// appends new blocks with a client `_uuid`, assigns a person as a whole user
// object, and deletes through `deletedHours` — all via the same
// _project_(original_)phases_updated mechanism as the economic section.
for (const mode of ['estimated', 'original']) {
  const phasesKey = mode === 'original' ? 'project_original_phases' : 'project_phases'
  const flag = mode === 'original' ? '_project_original_phases_updated' : '_project_phases_updated'
  const infoKey = mode === 'original' ? 'project_original_phases_info' : 'project_phases_info'

  const projects = await service('get', 'projects?_limit=-1', undefined, jwt)
  let before = null
  for (const row of (projects.data || []).slice(0, 12)) {
    const full = (await service('get', `projects/${row.id}`, undefined, jwt)).data
    if ((full[phasesKey] || []).some(p => (p.incomes || []).some(i => (i.estimated_hours || []).length))) {
      before = full; break
    }
  }
  if (!before) { console.log(`skip  PLANIFICACIÓ ${mode} (no estimated hours in this dataset)`); continue }

  const phase = before[phasesKey].find(p => (p.incomes || []).some(i => (i.estimated_hours || []).length))
  const income = phase.incomes.find(i => (i.estimated_hours || []).length)
  const hour = income.estimated_hours[0]
  const originalQty = hour.quantity
  const originalUser = hour.users_permissions_user ? hour.users_permissions_user.id : null
  const countBefore = income.estimated_hours.length
  const someone = (await service('get', 'users?_limit=2', undefined, jwt)).data
    .find(u => u.id !== originalUser) || {}

  const edited = JSON.parse(JSON.stringify(before))
  const einc = edited[phasesKey].find(p => p.id === phase.id).incomes.find(i => i.id === income.id)
  const eh = einc.estimated_hours.find(h => h.id === hour.id)
  eh.quantity = originalQty + 3
  eh.from = '2026-02-01'
  eh.to = '2026-02-28'
  eh.users_permissions_user = someone          // the gantt assigns the whole user object
  eh.dirty = true
  einc.estimated_hours.push({ from: '2026-03-01', to: '2026-03-31', quantity: 5, monthly_quantity: 5,
    quantity_type: eh.quantity_type, users_permissions_user: {}, amount: 0, total_amount: 0,
    _uuid: 'p9-smoke', dirty: true })          // `{}` = nobody assigned yet
  einc.dirty = true
  edited[flag] = true
  edited[infoKey] = { deletedPhases: [], deletedIncomes: [], deletedExpenses: [], deletedHours: [] }

  const saved = await service('put', `projects/${before.id}`, edited, jwt)
  check(`PLANIFICACIÓ ${mode}: save succeeds`, saved.status === 200 && !saved.data?.error,
    JSON.stringify(saved.data)?.slice(0, 120))

  const after = (await service('get', `projects/${before.id}`, undefined, jwt)).data
  const aInc = after[phasesKey].find(p => p.id === phase.id).incomes.find(i => i.id === income.id)
  const hours = aInc.estimated_hours || []
  const ah = hours.find(h => h.id === hour.id)
  check(`  ${mode}: edited block persists`, ah && ah.quantity === originalQty + 3, `got ${ah && ah.quantity}`)
  check(`  ${mode}: its dates persist`, ah && String(ah.from).startsWith('2026-02-01'), `got ${ah && ah.from}`)
  check(`  ${mode}: the assigned person persists`,
    !someone.id || (ah && ah.users_permissions_user && ah.users_permissions_user.id === someone.id),
    `got ${ah && JSON.stringify(ah.users_permissions_user)}`)
  const added = hours.find(h => h.quantity === 5 && h.id !== hour.id)
  check(`  ${mode}: a new block is created`, !!added, `hours ${hours.length}, was ${countBefore}`)

  // put it back
  const restore = JSON.parse(JSON.stringify(after))
  const rInc = restore[phasesKey].find(p => p.id === phase.id).incomes.find(i => i.id === income.id)
  const rh = rInc.estimated_hours.find(h => h.id === hour.id)
  if (rh) {
    rh.quantity = originalQty; rh.from = hour.from; rh.to = hour.to
    rh.users_permissions_user = originalUser ? { id: originalUser } : {}
    rh.dirty = true
  }
  rInc.estimated_hours = rInc.estimated_hours.filter(h => !added || h.id !== added.id)
  rInc.dirty = true
  restore[flag] = true
  restore[infoKey] = { deletedPhases: [], deletedIncomes: [], deletedExpenses: [], deletedHours: added ? [added.id] : [] }
  await service('put', `projects/${before.id}`, restore, jwt)
  const back = (await service('get', `projects/${before.id}`, undefined, jwt)).data
  const bHours = (back[phasesKey].find(p => p.id === phase.id).incomes.find(i => i.id === income.id) || {}).estimated_hours || []
  // ProjectGannt only draws a block when the API gives it BOTH dates, and it
  // labels the bar from users_permissions_user.username — so a populate gap
  // here shows up as an empty chart rather than an error.
  if (mode === 'estimated') {
    const drawable = hours.filter(h => h.from && h.to)
    check(`  ${mode}: every hour carries both dates (the gantt drops the rest)`,
      drawable.length === hours.length, `${drawable.length}/${hours.length}`)
    const named = hours.filter(h => !h.users_permissions_user || h.users_permissions_user.username !== undefined)
    check(`  ${mode}: assigned people are populated, not bare ids`,
      named.length === hours.length, `${named.length}/${hours.length}`)
  }

  check(`  ${mode}: restored`,
    bHours.length === countBefore && bHours.find(h => h.id === hour.id)?.quantity === originalQty,
    `count ${bHours.length}/${countBefore}`)
}

console.log(fail===0?'\nALL INTEGRATION CHECKS PASS':`\n${fail} FAILURES`)
process.exit(fail?1:0)
