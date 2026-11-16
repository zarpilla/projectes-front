// issues/433: which phases of a project are folded, remembered in this browser
// per project (only saved phases, by id). Everything else opens unfolded, so a
// new phase (an execution copy too) is open until someone folds it.
const key = projectId => `phases-folded-${projectId}`;

export function loadFoldedPhases(projectId, storage = globalThis.localStorage) {
  if (!projectId || !storage) return {};
  try {
    const ids = JSON.parse(storage.getItem(key(projectId)) || "[]");
    if (!Array.isArray(ids)) return {};
    return Object.fromEntries(ids.map(id => ["id-" + id, true]));
  } catch (e) {
    return {};
  }
}

// `collapsed`: the component's map, "id-<id>" / "index-<n>" → folded
export function saveFoldedPhases(projectId, collapsed, storage = globalThis.localStorage) {
  if (!projectId || !storage) return;
  const ids = Object.keys(collapsed || {})
    .filter(k => collapsed[k] && k.startsWith("id-"))
    .map(k => k.slice(3));
  try {
    if (ids.length) storage.setItem(key(projectId), JSON.stringify(ids));
    else storage.removeItem(key(projectId));
  } catch (e) {
    // private window or storage full: the folding just isn't remembered
  }
}
