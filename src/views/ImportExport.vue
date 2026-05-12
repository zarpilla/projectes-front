<template>
  <section class="section">
    <b-loading
      :is-full-page="true"
      v-model="isLoading"
      :can-cancel="false"
    ></b-loading>

    <h1 class="title">Importar/Exportar Dades</h1>

    <!-- Export Section -->
    <div class="box mb-5">
      <h2 class="subtitle">Exportar Dades</h2>
      <p class="mb-4">
        Exporta les dades en format CSV per poder-les importar més tard o
        treballar-les externament.
      </p>

      <div class="buttons">
        <b-button
          type="is-primary"
          icon-left="download"
          :loading="isLoadingExport"
          @click="exportContactsCSV"
        >
          Exportar Contactes
        </b-button>

        <!-- <download-excel
          class="export"
          :data="userContactsExport"
          :escapeCsv="false"
          :name="userContactsExportFilename"
          :fields="csvFieldsExport"
          type="csv"
        >
          <b-button
            type="is-primary"
            icon-left="download"
            :loading="isLoadingUserContactsExport"
            @click="loadUserContactsForExport"
          >
            Exportar Punts d'Entrega
          </b-button>
        </download-excel> -->
      </div>
    </div>

    <!-- Import Section -->
    <div class="box">
      <h2 class="subtitle">Importar Dades</h2>
      <p class="mb-4">
        Importa dades des d'un fitxer CSV. El sistema detectarà automàticament
        el tipus de dades segons el nom del fitxer (contacts-*, user-contacts-*).
      </p>

      <file-upload
        v-if="!previewData.length"
        entity="contacts"
        refId="0"
        field="import"
        :multiple="false"
        accept=".csv"
        :preUpload="null"
        @uploaded="handleFileUploaded"
        :message="'Arrossega el fitxer CSV aquí<br />o fes clic per seleccionar'"
      />

      <!-- Preview and Warnings -->
      <div v-if="previewData.length && !importComplete" class="mt-5">
        <h3 class="subtitle is-4">Previsualització de les Dades</h3>

        <div class="notification is-info mb-4">
          <p>
            <strong>{{ previewData.length }}</strong> registres detectats
            <span v-if="importType === 'contacts'">(Contactes)</span>
            <span v-else-if="importType === 'user-contacts'">(Punts d'Entrega)</span>
          </p>
          <p v-if="warnings.length" class="mt-2">
            <b-icon icon="alert" type="is-warning"></b-icon>
            <strong>{{ warnings.length }}</strong> avisos detectats
          </p>
        </div>

        <!-- Warnings -->
        <div v-if="warnings.length" class="notification is-warning mb-4">
          <h4 class="subtitle is-5">Avisos</h4>
          <ul>
            <li v-for="(warning, idx) in warnings" :key="idx" class="mb-2">
              <b-icon icon="alert" size="is-small"></b-icon>
              {{ warning }}
            </li>
          </ul>
        </div>

        <!-- Preview Table -->
        <div class="table-container mb-4">
          <table class="table is-striped is-fullwidth is-narrow">
            <thead>
              <tr>
                <th>Línia</th>
                <th>Nom</th>
                <th>NIF</th>
                <th>Telèfon</th>
                <th>Email</th>
                <th>Estat</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, idx) in previewData.slice(0, 10)"
                :key="idx"
                :class="{ 'has-background-warning-light': row.warning }"
              >
                <td>{{ idx + 1 }}</td>
                <td>{{ row.name || row.trade_name }}</td>
                <td>{{ row.nif }}</td>
                <td>{{ row.phone }}</td>
                <td>{{ row.email }}</td>
                <td>
                  <b-tag v-if="row.warning" type="is-warning">⚠️ {{ row.warning }}</b-tag>
                  <b-tag v-else-if="row.isUpdate" type="is-info">Actualitzar</b-tag>
                  <b-tag v-else type="is-success">Nou</b-tag>
                </td>
              </tr>
            </tbody>
          </table>
          <p v-if="previewData.length > 10" class="has-text-grey">
            Mostrant 10 de {{ previewData.length }} registres
          </p>
        </div>

        <!-- Action Buttons -->
        <div class="buttons">
          <b-button type="is-danger" @click="cancelImport">Cancel·lar</b-button>
          <b-button
            type="is-primary"
            @click="confirmImport"
            :loading="isImporting"
          >
            Confirmar Importació
          </b-button>
        </div>
      </div>

      <!-- Import Complete -->
      <div v-if="importComplete" class="notification is-success">
        <p>
          <b-icon icon="check-circle"></b-icon>
          <strong>Importació completada amb èxit!</strong>
        </p>
        <p class="mt-2">
          S'han importat {{ importStats.created }} nous registres i s'han
          actualitzat {{ importStats.updated }} registres existents.
        </p>
        <b-button class="mt-3" @click="resetImport">Importar més dades</b-button>
      </div>
    </div>
  </section>
