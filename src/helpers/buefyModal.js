// A b-modal closed and opened again at once (Cancel·la, Escape or a click
// outside, then the button that opens it) was emptied a moment later. At the
// end of the closing animation Buefy's afterLeave sets `destroyed`
// (destroyOnHide), which takes the content out with an animation of its own;
// reopening cuts that one short, Vue then calls afterLeave again, and the
// modal that is open again lost its content: it left the DOM, and its
// datepicker threw on a click («Cannot read properties of null (reading
// 'isActive')»). issues/336.
//
// After this, a b-modal only drops its content when it is still closed at the
// end of the animation. Buefy's own component is changed (once), so it holds
// for the modals of the templates and the programmatic ones alike.
export function keepReopenedModals (app) {
  const BModal = app.component('BModal')
  if (!BModal || !BModal.methods || BModal.methods.afterLeave.keepsReopened) return
  const afterLeave = BModal.methods.afterLeave
  const patched = function () {
    if (this.isActive) {
      this.$emit('after-leave')
      return
    }
    return afterLeave.call(this)
  }
  patched.keepsReopened = true
  BModal.methods.afterLeave = patched
}
