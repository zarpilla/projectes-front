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

console.log(fail===0?'\nALL INTEGRATION CHECKS PASS':`\n${fail} FAILURES`)
process.exit(fail?1:0)
