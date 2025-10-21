import service from "@/service/index";
import { get } from "lodash";
import moment from "moment";

const getData  = async () => {
  const invoices = await service({ requiresAuth: true, cached: false }).get("/emitted-invoices?_limit=-1&_sort=emitted:DESC&_where[state_ne]=draft")
  invoices.data.map(invoice => {    
    invoice.contasol_tipo = invoice.serial && invoice.serial.rectificative ? 3 : 1 // serial.rectificative => 3 else 1
    invoice.contasol_emitted = invoice.emitted ? moment(invoice.emitted, 'YYYY-MM-DD').format('DD-MM-YYYY') : ''
    invoice.contasol_paybefore = invoice.paybefore ? moment(invoice.paybefore, 'YYYY-MM-DD').format('DD-MM-YYYY') : ''
    invoice.contasol_state = invoice.paid ? 1 : 0
    invoice.contasol_sent = invoice.sent ? 1 : 0
    invoice.contasol_vat_percentage = invoice.lines && invoice.lines.length > 0 ? (invoice.lines.reduce((acc, line) => acc + (line.vat || 0), 0) / invoice.lines.length).toFixed(2) : 0
    invoice.contasol_irpf_percentage = invoice.lines && invoice.lines.length > 0 ? (invoice.lines.reduce((acc, line) => acc + (line.irpf || 0), 0) / invoice.lines.length).toFixed(2) : 0
    return invoice;
  });

  const incomes = await service({ requiresAuth: true, cached: false }).get("/received-incomes?_limit=-1&_sort=emitted:DESC")
  incomes.data.map(income => {    
    income.contasol_tipo = 2 // simplificada
    income.contasol_emitted = income.emitted ? moment(income.emitted, 'YYYY-MM-DD').format('DD-MM-YYYY') : ''
    income.contasol_paybefore = income.paybefore ? moment(income.paybefore, 'YYYY-MM-DD').format('DD-MM-YYYY') : ''
    income.contasol_state = income.paid ? 1 : 0
    income.contasol_sent = income.sent ? 1 : 0
    income.contasol_vat_percentage = income.lines && income.lines.length > 0 ? (income.lines.reduce((acc, line) => acc + (line.vat || 0), 0) / income.lines.length).toFixed(2) : 0
    income.contasol_irpf_percentage = income.lines && income.lines.length > 0 ? (income.lines.reduce((acc, line) => acc + (line.irpf || 0), 0) / income.lines.length).toFixed(2) : 0
    return income;
  });

  const documents = [...invoices.data, ...incomes.data];
  return documents;
}


// ===== VAT HELPERS (repercuted VAT for emitted invoices & received incomes) =====
const processVATLines = (lines, documentTotals) => {
  const vatGroups = {};
  if (!lines || lines.length === 0) {
    if (documentTotals.total_base || documentTotals.total_vat) {
      const estimatedRate = documentTotals.total_vat && documentTotals.total_base
        ? Math.round((documentTotals.total_vat / documentTotals.total_base) * 100)
        : 21;
      vatGroups[estimatedRate] = {
        vat_pct: estimatedRate,
        base: documentTotals.total_base || 0,
        vat_amount: documentTotals.total_vat || 0,
      };
    }
  } else {
    lines.forEach(line => {
      const base = (line.base || 0) * (line.quantity || 1);
      const discountedBase = line.discount ? base * (1 - line.discount / 100) : base;
      const rate = line.vat || 0;
      const vatAmount = discountedBase * rate / 100;
      if (!vatGroups[rate]) {
        vatGroups[rate] = { vat_pct: rate, base: 0, vat_amount: 0 };
      }
      vatGroups[rate].base += discountedBase;
      vatGroups[rate].vat_amount += vatAmount;
    });
  }
  return Object.values(vatGroups).sort((a,b) => b.vat_pct - a.vat_pct).slice(0,5);
};

const getAverageIRPF = (lines) => {
  if (!lines || lines.length === 0) return 0;
  const total = lines.reduce((acc, l) => acc + (l.irpf || 0), 0);
  return total / lines.length;
};

