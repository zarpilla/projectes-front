<!-- The attachments of a project or a document as a table: a small thumbnail
     for images, a file-type icon for the rest, then name, size and upload date.
     Removing one only drops it from the form; it goes when the form is saved.
     `pending`: files picked but not uploaded yet (a task uploads them when
     saved), listed last. In a narrow box (the side card of an invoice) size and date move under the
     name. -->
<template>
  <div v-if="(documents && documents.length) || pending.length" class="attachments">
    <table class="attachments-table">
      <thead>
        <tr>
          <th class="att-thumb"><span class="is-sr-only">Tipus</span></th>
          <th>Nom</th>
          <th class="att-size">Mida</th>
          <th class="att-date">Pujat</th>
          <th class="att-actions"><span class="is-sr-only">Accions</span></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="doc in documents" :key="doc.id">
          <td class="att-thumb">
            <a :href="href(doc)" target="_blank" rel="noopener" tabindex="-1" aria-hidden="true">
              <img
                v-if="thumbnail(doc) && !broken[doc.id]"
                :src="thumbnail(doc)"
                alt=""
                loading="lazy"
                @error="broken[doc.id] = true"
              />
              <span v-else class="att-icon" :class="'is-' + fileKind(doc).tone">
                <b-icon :icon="fileKind(doc).icon" size="is-small" />
              </span>
            </a>
          </td>
          <td class="att-name">
            <a :href="href(doc)" target="_blank" rel="noopener" :title="doc.name">{{ doc.name }}</a>
            <small class="att-meta">{{ meta(doc) }}</small>
          </td>
          <td class="att-size">{{ fileSize(doc.size) }}</td>
          <td class="att-date">{{ uploadDate(doc) }}</td>
          <td class="att-actions">
            <button
              type="button"
              class="att-remove"
              :title="`Treu ${doc.name}`"
              :aria-label="`Treu ${doc.name}`"
              @click="$emit('remove', doc)"
            >
              <b-icon icon="close" size="is-small" />
            </button>
          </td>
        </tr>
        <tr v-for="(file, k) in pending" :key="'p' + k" class="is-pending">
          <td class="att-thumb">
            <span class="att-icon"><b-icon icon="upload" size="is-small" /></span>
          </td>
          <td class="att-name">
            <span class="att-file" :title="file.name">{{ file.name }}</span>
            <small class="att-meta">{{ pendingMeta(file) }}</small>
          </td>
          <td class="att-size">{{ fileSize(file.size / 1024) }}</td>
          <td class="att-date">Pendent</td>
          <td class="att-actions">
            <button
              type="button"
              class="att-remove"
              :title="`Treu ${file.name}`"
              :aria-label="`Treu ${file.name}`"
              @click="$emit('remove-pending', k)"
            >
              <b-icon icon="close" size="is-small" />
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
import moment from "moment";

// extension → icon and colour; anything else is a plain document
const KINDS = [
  { exts: ["pdf"], icon: "file-pdf", tone: "pdf" },
  { exts: ["doc", "docx", "odt", "rtf"], icon: "file-word", tone: "word" },
  { exts: ["xls", "xlsx", "ods", "csv"], icon: "file-excel", tone: "sheet" },
  { exts: ["ppt", "pptx", "odp"], icon: "file-powerpoint", tone: "slides" },
  { exts: ["zip", "rar", "7z", "gz", "tar"], icon: "folder-zip", tone: "plain" },
  { exts: ["xml", "xsig", "json", "html"], icon: "file-code", tone: "plain" }
];

const extOf = doc => String(doc?.ext || (doc?.name || "").match(/\.[^.]+$/)?.[0] || "")
  .replace(/^\./, "")
  .toLowerCase();

export function fileKind(doc) {
  const ext = extOf(doc);
  const mime = doc?.mime || "";
  if (mime.startsWith("image/")) return { icon: "file-image", tone: "image" };
  if (mime.startsWith("video/")) return { icon: "file-video", tone: "plain" };
  if (mime.startsWith("audio/")) return { icon: "file-music", tone: "plain" };
  if (mime === "application/pdf") return { icon: "file-pdf", tone: "pdf" };
  const kind = KINDS.find(k => k.exts.includes(ext));
  return kind ? { icon: kind.icon, tone: kind.tone } : { icon: "file-document-outline", tone: "plain" };
}

