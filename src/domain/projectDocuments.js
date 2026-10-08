import sortBy from 'lodash/sortBy'

// The documents attached to a project (ProjectForm): invoices, grants,
// tickets, diets, incomes and expenses.
//
//   field       property on the project
//   docType     key used for the document and in assignment lookups
//   label       description in the documents list (incomes/expenses use their
//               document type's name instead)
//   unassigned  description in the "unassigned documents" list
//   multiplier  1 for income, -1 for expense
const KINDS = {
  emitted_invoices: { docType: 'emitted_invoices', label: 'Factura emesa', unassigned: 'Factura emesa', multiplier: 1 },
  received_grants: { docType: 'received_grants', label: 'Subvenció rebuda', unassigned: 'Subvenció rebuda', multiplier: 1 },
  received_invoices: { docType: 'received_invoices', label: 'Factura rebuda', unassigned: 'Factura rebuda', multiplier: -1 },
  tickets: { docType: 'tickets', label: 'Ticket', unassigned: 'Tiquet', multiplier: -1 },
  diets: { docType: 'diets', label: 'Dieta', unassigned: 'Dieta', multiplier: -1 },
  received_incomes: { docType: 'received_income', label: null, unassigned: 'Ingrés rebut', multiplier: 1 },
  received_expenses: { docType: 'received_expense', label: null, unassigned: 'Despesa rebuda', multiplier: -1 }
}

// The two lists have always walked the kinds in different orders; the
// documents list is then sorted by date (stable), so its order matters.
const DOCUMENTS_ORDER = ['emitted_invoices', 'received_grants', 'received_invoices', 'tickets', 'diets', 'received_incomes', 'received_expenses']
const UNASSIGNED_ORDER = ['emitted_invoices', 'received_grants', 'received_incomes', 'received_invoices', 'tickets', 'diets', 'received_expenses']

// budget line relation -> docType it points to
const INCOME_LINKS = { invoice: 'emitted_invoices', grant: 'received_grants', income: 'received_income' }
const EXPENSE_LINKS = { invoice: 'received_invoices', ticket: 'tickets', diet: 'diets', grant: 'received_grants', expense: 'received_expense' }

/** Every document of the project, oldest first: { docType, docTypeDesc, multiplier, document }. */
export function projectDocuments (form, documentTypes) {
  const documents = []
  for (const field of DOCUMENTS_ORDER) {
    const kind = KINDS[field]
    if (!form[field]) continue
    form[field].forEach(e => {
      let desc = kind.label
      if (desc === null) {
        const type = e.document_type && documentTypes.find(t => t.id === e.document_type)
        desc = type ? type.name : ''
      }
      documents.push({ docType: kind.docType, docTypeDesc: desc, multiplier: kind.multiplier, document: e })
    })
  }
  return sortBy(documents, 'document.emitted')
}

/** Documents not assigned to any budget line of the project's phases. */
export function unassignedProjectDocuments (form) {
  const assignedIds = new Set()
  const projectPhases = form.project_phases || []
  projectPhases.forEach(ph => {
    ph.incomes.forEach(line => addLinks(assignedIds, line, INCOME_LINKS))
    ph.expenses.forEach(line => addLinks(assignedIds, line, EXPENSE_LINKS))
  })

  const unassigned = []
  for (const field of UNASSIGNED_ORDER) {
    const kind = KINDS[field]
    if (!form[field]) continue
    form[field].forEach(doc => {
      if (!assignedIds.has(`${kind.docType}_${doc.id}`)) {
        unassigned.push({ ...doc, type: kind.unassigned })
      }
    })
  }
  return unassigned
}

function addLinks (assignedIds, line, links) {
  for (const [relation, docType] of Object.entries(links)) {
    const doc = line[relation]
    if (doc && doc.id) assignedIds.add(`${docType}_${doc.id}`)
  }
}