// Build repercuted VAT data lines (one per VAT rate per document)
const getReppercutedVATData = async () => {
  const documents = await getData(); // emitted-invoices + received-incomes
  const vatEntries = [];
  documents.forEach(doc => {
    const vatBreakdown = processVATLines(doc.lines || [], doc);
    vatBreakdown.forEach((group, idx) => {
      if (group.base === 0 && group.vat_amount === 0) return;
      const entry = {
        // Identifiers
        contasol_codigo: `${doc.code}-VAT${idx+1}`,
        contasol_libro_iva: '', // Sales VAT book
        contasol_fecha: doc.contasol_emitted || (doc.emitted ? moment(doc.emitted,'YYYY-MM-DD').format('DD/MM/YYYY') : ''),
        contasol_cuenta: doc.contact ? (doc.contact.nif || doc.contact.id) : '',
        contasol_factura: doc.code,
        contasol_nombre: doc.contact ? doc.contact.name : '',
        contasol_cif: doc.contact ? (doc.contact.nif || '') : '',
        contasol_tipo_operacion: '0',
        // Bases & VAT (only first slot used per line; other bases zeroed)
        contasol_base_1: group.base,
        contasol_base_2: 0,
        contasol_base_3: 0,
        contasol_vat_pct_1: group.vat_pct,
        contasol_vat_pct_2: 0,
        contasol_vat_pct_3: 0,
        contasol_recargo_pct_1: 0,
        contasol_recargo_pct_2: 0,
        contasol_recargo_pct_3: 0,
        contasol_vat_amount_1: group.vat_amount,
        contasol_vat_amount_2: 0,
        contasol_vat_amount_3: 0,
        contasol_recargo_amount_1: 0,
        contasol_recargo_amount_2: 0,
        contasol_recargo_amount_3: 0,
        contasol_total: group.base + group.vat_amount,
        // Rectificative placeholders
        contasol_factura_rectificada: '',
        contasol_fecha_factura_rectificada: '',
        contasol_total_factura_rectificada: 0,
        // IRPF retention (proportional if multiple groups)
        contasol_retencion_pct: getAverageIRPF(doc.lines || []),
        contasol_retencion_amount: (doc.total_irpf || 0) * (group.base / (doc.total_base || group.base || 1)),
        contasol_tipo_retencion: '1',
        contasol_retencion_amount_rectificada: 0,
        // Base exenta (exempt base) assumed 0 here
        contasol_base_exenta_factura: 0,
        contasol_clave_operacion: '',
        contasol_identificacion_fiscal: doc.contact && doc.contact.nif ? '1' : '0',
        contasol_tipo_impuesto: '0',
        contasol_base_exenta_rectificada: 0,
        contasol_base_coste: 0,
        contasol_numero_facturas: '1',
        contasol_primer_numero: doc.number || '',
        contasol_ultimo_numero: doc.number || '',
        contasol_dias_plazo: doc.paybefore && doc.emitted ? moment(doc.paybefore,'YYYY-MM-DD').diff(moment(doc.emitted,'YYYY-MM-DD'),'days') : 0,
        contasol_descripcion_bienes: doc.comments || '',
        contasol_otras_facturas: '',
        contasol_estado_miembro: 'ES',
        contasol_importe_suplidos: 0,
        contasol_incluir_export_liquidacion: '',
        contasol_observaciones: doc.comments_internal || '',
        contasol_situacion_inmueble: '',
        contasol_ref_catastral_inmueble: '',
        contasol_operacion_transmision_inmueble: '',
        contasol_documento_factusol: '',
        contasol_serie_documento_factusol: doc.serial ? doc.serial.name : '',
        contasol_codigo_documento_factusol: '',
        contasol_ejercicio_factura_rectificada: '',
        contasol_clave_operacion_intracom: '',
        contasol_fecha_realizacion_operacion: doc.contasol_emitted || (doc.emitted ? moment(doc.emitted,'YYYY-MM-DD').format('DD/MM/YYYY') : ''),
        contasol_operacion_no_sujeta: '',
        contasol_tipo_rectificativa: doc.contasol_tipo === 3 ? 'R' : '',
        contasol_extra: '',
        contasol_extra2: '',
        contasol_serie: doc.serial ? doc.serial.name : '',
        contasol_serie_rectifica: '',
        contasol_declara_ventanilla_unica: '',
        contasol_causa_exencion: '',
        // Additional VAT slots (4 & 5) zeroed
        contasol_base_4: 0,
        contasol_vat_pct_4: 0,
        contasol_vat_amount_4: 0,
        contasol_recargo_pct_4: 0,
        contasol_recargo_amount_4: 0,
        contasol_base_4_rectificada: 0,
        contasol_vat_pct_4_rectificada: 0,
        contasol_vat_amount_4_rectificada: 0,
        contasol_recargo_pct_4_rectificada: 0,
        contasol_recargo_amount_4_rectificada: 0,
        contasol_base_5: 0,
        contasol_vat_pct_5: 0,
        contasol_vat_amount_5: 0,
        contasol_recargo_pct_5: 0,
        contasol_recargo_amount_5: 0,
        contasol_base_5_rectificada: 0,
        contasol_vat_pct_5_rectificada: 0,
        contasol_vat_amount_5_rectificada: 0,
        contasol_recargo_pct_5_rectificada: 0,
        contasol_recargo_amount_5_rectificada: 0,
        // Metadata
        contasol_original_id: doc.id,
        contasol_vat_line_index: idx + 1,
        contasol_document_type: doc.type || 'emitted-invoice'
      };
      vatEntries.push(entry);
    });
  });
  return vatEntries;
};

