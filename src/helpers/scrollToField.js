import { nextTick } from "vue";

// Brings the field that stops a save into view. Forms hide behind isLoading
// while submitting, so it waits for them to render again.
//
//   getRoot   returns the form element (null when it is not on screen)
//   selector  the field to show; without it (or when it is not found), the
//             first field marked is-danger
export async function scrollToField (getRoot, selector) {
  await nextTick();
  const root = getRoot();
  if (!root) return;
  const target =
    (selector && root.querySelector(selector)) ||
    root.querySelector(".field .is-danger");
  const field = target && (target.closest(".field") || target);
  if (!field) return;
  field.scrollIntoView({ behavior: "smooth", block: "center" });
  // an autocomplete opens its list on focus, so it only gets scrolled to
  if (field.querySelector(".autocomplete")) return;
  const input = field.querySelector(
    "input:not([disabled]), select:not([disabled]), textarea:not([disabled])"
  );
  if (input) input.focus({ preventScroll: true });
}
