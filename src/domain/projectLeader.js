// Default "Coordina" of a new project: the logged-in user, when she is one of the
// selectable people (hidden users aren't). Otherwise none, and the field stays empty
// for the user to choose: the form used to crash here on `this.user.id`.
export function defaultProjectLeader (leaders, userName) {
  if (!userName || !Array.isArray(leaders)) {
    return null
  }
  const name = String(userName).toLowerCase()
  const me = leaders.find(u => u && u.username && u.username.toLowerCase() === name)
  return me ? { id: me.id } : null
}