const excelFormat = (value) => {
  if (value === null || value === undefined || value === '') return '';
  const numValue = parseFloat(value);
  if (isNaN(numValue)) return value;
  return numValue.toString().replace('.', ',');
};

const getFields = () => {

  /* 
  Numero	Tipo	Fecha	Cuenta de cliente	Neto de la factura	% de IVA	Importe de IVA	% de recargo	Importe de recargo	% de IRPF	 Importe de IRPF	Suplidos	Total factura	Observación 1	Observación 2	Factura traspasada	Fecha de vencimiento	Estado	Traspasada a efectos comerciales	Base Imponible	Porcentaje de descuento	Importe de descuento
  */

  return {
    'Numero': 'code',
    'Tipo': 'contasol_tipo',
    'Fecha': 'contasol_emitted',
    'Cuenta de cliente': 'contact.nif',
    'Neto de la factura': {
      field: 'total_base',
      callback: value => excelFormat(value)
    },
    '% de IVA': {
      field: 'contasol_vat_percentage',
      callback: value => excelFormat(value)
    },
    'Importe de IVA': {
      field: 'total_vat',
      callback: value => excelFormat(value)
    },
    '% de recargo': 'zzz',
    'Importe de recargo': 'zzz',
    '% de IRPF': {
      field: 'contasol_irpf_percentage',
      callback: value => excelFormat(value)
    },
    'Importe de IRPF': {
      field: 'total_irpf',
      callback: value => excelFormat(value)
    },
    'Suplidos': 'zzz',
    'Total factura': {
      field: 'total',
      callback: value => excelFormat(value)
    },
    'Observación 1': 'comments',
    'Observación 2': 'comments_internal',
    'Factura traspasada': 'zzz',
    'Fecha de vencimiento': 'contasol_paybefore',
    'Estado': 'contasol_state',
    'Traspasada a efectos comerciales': 'contasol_sent',
    'Base Imponible': {
      field: 'total_base',
      callback: value => excelFormat(value)
    },
    'Porcentaje de descuento': 'zzz',
    'Importe de descuento': 'zzz' ,
  }
}

const getLinesFields = () => {
  
  /* 
  Numero de factura	Tipo de factura 	Linea de factura	Cantidad	Descripción	Precio por unidad	Total de linea
  */
  return {
    'Numero de factura': 'invoice.code',
    'Tipo de factura': 'invoice.contasol_tipo',
    'Linea de factura': 'line_number',
    'Cantidad': {
      field: 'quantity',
      callback: value => excelFormat(value)
    },
    'Descripción': 'concept',
    'Precio por unidad': {
      field: 'base',
      callback: value => excelFormat(value)
    },
    'Total de linea': {
      field: 'total_line',
      callback: value => excelFormat(value)
    },
  }
}

