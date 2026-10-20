<template>
  <!-- issues/055: a Buefy datepicker draws its whole calendar (month, year
       selector with a hundred options...) inside its closed dropdown. A budget
       with hundreds of lines had 150,000 of those elements. This shows the same
       input, and puts the real datepicker (with every attribute and listener
       given here) in its place as soon as the pointer is over it or it gets the
       focus, before it can be clicked or typed in. -->
  <b-datepicker v-if="active" ref="picker" v-bind="$attrs" />
  <div
    v-else
    class="datepicker control lazy-datepicker"
    @mouseenter="activate()"
    @touchstart.passive="activate()"
    @focusin="activate($event)"
  >
    <div class="dropdown dropdown-menu-animation is-mobile-modal" :class="{ 'is-disabled': isDisabled() }">
      <div :tabindex="isDisabled() ? undefined : -1" class="dropdown-trigger" aria-haspopup="true">
        <b-input
          autocomplete="off"
          :model-value="formattedValue()"
          :placeholder="$attrs.placeholder"
          :icon="$attrs.icon"
          :disabled="isDisabled() || undefined"
          :readonly="!isEditable()"
          :use-html5-validation="false"
        />
      </div>
    </div>
  </div>
</template>

<script>
import { datepickerFormatter } from "@/helpers/datepickerFormat";

// a boolean attribute given without value arrives as ""
const isOn = value => value !== undefined && value !== null && value !== false;

export default {
  name: "LazyDatepicker",
  inheritAttrs: false,
  data() {
    return {
      active: false
    };
  },
  // methods, not computed: $attrs is not reactive (the render reads them anew)
  methods: {
    isDisabled() {
      return isOn(this.$attrs.disabled);
    },
    isEditable() {
      return isOn(this.$attrs.editable);
    },
    // as the datepicker shows it (the app's formatter, buefyConfig.js)
    formattedValue() {
      const value = this.$attrs.modelValue;
      return value && !isNaN(value.valueOf()) ? datepickerFormatter(value) : null;
    },
    // focusEvent: the focus came to this input (e.g. with Tab): it moves to the
    // datepicker's input, with the same text selected (all of it after a Tab)
    activate(focusEvent) {
      if (this.active) return;
      const source = focusEvent && focusEvent.target;
      const selection = source && typeof source.selectionStart === "number"
        ? [source.selectionStart, source.selectionEnd, source.selectionDirection]
        : null;
      this.active = true;
      if (!focusEvent) return;
      this.$nextTick(() => {
        const input = this.$refs.picker && this.$refs.picker.$el && this.$refs.picker.$el.querySelector("input");
        if (!input) return;
        input.focus();
        if (selection && typeof input.setSelectionRange === "function") {
          input.setSelectionRange(...selection);
        }
      });
    }
  }
};
</script>