// Strapi keeps the size in kB
export function fileSize(kb) {
  const n = Number(kb);
  if (!Number.isFinite(n) || n <= 0) return "";
  if (n < 1024) return `${Math.max(1, Math.round(n))} kB`;
  return `${(n / 1024).toLocaleString("ca-ES", { maximumFractionDigits: 1 })} MB`;
}

export default {
  name: "AttachmentsTable",
  props: {
    documents: { type: Array, default: () => [] },
    // browser File objects (size in bytes)
    pending: { type: Array, default: () => [] },
    // the files' urls are relative to the API
    apiUrl: { type: String, default: "" }
  },
  emits: ["remove", "remove-pending"],
  data() {
    // images whose thumbnail the browser can't show (e.g. HEIC) get the icon
    return { broken: {} };
  },
  methods: {
    fileKind,
    fileSize,
    href(doc) {
      return this.apiUrl + doc.url;
    },
    // Strapi's small "thumbnail" format when there is one, so a 5 MB photo
    // isn't downloaded to draw 32 pixels
    thumbnail(doc) {
      if (!(doc.mime || "").startsWith("image/")) return null;
      const url = doc.formats?.thumbnail?.url || doc.url;
      return url ? this.apiUrl + url : null;
    },
    uploadDate(doc) {
      return doc.createdAt ? moment(doc.createdAt).format("DD/MM/YYYY") : "";
    },
    meta(doc) {
      const ext = extOf(doc).toUpperCase();
      return [ext, fileSize(doc.size), this.uploadDate(doc)].filter(Boolean).join(" · ");
    },
    pendingMeta(file) {
      return [fileSize(file.size / 1024), "pendent de pujar"].filter(Boolean).join(" · ");
    }
  }
};
</script>

<style scoped>
.attachments {
  container-type: inline-size;
  width: 100%;
  margin-bottom: .5rem;
}
.attachments-table {
  width: 100%;
  border-collapse: collapse;
  font-size: .875rem;
}
.attachments-table th {
  position: relative; /* keeps the .is-sr-only labels inside the table */
  padding: .375rem .5rem;
  border-bottom: 1px solid var(--a-line);
  color: var(--a-muted);
  font-size: .75rem;
  font-weight: 700;
  text-align: left;
  white-space: nowrap;
}
.attachments-table td {
  padding: .375rem .5rem;
  border-bottom: 1px solid var(--a-line-soft);
  vertical-align: middle;
}
.attachments-table tbody tr:last-child td {
  border-bottom: 0;
}
.attachments-table tbody tr:hover td {
  background: var(--a-thead);
}
.att-thumb {
  width: calc(32px + 1rem);
}
.att-thumb a {
  display: block;
  width: 32px;
  height: 32px;
}
.att-thumb img {
  display: block;
  width: 32px;
  height: 32px;
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid var(--a-line);
  background: var(--a-surface);
}
.att-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 4px;
  color: var(--a-muted);
  background: color-mix(in srgb, currentColor 12%, transparent);
}
.att-icon.is-pdf { color: var(--a-neg); }
.att-icon.is-word { color: var(--a-info-fg); }
.att-icon.is-sheet { color: var(--a-pos); }
.att-icon.is-slides { color: var(--a-over); }
.att-icon.is-image { color: var(--a-accent); }
.att-name {
  max-width: 0; /* lets a long name shrink and end in an ellipsis */
  width: 100%;
}
.att-name a,
.att-file {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--a-fg);
  font-weight: 600;
}
.is-pending .att-file {
  color: var(--a-fg-2);
  font-weight: 400;
}
.is-pending .att-date {
  font-style: italic;
}
.is-pending .att-icon {
  background: transparent;
  outline: 1px dashed var(--a-line);
  outline-offset: -1px;
}
.att-name a:hover {
  color: var(--a-accent);
  text-decoration: underline;
}
.att-meta {
  display: none;
  color: var(--a-muted);
  font-size: .75rem;
}
.att-size,
.att-date {
  color: var(--a-muted);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.attachments-table td.att-size {
  text-align: right;
}
.attachments-table th.att-size {
  text-align: right;
}
.att-actions {
  width: 1%;
  text-align: right;
}
.att-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--a-muted);
  cursor: pointer;
}
.att-remove:hover,
.att-remove:focus-visible {
  background: var(--a-danger-bg);
  color: var(--a-danger-fg);
}
/* a narrow box: no header, size and date under the name */
@container (max-width: 30rem) {
  .attachments-table thead,
  .att-size,
  .att-date {
    display: none;
  }
  .att-meta {
    display: block;
  }
}
</style>
