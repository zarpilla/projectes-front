<template>
  <div :id="idName" @click="generate">
    <slot> Download {{ name }} </slot>
  </div>
</template>

<script>
// Local port of vue-json-excel 0.3.0 (MIT, https://github.com/jecovier/vue-json-excel),
// registered globally as <download-excel>. The package is Vue 2 only; this copy
// runs on Vue 2 and Vue 3 and keeps the exported files byte-for-byte identical
// (an HTML table served as application/vnd.ms-excel, or CSV).
import download from "downloadjs";

export default {
  name: "DownloadExcel",
  props: {
    // mime type [xls, csv]
    type: {
      type: String,
      default: "xls"
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
    // filename to export
    name: {
      type: String,
      default: "data.xls"
    },
    fetch: {
      type: Function
    },
    meta: {
      type: Array,
      default: () => []
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
    },
    // long number stringify
    stringifyLongNum: {
      type: Boolean,
      default: false
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
      if (this.type === "html") {
        return this.export(
          this.jsonToXLS(json),
          this.name.replace(".xls", ".html"),
          "text/html"
        );
      } else if (this.type === "csv") {
        return this.export(
          this.jsonToCSV(json),
          this.name.replace(".xls", ".csv"),
          "application/csv"
        );
      }
      return this.export(
        this.jsonToXLS(json),
        this.name,
        "application/vnd.ms-excel"
      );
    },
    async export(data, filename, mime) {
      const blob = this.base64ToBlob(data, mime);
      if (typeof this.beforeFinish === "function") await this.beforeFinish();
      download(blob, filename, mime);
    },
    // Transform json data into an xml document with MS Excel format; Excel shows
    // a format warning when it opens it, which cannot be avoided.
    jsonToXLS(data) {
      const xlsTemp =
        '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta name=ProgId content=Excel.Sheet> <meta name=Generator content="Microsoft Excel 11"><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>${worksheet}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--><style>br {mso-data-placement: same-cell;}</style></head><body><table>${table}</table></body></html>';
      let xlsData = "<thead>";
      const colspan = Object.keys(data[0]).length;

      // Header
      const header = this.header || this.$attrs.title;
      if (header) {
        xlsData += this.parseExtraData(
          header,
          '<tr><th colspan="' + colspan + '">${data}</th></tr>'
        );
      }

      // Fields
      xlsData += "<tr>";
      for (const key in data[0]) {
        xlsData += "<th>" + key + "</th>";
      }
      xlsData += "</tr>";
      xlsData += "</thead>";

      // Data
      xlsData += "<tbody>";
      data.forEach(item => {
        xlsData += "<tr>";
        for (const key in item) {
          xlsData +=
            "<td>" +
            this.preprocessLongNum(this.valueReformattedForMultilines(item[key])) +
            "</td>";
        }
        xlsData += "</tr>";
      });
      xlsData += "</tbody>";

      // Footer
      if (this.footer != null) {
        xlsData += "<tfoot>";
        xlsData += this.parseExtraData(
          this.footer,
          '<tr><td colspan="' + colspan + '">${data}</td></tr>'
        );
        xlsData += "</tfoot>";
      }

      return xlsTemp
        .replace("${table}", xlsData)
        .replace("${worksheet}", this.worksheet);
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
    // newlines become <br/> so they stay in the same cell
    valueReformattedForMultilines(value) {
      if (typeof value == "string") return value.replace(/\n/gi, "<br/>");
      return value;
    },
    preprocessLongNum(value) {
      if (this.stringifyLongNum) {
        if (String(value).startsWith("0x")) {
          return value;
        }
        if (!isNaN(value) && value != "") {
          if (value > 99999999999 || value < 0.0000000000001) {
            return '="' + value + '"';
          }
        }
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
    },
    base64ToBlob(data, mime) {
      const base64 = window.btoa(window.unescape(encodeURIComponent(data)));
      const bstr = atob(base64);
      let n = bstr.length;
      const u8arr = new Uint8ClampedArray(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      return new Blob([u8arr], { type: mime });
    }
  }
};
</script>
