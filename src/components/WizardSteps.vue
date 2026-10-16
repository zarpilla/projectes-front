<template>
  <!-- Stepper of the redesign: numbered steps with a short explanation; done steps
       show a tick, the current one is highlighted. Steps are 1-based. -->
  <ol class="wizard-steps" :aria-label="label">
    <li
      v-for="(step, index) in steps"
      :key="index"
      class="wizard-step"
      :class="{ 'is-done': index + 1 < current, 'is-current': index + 1 === current }"
      :aria-current="index + 1 === current ? 'step' : null"
    >
      <span class="wizard-marker" aria-hidden="true">
        <b-icon v-if="index + 1 < current" icon="check" custom-size="default" />
        <template v-else>{{ index + 1 }}</template>
      </span>
      <span class="wizard-text">
        <span class="wizard-title">
          <span class="is-sr-only">Pas {{ index + 1 }}{{ index + 1 < current ? ", fet" : "" }}: </span>{{ step.title }}
        </span>
        <span v-if="step.description" class="wizard-description">{{ step.description }}</span>
      </span>
    </li>
  </ol>
</template>

<script>
export default {
  name: 'WizardSteps',
  props: {
    steps: {
      type: Array,
      required: true
    },
    current: {
      type: Number,
      default: 1
    },
    label: {
      type: String,
      default: 'Passos'
    }
  }
}
</script>

<style scoped>
.wizard-steps {
  list-style: none;
  margin: 0 0 1.25rem;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
  gap: .75rem;
}
.wizard-step {
  display: flex;
  align-items: flex-start;
  gap: .75rem;
  padding: .875rem 1rem;
  border: 1px solid var(--a-line);
  border-radius: 12px;
  background: var(--a-surface);
}
.wizard-step.is-current {
  border: 2px solid var(--a-accent);
  padding: calc(.875rem - 1px) calc(1rem - 1px);
  background: #F7FCFB;
}
[data-theme=dark] .wizard-step.is-current {
  background: var(--a-accent-soft);
}
.wizard-marker {
  flex: none;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: .875rem;
  background: var(--a-chip);
  color: var(--a-fg-2);
}
.is-current .wizard-marker {
  background: var(--a-accent);
  color: var(--a-on-accent);
}
.is-done .wizard-marker {
  background: var(--a-accent-soft);
  color: var(--a-accent);
}
.wizard-text {
  display: flex;
  flex-direction: column;
  gap: .125rem;
  min-width: 0;
}
.wizard-title {
  font-weight: 800;
  color: var(--a-fg);
}
.wizard-step:not(.is-current):not(.is-done) .wizard-title {
  color: var(--a-fg-2);
}
.wizard-description {
  font-size: .8125rem;
  color: var(--a-muted);
  line-height: 1.35;
}
</style>
