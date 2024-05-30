<template>
  <div class="mt-2">
    <div v-for="(contact, i) in rows" :key="i" class="mb-3 is-flex" label="">
      <b-field
        :label="i === 0 ? 'Entitat' : null"
        style="width: 60%;max-width: 400px;"
        class="mr-3"
      >
        <b-select v-model="contact.contact.id">
          <option v-for="(s, index) in contacts" :key="index" :value="s.id">
            {{ s.name }}
          </option>
        </b-select>
      </b-field>
      <b-field :label="i === 0 ? 'Import' : null" style="width: 20%">
        <b-input v-model="contact.amount" placeholder="Amount" @input="changeValue(contact, 'amount', contact.amount)" />
      </b-field>
      <b-field
        :label="i === 0 ? 'Esborra' : null"
        class="ml-3"
        style="width: 20%"
      >
        <button
          class="button is-small is-danger ml-2"
          type="button"
          @click.prevent="removeContact(i)"
        >
          <b-icon icon="trash-can" size="is-small" />
        </button>
      </b-field>
    </div>
    <button
      class="button is-small is-primary"
      type="button"
      @click.prevent="addContact()"
    >
      <b-icon icon="plus-circle" size="is-small" />
    </button>
  </div>
</template>

<script>
export default {
  props: {
    grantables: {
      type: Array,
      required: true
    },
    contacts: {
      type: Array,
      required: true
    }
  },
  data() {
    return {
      // Add your component-specific data here
      rows: []
    };
  },
  mounted() {
    console.log("mounted");
    this.rows = [...this.grantables];
  },
  methods: {
    // Add your component-specific methods here
    addContact() {
      this.rows.push({
        contact: { id: 0, name: "" },
        amount: 0
      });
      this.$emit("updated", this.rows);
    },
    removeContact(i) {
      this.rows = this.rows.filter((row, index) => index !== i);
      this.$emit("updated", this.rows);
    },
    changeValue(row, field, value) {
      if (value && value.toString().includes(",")) {
        row[field] = value.toString().replace(",", ".");
        this.$emit("updated", this.rows);
      }
    }
  }
};
</script>

<style scoped>
/* Add your component-specific styles here */
</style>