const getLinesData = async () => {
  const documents = await getData();
  const lines = documents.flatMap((doc, docIndex) => 
    (doc.lines || []).map((line, lineIndex) => ({
      ...line,
      invoice: doc,
      line_number: lineIndex + 1,
      total_line: (() => {
        const base = line.base || 0;
        const quantity = line.quantity || 0;
        const discount = line.discount || 0;
        const subtotal = base * quantity;
        return subtotal * (1 - discount / 100);
      })()
    }))
  );
  return lines;
}


const getReppercutedVATFields = () => {
  return {
    'Código': 'contasol_codigo',
    'Libro de IVA': 'contasol_libro_iva',
    'Fecha': 'contasol_fecha',
    'Cuenta': 'contasol_cuenta',
    'Factura': 'contasol_factura',
    'Nombre': 'contasol_nombre',
    'C.I.F.': 'contasol_cif',
    'Tipo de operación': 'contasol_tipo_operacion',
    'Base 1': { field: 'contasol_base_1', callback: v => excelFormat(v) },
    'Base 2': { field: 'contasol_base_2', callback: v => excelFormat(v) },
    'Base 3': { field: 'contasol_base_3', callback: v => excelFormat(v) },
    '% de IVA 1': { field: 'contasol_vat_pct_1', callback: v => excelFormat(v) },
    '% de IVA 2': { field: 'contasol_vat_pct_2', callback: v => excelFormat(v) },
    '% de IVA 3': { field: 'contasol_vat_pct_3', callback: v => excelFormat(v) },
    '% de recargo 1': { field: 'contasol_recargo_pct_1', callback: v => excelFormat(v) },
    '% de recargo 2': { field: 'contasol_recargo_pct_2', callback: v => excelFormat(v) },
    '% de recargo 3': { field: 'contasol_recargo_pct_3', callback: v => excelFormat(v) },
    'Importe de IVA 1': { field: 'contasol_vat_amount_1', callback: v => excelFormat(v) },
    'Importe de IVA 2': { field: 'contasol_vat_amount_2', callback: v => excelFormat(v) },
    'Importe de IVA 3': { field: 'contasol_vat_amount_3', callback: v => excelFormat(v) },
    'Importe de recargo 1': { field: 'contasol_recargo_amount_1', callback: v => excelFormat(v) },
    'Importe de recargo 2': { field: 'contasol_recargo_amount_2', callback: v => excelFormat(v) },
    'Importe de recargo 3': { field: 'contasol_recargo_amount_3', callback: v => excelFormat(v) },
    'Total': { field: 'contasol_total', callback: v => excelFormat(v) },
    'Factura rectificada': 'contasol_factura_rectificada',
    'Fecha factura rectificada': 'contasol_fecha_factura_rectificada',
    'Total factura rectificada': { field: 'contasol_total_factura_rectificada', callback: v => excelFormat(v) },
    'Porcentaje de retención': { field: 'contasol_retencion_pct', callback: v => excelFormat(v) },
    'Importe de retención': { field: 'contasol_retencion_amount', callback: v => excelFormat(v) },
    'Tipo de retención': 'contasol_tipo_retencion',
    'Importe retención factura rectificada': { field: 'contasol_retencion_amount_rectificada', callback: v => excelFormat(v) },
    'Fecha de expedición de la factura': 'contasol_fecha',
    'Base exenta factura': { field: 'contasol_base_exenta_factura', callback: v => excelFormat(v) },
    'Clave de operación': 'contasol_clave_operacion',
    'Identificación fiscal': 'contasol_identificacion_fiscal',
    'Tipo de impuesto': 'contasol_tipo_impuesto',
    'Base exenta factura rectificada': { field: 'contasol_base_exenta_rectificada', callback: v => excelFormat(v) },
    'Base imponible a coste': { field: 'contasol_base_coste', callback: v => excelFormat(v) },
    'Número de facturas': 'contasol_numero_facturas',
    'Primer número': 'contasol_primer_numero',
    'Último número': 'contasol_ultimo_numero',
    'Días de plazo': 'contasol_dias_plazo',
    'Descripción de los bienes': 'contasol_descripcion_bienes',
    'Otras facturas o documentación': 'contasol_otras_facturas',
    'Estado miembro origen o destino del bien': 'contasol_estado_miembro',
    'Importe de suplidos': { field: 'contasol_importe_suplidos', callback: v => excelFormat(v) },
    'Incluir exportaciones en la liquidación': 'contasol_incluir_export_liquidacion',
    'Observaciones': 'contasol_observaciones',
    'Situación del inmueble arrendado': 'contasol_situacion_inmueble',
    'Referencia catastral del inmueble arrendado': 'contasol_ref_catastral_inmueble',
    'Operación por transmisión de inmuebles sujeta a IVA': 'contasol_operacion_transmision_inmueble',
    'Documento de FactuSOL que creó el registro de IVA': 'contasol_documento_factusol',
    'Serie del documento de FactuSOL que creó el registro de IVA': 'contasol_serie_documento_factusol',
    'Código del documento de FactuSOL que creó el registro de IVA': 'contasol_codigo_documento_factusol',
    'Ejercicio de la factura rectificada': 'contasol_ejercicio_factura_rectificada',
    'Clave de operación intracomunitaria': 'contasol_clave_operacion_intracom',
    'Fecha de realización de la operación': 'contasol_fecha_realizacion_operacion',
    'Operación no sujeta': 'contasol_operacion_no_sujeta',
    'Tipo de rectificativa': 'contasol_tipo_rectificativa',
    'EXTRA': 'contasol_extra',
    'EXTRA2': 'contasol_extra2',
    'Serie': 'contasol_serie',
    'Serie de la fra. que rectifica': 'contasol_serie_rectifica',
    'Declara en el sistema de ventanilla única': 'contasol_declara_ventanilla_unica',
    'Causa de exención': 'contasol_causa_exencion',
    'Base 4': { field: 'contasol_base_4', callback: v => excelFormat(v) },
    '% de IVA 4': { field: 'contasol_vat_pct_4', callback: v => excelFormat(v) },
    'Importe de IVA 4': { field: 'contasol_vat_amount_4', callback: v => excelFormat(v) },
    '% de recargo 4': { field: 'contasol_recargo_pct_4', callback: v => excelFormat(v) },
    'Importe de recargo 4': { field: 'contasol_recargo_amount_4', callback: v => excelFormat(v) },
    'Base 4 factura rectificada': { field: 'contasol_base_4_rectificada', callback: v => excelFormat(v) },
    '% de IVA 4 factura rectificada': { field: 'contasol_vat_pct_4_rectificada', callback: v => excelFormat(v) },
    'Importe de IVA 4 factura rectificada': { field: 'contasol_vat_amount_4_rectificada', callback: v => excelFormat(v) },
    '% de recargo 4 factura rectificada': { field: 'contasol_recargo_pct_4_rectificada', callback: v => excelFormat(v) },
    'Importe de recargo 4 factura rectificada': { field: 'contasol_recargo_amount_4_rectificada', callback: v => excelFormat(v) },
    'Base 5': { field: 'contasol_base_5', callback: v => excelFormat(v) },
    '% de IVA 5': { field: 'contasol_vat_pct_5', callback: v => excelFormat(v) },
    'Importe de IVA 5': { field: 'contasol_vat_amount_5', callback: v => excelFormat(v) },
    '% de recargo 5': { field: 'contasol_recargo_pct_5', callback: v => excelFormat(v) },
    'Importe de recargo 5': { field: 'contasol_recargo_amount_5', callback: v => excelFormat(v) },
    'Base 5 factura rectificada': { field: 'contasol_base_5_rectificada', callback: v => excelFormat(v) },
    '% de IVA 5 factura rectificada': { field: 'contasol_vat_pct_5_rectificada', callback: v => excelFormat(v) },
    'Importe de IVA 5 factura rectificada': { field: 'contasol_vat_amount_5_rectificada', callback: v => excelFormat(v) },
    '% de recargo 5 factura rectificada': { field: 'contasol_recargo_pct_5_rectificada', callback: v => excelFormat(v) },
    'Importe de recargo 5 factura rectificada': { field: 'contasol_recargo_amount_5_rectificada', callback: v => excelFormat(v) }
  };
};


export default {
  getData,
  getLinesData,
  getFields,
  getLinesFields,
  getReppercutedVATData,
  getReppercutedVATFields};