</template>

<script>
import service from "@/service/index";
import FileUpload from "@/components/FileUpload.vue";
import moment from "moment";

export default {
  name: "ImportExport",
  components: {
    FileUpload,
  },
  data() {
    return {
      isLoading: false,
      isLoadingExport: false,
      isLoadingUserContactsExport: false,
      isImporting: false,
      contactsExport: [],
      userContactsExport: [],
      previewData: [],
      warnings: [],
      importType: null,
      importComplete: false,
      importStats: {
        created: 0,
        updated: 0,
      },
      existingContacts: [],
      csvFieldsExport: {
        id: "id",
        name: "name",
        trade_name: "trade_name",
        nif: "nif",
        phone: "phone",
        email: "email",
        address: "address",
        city: "city",
        postcode: "postcode",
        state: "state",
        country: "country",
        legal_form_id: "legal_form.id",
        sector_id: "sector.id",
        contact_person: "contact_person",
        contact_phone: "contact_phone",
        contact_email: "contact_email",
        web: "website",
        owner_id: "owner.id",
        time_slot_1_ini: "time_slot_1_ini",
        time_slot_1_end: "time_slot_1_end",
        time_slot_2_ini: "time_slot_2_ini",
        time_slot_2_end: "time_slot_2_end",
        notes: "notes",
        multiowner: "multiowner",
        multidelivery: "multidelivery",
        pickup_discount: "pickup_discount",
        pickup_point: "pickup_point",
        notes_delivery: "notes_delivery",
      },
    };
  },
  computed: {
    contactsExportFilename() {
      return `contacts-${moment().format("YYYYMMDD-HHmmss")}.csv`;
    },
    userContactsExportFilename() {
      return `user-contacts-${moment().format("YYYYMMDD-HHmmss")}.csv`;
    },
  },
  methods: {
    async exportContactsCSV() {
      this.isLoadingExport = true;
      try {
        const response = await service({ requiresAuth: true }).get(
          "contacts?_limit=-1&_where[owner_null]=true"
        );
        const contacts = response.data || [];
        
        // Generate CSV with semicolon delimiter
        const headers = [
          "id", "name", "trade_name", "nif", "phone", "email", "address", 
          "city", "postcode", "state", "country", "legal_form_id", "sector_id",
          "contact_person", "contact_phone", "contact_email", "web", "owner_id",
          "time_slot_1_ini", "time_slot_1_end", "time_slot_2_ini", "time_slot_2_end",
          "notes", "multiowner", "multidelivery", "pickup_discount", "pickup_point", 
          "notes_delivery", "contact_types"
        ];
        
        let csv = headers.join(";") + "\n";
        
        contacts.forEach(contact => {
          const row = [
            contact.id || "",
            contact.name || "",
            contact.trade_name || "",
            contact.nif || "",
            contact.phone || "",
            contact.email || "",
            contact.address || "",
            contact.city || "",
            contact.postcode || "",
            contact.state || "",
            contact.country || "",
            contact.legal_form?.id || "",
            contact.sector?.id || "",
            contact.contact_person || "",
            contact.contact_phone || "",
            contact.contact_email || "",
            contact.website || "",
            contact.owner?.id || "",
            contact.time_slot_1_ini || "",
            contact.time_slot_1_end || "",
            contact.time_slot_2_ini || "",
            contact.time_slot_2_end || "",
            contact.notes || "",
            contact.multiowner || "",
            contact.multidelivery || "",
            contact.pickup_discount || "",
            contact.pickup_point || "",
            contact.notes_delivery || "",
            contact.contact_types?.map(ct => ct.id).join(",") || ""
          ];
          csv += row.join(";") + "\n";
        });
        
        // Download CSV
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = this.contactsExportFilename;
        link.click();
        
        this.$buefy.toast.open({
          message: "Contactes exportats correctament",
          type: "is-success",
        });
      } catch (error) {
        console.error("Error exporting contacts:", error);
        this.$buefy.toast.open({
          message: "Error exportant contactes",
          type: "is-danger",
        });
      } finally {
        this.isLoadingExport = false;
      }
    },
    async loadContactsForExport() {
      this.isLoadingExport = true;
      try {
        const response = await service({ requiresAuth: true }).get(
          "contacts?_limit=-1&_where[owner_null]=true"
        );
        this.contactsExport = response.data || [];
        this.$buefy.toast.open({
          message: "Contactes carregats per exportar",
          type: "is-success",
        });
      } catch (error) {
        console.error("Error loading contacts:", error);
        this.$buefy.toast.open({
          message: "Error carregant contactes",
          type: "is-danger",
        });
      } finally {
        this.isLoadingExport = false;
      }
    },
    async loadUserContactsForExport() {
      this.isLoadingUserContactsExport = true;
      try {
        const response = await service({ requiresAuth: true }).get(
          "contacts?_limit=-1&_where[owner_ne]=null"
        );
        this.userContactsExport = response.data || [];
        this.$buefy.toast.open({
          message: "Punts d'entrega carregats per exportar",
          type: "is-success",
        });
      } catch (error) {
        console.error("Error loading user contacts:", error);
        this.$buefy.toast.open({
          message: "Error carregant punts d'entrega",
          type: "is-danger",
        });
      } finally {
        this.isLoadingUserContactsExport = false;
      }
    },
    async handleFileUploaded(event) {
      this.isLoading = true;
      try {
        const file = event.fileList[0];
        const fileName = file.name.toLowerCase();

        // Detect import type from filename
        if (fileName.startsWith("contacts-") || fileName.startsWith("contact-")) {
          this.importType = "contacts";
        } else if (fileName.startsWith("user-contacts-") || fileName.startsWith("user-contact-")) {
          this.importType = "user-contacts";
        } else {
          this.$buefy.toast.open({
            message: "No s'ha pogut detectar el tipus de fitxer. Utilitza 'contacts-' o 'user-contacts-' com a prefix.",
            type: "is-warning",
          });
          this.isLoading = false;
          return;
        }

        // Read file content
        const content = await this.readFileContent(file);
        
        // Parse CSV manually
        const records = this.parseCSV(content);

        // Load existing contacts for duplicate detection
        await this.loadExistingContacts();

        // Process and validate records
        this.previewData = this.processRecords(records);
        this.warnings = this.generateWarnings();
        
        this.isLoading = false;

      } catch (error) {
        console.error("Error processing file:", error);
        this.$buefy.toast.open({
          message: "Error processant el fitxer CSV",
          type: "is-danger",
        });
        this.isLoading = false;
      }
    },
    parseCSV(content) {
      // Detect delimiter (comma or semicolon)
      const firstLine = content.split('\n')[0];
      const delimiter = firstLine.includes(';') ? ';' : ',';
      
      // Split by lines
      const lines = content.split('\n').filter(line => line.trim());
      if (lines.length === 0) return [];
      
      // Parse a CSV line considering quotes
      const parseLine = (line) => {
        const values = [];
        let currentValue = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          const nextChar = line[i + 1];
          
          if (char === '"' && nextChar === '"') {
            // Escaped quote
            currentValue += '"';
            i++; // Skip next quote
          } else if (char === '"') {
            // Toggle quote mode
            inQuotes = !inQuotes;
          } else if (char === delimiter && !inQuotes) {
            // End of field
            values.push(currentValue);
            currentValue = '';
          } else {
            currentValue += char;
          }
        }
        values.push(currentValue); // Add last value
        
        return values.map(v => v.trim());
      };
      
      // Get headers from first line
      const headers = parseLine(lines[0]);
      
      // Parse data rows
      const records = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;
        
        const values = parseLine(line);
        
        // Create record object
        const record = {};
        headers.forEach((header, idx) => {
          if (values[idx] !== undefined) {
            record[header] = values[idx];
          }
        });
        
        // Only add if record has at least one non-empty value
        if (Object.values(record).some(v => v && v.trim())) {
          records.push(record);
        }
      }
      
      return records;
    },
    readFileContent(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsText(file);
      });
    },
    async loadExistingContacts() {
      const whereClause =
        this.importType === "user-contacts"
          ? "&_where[owner_ne]=null"
          : "&_where[owner_null]=true";
      
      const response = await service({ requiresAuth: true }).get(
        `contacts?_limit=-1${whereClause}`
      );
      this.existingContacts = response.data || [];
    },
    processRecords(records) {
      return records.map((record) => {
        const processed = { ...record };
        
        // Check for duplicates by NIF
        if (record.nif) {
          const duplicateByNif = this.existingContacts.find(
            (c) => c.nif && c.nif.toLowerCase() === record.nif.toLowerCase()
          );
          if (duplicateByNif) {
            processed.warning = `NIF duplicat (ID: ${duplicateByNif.id})`;
            processed.isUpdate = true;
            processed.existingId = duplicateByNif.id;
          }
        }
        
        // Check for duplicates by name (if no NIF duplicate)
        if (!processed.warning && (record.name || record.trade_name)) {
          const nameToCheck = (record.name || record.trade_name).toLowerCase();
          const duplicateByName = this.existingContacts.find(
            (c) =>
              (c.name && c.name.toLowerCase() === nameToCheck) ||
              (c.trade_name && c.trade_name.toLowerCase() === nameToCheck)
          );
          if (duplicateByName) {
            processed.warning = `Nom duplicat (ID: ${duplicateByName.id})`;
            processed.isUpdate = true;
            processed.existingId = duplicateByName.id;
          }
        }

        return processed;
      });
    },
    generateWarnings() {
      const warnings = [];
      const duplicateNifs = this.previewData.filter((r) =>
        r.warning?.includes("NIF duplicat")
      );
      const duplicateNames = this.previewData.filter((r) =>
        r.warning?.includes("Nom duplicat")
      );

      if (duplicateNifs.length) {
        warnings.push(
          `${duplicateNifs.length} registre(s) amb NIF duplicat. S'actualitzaran els registres existents.`
        );
      }
      if (duplicateNames.length) {
        warnings.push(
          `${duplicateNames.length} registre(s) amb nom duplicat. S'actualitzaran els registres existents.`
        );
      }

      return warnings;
    },
    async confirmImport() {
      this.$buefy.dialog.confirm({
        title: "Confirmar Importació",
        message: `Estàs segur que vols importar ${this.previewData.length} registres?${
          this.warnings.length ? "<br><br><strong>Hi ha avisos que cal revisar.</strong>" : ""
        }`,
        confirmText: "Importar",
        cancelText: "Cancel·lar",
        type: "is-primary",
        hasIcon: true,
        onConfirm: () => this.executeImport(),
      });
    },
    async executeImport() {
      this.isImporting = true;
      this.importStats = { created: 0, updated: 0 };

      try {
        for (const record of this.previewData) {
          const contactData = this.prepareContactData(record);

          if (record.existingId) {
            // Update existing contact
            await service({ requiresAuth: true }).put(
              `contacts/${record.existingId}`,
              contactData
            );
            this.importStats.updated++;
          } else {
            // Create new contact
            await service({ requiresAuth: true }).post("contacts", contactData);
            this.importStats.created++;
          }
        }

        this.importComplete = true;
        this.$buefy.toast.open({
          message: "Importació completada amb èxit",
          type: "is-success",
        });
      } catch (error) {
        console.error("Error importing data:", error);
        this.$buefy.toast.open({
          message: "Error durant la importació",
          type: "is-danger",
        });
      } finally {
        this.isImporting = false;
      }
    },
    prepareContactData(record) {
      const data = {
        name: record.name || null,
        trade_name: record.trade_name || null,
        nif: record.nif || null,
        phone: record.phone || null,
        email: record.email || null,
        address: record.address || null,
        city: record.city || null,
        postcode: record.postcode || null,
        state: record.state || null,
        country: record.country || null,
        contact_person: record.contact_person || null,
        contact_phone: record.contact_phone || null,
        contact_email: record.contact_email || null,
        website: record.web || null,
        notes: record.notes || null,
        time_slot_1_ini: record.time_slot_1_ini ? parseFloat(record.time_slot_1_ini) : null,
        time_slot_1_end: record.time_slot_1_end ? parseFloat(record.time_slot_1_end) : null,
        time_slot_2_ini: record.time_slot_2_ini ? parseFloat(record.time_slot_2_ini) : null,
        time_slot_2_end: record.time_slot_2_end ? parseFloat(record.time_slot_2_end) : null,
        multiowner: record.multiowner === "true" || record.multiowner === "1",
        multidelivery: record.multidelivery === "true" || record.multidelivery === "1",
        pickup_point: record.pickup_point === "true" || record.pickup_point === "1",
        pickup_discount: record.pickup_discount ? parseFloat(record.pickup_discount) : null,
        notes_delivery: record.notes_delivery || null,
      };

      // Add relations by ID if provided
      if (record.legal_form_id && !isNaN(record.legal_form_id)) {
        data.legal_form = parseInt(record.legal_form_id);
      }
      if (record.sector_id && !isNaN(record.sector_id)) {
        data.sector = parseInt(record.sector_id);
      }
      if (record.owner_id && !isNaN(record.owner_id)) {
        data.owner = parseInt(record.owner_id);
      }
      
      // Handle contact_types (comma-separated IDs)
      if (record.contact_types) {
        const contactTypeIds = record.contact_types
          .split(",")
          .map(id => id.trim())
          .filter(id => id && !isNaN(id))
          .map(id => parseInt(id));
        if (contactTypeIds.length > 0) {
          data.contact_types = contactTypeIds;
        }
      }

      return data;
    },
    cancelImport() {
      this.previewData = [];
      this.warnings = [];
      this.importType = null;
    },
    resetImport() {
      this.previewData = [];
      this.warnings = [];
      this.importType = null;
      this.importComplete = false;
      this.importStats = { created: 0, updated: 0 };
    },
  },
};
</script>

<style scoped>
.box {
  background-color: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 3px rgba(10, 10, 10, 0.1);
}

.table-container {
  max-height: 400px;
  overflow-y: auto;
}

.has-background-warning-light {
  background-color: #fffbeb !important;
}
</style>
