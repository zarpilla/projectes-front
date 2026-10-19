// The «Estat projecte» chips of Ingressos/Despeses and Preu hora: the project
// states plus «Sense estat», the projects without a state. projects/economic-detail
// reads its id 0 in project_state_in as "no state" (issues/205).
export const NO_STATE_ID = 0

export const stateChips = states => [...(states || []), { id: NO_STATE_ID, name: 'Sense estat' }]
