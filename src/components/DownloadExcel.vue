<template>
  <div :id="idName" @click="generate">
    <slot> Download {{ name }} </slot>
  </div>
</template>

<script>
// Download button registered globally as <download-excel>, with the props of
// vue-json-excel 0.3.0 (MIT, https://github.com/jecovier/vue-json-excel) that
// the app uses. The file is an OpenDocument spreadsheet (.ods) with numeric
// cells for the numbers (issues/032), or a CSV for the templates of the imports.
import download from "downloadjs";
import { buildOds, ODS_MIME } from "@/service/ods";

export default {
  name: "DownloadExcel",
  props: {
    // file format [ods, csv]
    type: {
      type: String,
      default: "ods"
    },
    // Json to download
    data: {
      type: Array,
      required: false,
      default: null
    },
    // fields inside the Json Object that you want to export
    // if no given, all the properties in the Json are exported
    fields: {
      type: Object,
      default: () => null
    },
    // works exactly like fields
    exportFields: {
      type: Object,
      default: () => null
    },
    // Use as fallback when the row has no field values
    defaultValue: {
      type: String,
      required: false,
      default: ""
    },
    // Title(s) for the data, could be a string or an array of strings (multiple titles)
    header: {
      default: null
    },
    // Footer(s) for the data, could be a string or an array of strings (multiple footers)
    footer: {
      default: null
    },
    // filename to export; the extension is set from the format
    name: {
      type: String,
      default: "data"
    },
    fetch: {
      type: Function
    },
    worksheet: {
      type: String,
      default: "Sheet1"
    },
    // event before generate was called
    beforeGenerate: {
      type: Function
    },
    // event before download pops up
    beforeFinish: {
      type: Function
    },
    // Determine if CSV Data should be escaped
    escapeCsv: {
      type: Boolean,
      default: true
    }
  },
  computed: {
    // unique identifier
    idName() {
      return "export_" + new Date().getTime();
    },

    downloadFields() {
      if (this.fields) return this.fields;
      if (this.exportFields) return this.exportFields;
      return undefined;
    }
  },
  methods: {
    async generate() {
      if (typeof this.beforeGenerate === "function") {
        await this.beforeGenerate();
      }
      let data = this.data;
      if (typeof this.fetch === "function" || !data) data = await this.fetch();

      if (!data || !data.length) {
        return;
      }

      const json = this.getProcessedJson(data, this.downloadFields);
      if (this.type === "csv") {
        return this.export(
          new Blob([this.jsonToCSV(json)], { type: "application/csv" }),
          this.fileName("csv"),
          "application/csv"
        );
      }
      return this.export(
        new Blob([this.jsonToODS(json)], { type: ODS_MIME }),
        this.fileName("ods"),
        ODS_MIME
      );
    },
    async export(blob, filename, mime) {
      if (typeof this.beforeFinish === "function") await this.beforeFinish();
      download(blob, filename, mime);
    },
    fileName(extension) {
      return this.name.replace(/\.(xlsx?|ods|csv)$/i, "") + "." + extension;
    },
    // title and footer lines, one per row
    extraRows(extraData) {
      return (Array.isArray(extraData) ? extraData : [extraData])
        .filter(line => line)
        .map(line => [line]);
    },
    jsonToODS(data) {
      const rows = [];
      const header = this.header || this.$attrs.title;
      if (header) rows.push(...this.extraRows(header));
      rows.push(Object.keys(data[0]));
      data.forEach(item => rows.push(Object.values(item)));
      if (this.footer != null) rows.push(...this.extraRows(this.footer));
      return buildOds(rows, this.worksheet);
    },
    jsonToCSV(data) {
      const csvData = [];

      // Header
      const header = this.header || this.$attrs.title;
      if (header) {
        csvData.push(this.parseExtraData(header, "${data}\r\n"));
      }

      // Fields
      for (const key in data[0]) {
        csvData.push(key);
        csvData.push(",");
      }
      csvData.pop();
      csvData.push("\r\n");
      // Data
      data.forEach(item => {
        for (const key in item) {
          let escapedCSV = item[key] + "";
          // cast numbers and other values to string so Excel keeps them as-is
          if (this.escapeCsv) {
            escapedCSV = '="' + escapedCSV + '"';
            if (escapedCSV.match(/[,"\n]/)) {
              escapedCSV = '"' + escapedCSV.replace(/"/g, '""') + '"';
            }
          }
          csvData.push(escapedCSV);
          csvData.push(",");
        }
        csvData.pop();
        csvData.push("\r\n");
      });
      // Footer
      if (this.footer != null) {
        csvData.push(this.parseExtraData(this.footer, "${data}\r\n"));
      }
      return csvData.join("");
    },
    // Only the data to export; all of it when no fields are set
    getProcessedJson(data, header) {
      const keys = this.getKeys(data, header);
      return data.map(item => {
        const newItem = {};
        for (const label in keys) {
          newItem[label] = this.getValue(keys[label], item);
        }
        return newItem;
      });
    },
    getKeys(data, header) {
      if (header) {
        return header;
      }
      const keys = {};
      for (const key in data[0]) {
        keys[key] = key;
      }
      return keys;
    },
    // title and footer to the output format
    parseExtraData(extraData, format) {
      let parseData = "";
      if (Array.isArray(extraData)) {
        for (let i = 0; i < extraData.length; i++) {
          if (extraData[i]) parseData += format.replace("${data}", extraData[i]);
        }
      } else {
        parseData += format.replace("${data}", extraData);
      }
      return parseData;
    },
    getValue(key, item) {
      const field = typeof key !== "object" ? key : key.field;
      const indexes = typeof field !== "string" ? [] : field.split(".");
      let value = this.defaultValue;

      if (!field) value = item;
      else if (indexes.length > 1) value = this.getValueFromNestedItem(item, indexes);
      else value = this.parseValue(item[field]);

      if (Object.prototype.hasOwnProperty.call(key, "callback")) {
        value = this.getValueFromCallback(value, key.callback);
      }

      return value;
    },
    getValueFromNestedItem(item, indexes) {
      let nestedItem = item;
      for (const index of indexes) {
        if (nestedItem) nestedItem = nestedItem[index];
      }
      return this.parseValue(nestedItem);
    },
    getValueFromCallback(item, callback) {
      if (typeof callback !== "function") return this.defaultValue;
      return this.parseValue(callback(item));
    },
    parseValue(value) {
      return value || value === 0 || typeof value === "boolean"
        ? value
        : this.defaultValue;
    }
  }
};
</script>
