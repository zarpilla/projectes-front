// html2pdf for the PDFs drawn in the browser (Registre de jornada, Verifactu
// declaration). Imported from its sources, not from dist/: the dist file bundles
// its own jsPDF (4.0.0, with known issues), while the sources use the jspdf we
// install (^4.2.1) and that npm audit checks. It replaces html3pdf (jsPDF 2) and
// html2pdf.js 0.9 (jsPDF 1), issues/382.
export { default } from 'html2pdf.js/src/index.js'
