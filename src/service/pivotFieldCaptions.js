// Relabel rendered pivot field names to friendly Catalan captions.
//
// WHY THIS EXISTS
// Classic Kendo PivotGrid (the project ships v2019.2.619) builds the field
// catalog with `caption: schema.cube.dimensions[field].caption || field`, BUT
// the rendering template for both the setting chips and the grid header buttons
// is `<div data-kendo-name="${data.name || data}">${data.name || data}</div>`
// — i.e. it always emits the raw field name and ignores `caption`. So for local
// data sources `schema.cube.dimensions.*.caption` has no visible effect and the
// grid shows raw endpoint field names ("project_state", "project_name", ...).
//
// The fix recommended by Telerik for client-side cubes is to rewrite the label
// text in the dataBound event. relabelFields(captions) returns such a handler.
//
// USAGE
//   import { relabelFields } from '@/service/pivotFieldCaptions'
//   const fieldCaptions = { project_state: 'Estat', project_name: 'Projecte' }
//   const config = { ..., dataBound: relabelFields(fieldCaptions) }
//
// `captions` maps raw field name -> Catalan label. Only the bare text node that
// equals the field name is replaced, so any button icons are preserved. Fields
// not currently on an axis simply produce no match, so it is safe to include
// the whole dimension set.
export function relabelFields (captions) {
  return function relabelPivotFields () {
    const $ = window.jQuery
    if (!$ || !captions) return
    const root = this.element ? this.element : $(this)
    Object.keys(captions).forEach(function (field) {
      const label = captions[field]
      // Header buttons are <a class="k-button" data-name="field">; setting chips
      // are <div data-name="field">. Matching on [data-name] covers both.
      root.find('[data-name="' + field + '"]').each(function () {
        $(this).contents().filter(function () {
          return this.nodeType === 3 && $.trim(this.nodeValue) === field
        }).replaceWith(label)
      })
    })
  }
}
