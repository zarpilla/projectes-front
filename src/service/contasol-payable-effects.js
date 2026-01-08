import service from "@/service/index";
import { get } from "lodash";
import moment from "moment";

const getData  = async () => {
  const invoices = await service({ requiresAuth: true, cached: false }).get("/received-invoices?_limit=-1&_sort=emitted:DESC")
  invoices.data.map((invoice, index) => {    
    // Basic fields
    invoice.contasol_codigo = invoice.code || `INV-${invoice.id}`;
    invoice.contasol_fecha = invoice.emitted ? moment(invoice.emitted, 'YYYY-MM-DD').format('DD/MM/YYYY') : '';
    invoice.contasol_cuenta = invoice.contact_info ? (invoice.contact_info.nif || invoice.contact_info.id) : (invoice.contact ? (invoice.contact.nif || invoice.contact.id) : '');
    invoice.contasol_nombre = invoice.contact_info ? invoice.contact_info.name : (invoice.contact ? invoice.contact.name : '');
    invoice.contasol_concepto = invoice.comments || 'Factura recibida';
    invoice.contasol_numero_factura = invoice.contact_invoice_number || invoice.number || '';
    invoice.contasol_cuenta_cargo = ''; // To be defined based on accounting logic
    invoice.contasol_tipo_cartera = '001';
    invoice.contasol_vencimiento = invoice.paybefore ? moment(invoice.paybefore, 'YYYY-MM-DD').format('DD/MM/YYYY') : '';
    invoice.contasol_importe = invoice.total || 0;
    invoice.contasol_estado = invoice.paid ? 1 : 0;
    
    // Accounting entry fields (to be implemented based on accounting system)
    invoice.contasol_diario_asiento = ''; // Journal of the accounting entry
    invoice.contasol_fecha_asiento = invoice.vat_paid_date ? moment(invoice.vat_paid_date).format('DD/MM/YYYY') : '';
    invoice.contasol_numero_asiento = ''; // Accounting entry number
    invoice.contasol_orden_asiento = ''; // Accounting entry order
    invoice.contasol_cuenta_destinatario = ''; // Destination account
    invoice.contasol_numero_efectos_factura = '1'; // Number of effects in invoice
    invoice.contasol_orden_efecto_factura = '1'; // Order of effect in invoice

    // VAT specific fields
    invoice.contasol_vat_book = ''; // VAT book type for received invoices
    invoice.contasol_cif = invoice.contact_info ? (invoice.contact_info.nif || '') : (invoice.contact ? (invoice.contact.nif || '') : '');
    invoice.contasol_tipo_operacion = ''; // Purchase operation
    invoice.contasol_deducible = '0';
    invoice.contasol_total = invoice.total || 0;
    
    // Process VAT lines to get breakdown by VAT rates
    const vatBreakdown = processVATLines(invoice.lines || [], invoice);
    
    // Map VAT breakdown to Contasol fields (up to 5 different VAT rates)
    invoice.contasol_base_1 = vatBreakdown[0] ? vatBreakdown[0].base : 0;
    invoice.contasol_vat_pct_1 = vatBreakdown[0] ? vatBreakdown[0].vat_pct : 0;
    invoice.contasol_vat_amount_1 = vatBreakdown[0] ? vatBreakdown[0].vat_amount : 0;
    invoice.contasol_recargo_pct_1 = 0; // No surcharge in current system
    invoice.contasol_recargo_amount_1 = 0;
    
    invoice.contasol_base_2 = vatBreakdown[1] ? vatBreakdown[1].base : 0;
    invoice.contasol_vat_pct_2 = vatBreakdown[1] ? vatBreakdown[1].vat_pct : 0;
    invoice.contasol_vat_amount_2 = vatBreakdown[1] ? vatBreakdown[1].vat_amount : 0;
    invoice.contasol_recargo_pct_2 = 0;
    invoice.contasol_recargo_amount_2 = 0;
    
    invoice.contasol_base_3 = vatBreakdown[2] ? vatBreakdown[2].base : 0;
    invoice.contasol_vat_pct_3 = vatBreakdown[2] ? vatBreakdown[2].vat_pct : 0;
    invoice.contasol_vat_amount_3 = vatBreakdown[2] ? vatBreakdown[2].vat_amount : 0;
    invoice.contasol_recargo_pct_3 = 0;
    invoice.contasol_recargo_amount_3 = 0;
    
    invoice.contasol_base_4 = vatBreakdown[3] ? vatBreakdown[3].base : 0;
    invoice.contasol_vat_pct_4 = vatBreakdown[3] ? vatBreakdown[3].vat_pct : 0;
    invoice.contasol_vat_amount_4 = vatBreakdown[3] ? vatBreakdown[3].vat_amount : 0;
    invoice.contasol_recargo_pct_4 = 0;
    invoice.contasol_recargo_amount_4 = 0;
    
    invoice.contasol_base_5 = vatBreakdown[4] ? vatBreakdown[4].base : 0;
    invoice.contasol_vat_pct_5 = vatBreakdown[4] ? vatBreakdown[4].vat_pct : 0;
    invoice.contasol_vat_amount_5 = vatBreakdown[4] ? vatBreakdown[4].vat_amount : 0;
    invoice.contasol_recargo_pct_5 = 0;
    invoice.contasol_recargo_amount_5 = 0;
    
    // IRPF fields
    invoice.contasol_retencion_pct = getAverageIRPF(invoice.lines || []);
    invoice.contasol_retencion_amount = invoice.total_irpf || 0;
    invoice.contasol_base_irpf = invoice.total_base || 0;
    
    // Default values for other fields
    invoice.contasol_bienes_soportados = '';
    invoice.contasol_factura_rectificada = '';
    invoice.contasol_fecha_factura_rectificada = '';
    invoice.contasol_total_factura_rectificada = 0;
    invoice.contasol_modelo_347 = '' //invoice.total && invoice.total > 3005.06 ? '1' : '0';
    invoice.contasol_tipo_retencion = '1';
    invoice.contasol_retencion_amount_rectificada = 0;
    invoice.contasol_fecha_expedicion = invoice.emitted ? moment(invoice.emitted, 'YYYY-MM-DD').format('DD/MM/YYYY') : '';
    invoice.contasol_base_exenta = 0;
    invoice.contasol_porcentaje_deducible = 100;
    invoice.contasol_base_exenta_rectificada = 0;
    invoice.contasol_clave_operacion = '0';
    invoice.contasol_identificacion_fiscal = invoice.contact_info ? (invoice.contact_info.nif || '') : (invoice.contact ? (invoice.contact.nif || '') : '');
    invoice.contasol_tipo_impuesto = 'IVA';
    invoice.contasol_identificacion_bien = '';
    invoice.contasol_prorrata_definitiva = 0;
    invoice.contasol_fecha_inicio_utilizacion = '';
    invoice.contasol_regularizacion_anual = 0;
    invoice.contasol_identificacion_entrega = '';
    invoice.contasol_regularizacion_deduccion = 0;
    invoice.contasol_base_coste = 0;
    invoice.contasol_numero_facturas = '1';
    invoice.contasol_primer_numero = invoice.contact_invoice_number || invoice.number || '';
    invoice.contasol_ultimo_numero = invoice.contact_invoice_number || invoice.number || '';
    invoice.contasol_dias_plazo = invoice.paybefore ? moment(invoice.paybefore).diff(moment(invoice.emitted), 'days') : 0;
    invoice.contasol_descripcion_bienes = invoice.comments || '';
    invoice.contasol_otras_facturas = '';
    invoice.contasol_estado_miembro = 'ES';
    invoice.contasol_suplidos = 0;
    invoice.contasol_campo_vacio = '';
    invoice.contasol_observaciones = invoice.comments || '';
    invoice.contasol_documento_factusol = '';
    invoice.contasol_serie_factusol = '';
    invoice.contasol_codigo_factusol = '';
    invoice.contasol_ejercicio_rectificada = '';
    invoice.contasol_clave_intracomunitaria = '';
    invoice.contasol_fecha_realizacion = invoice.emitted ? moment(invoice.emitted, 'YYYY-MM-DD').format('DD/MM/YYYY') : '';
    invoice.contasol_tipo_rectificativa = '';
    invoice.contasol_extra = '';
    invoice.contasol_extra2 = '';
    invoice.contasol_fecha_registro = invoice.created_at ? moment(invoice.created_at).format('DD/MM/YYYY') : '';
    invoice.contasol_serie = invoice.serie ? invoice.serie.name : '';
    invoice.contasol_serie_rectifica = '';
    invoice.contasol_operacion_no_sujeta = '';

    // Additional computed fields
    invoice.contasol_tipo_documento = 'received-invoice';
    return invoice;
  });

  const expenses = await service({ requiresAuth: true, cached: false }).get("/received-expenses?_limit=-1&_sort=emitted:DESC")
  expenses.data.map((expense, index) => {    
    // Basic fields
    expense.contasol_codigo = expense.code || `EXP-${expense.id}`;
    expense.contasol_fecha = expense.emitted ? moment(expense.emitted, 'YYYY-MM-DD').format('DD/MM/YYYY') : '';
    expense.contasol_cuenta = expense.contact_info ? (expense.contact_info.nif || expense.contact_info.id) : (expense.contact ? (expense.contact.nif || expense.contact.id) : '');
    expense.contasol_nombre = expense.contact ? expense.contact.name : '';
    expense.contasol_concepto = expense.comments || 'Gasto recibido';
    expense.contasol_numero_factura = expense.contact_invoice_number || expense.number || '';
    expense.contasol_cuenta_cargo = ''; // To be defined based on accounting logic
    expense.contasol_tipo_cartera = 'Gasto';
    expense.contasol_vencimiento = expense.paybefore ? moment(expense.paybefore, 'YYYY-MM-DD').format('DD/MM/YYYY') : '';
    expense.contasol_importe = expense.total || 0;
    expense.contasol_estado = expense.paid ? 'Pagado' : 'Pendiente';
    
    // Accounting entry fields (to be implemented based on accounting system)
    expense.contasol_diario_asiento = ''; // Journal of the accounting entry
    expense.contasol_fecha_asiento = expense.vat_paid_date ? moment(expense.vat_paid_date).format('DD/MM/YYYY') : '';
    expense.contasol_numero_asiento = ''; // Accounting entry number
    expense.contasol_orden_asiento = ''; // Accounting entry order
    expense.contasol_cuenta_destinatario = ''; // Destination account
    expense.contasol_numero_efectos_factura = '1'; // Number of effects in invoice
    expense.contasol_orden_efecto_factura = '1'; // Order of effect in invoice

    // VAT specific fields for expenses
    expense.contasol_vat_book = ''; // VAT book type for received expenses
    expense.contasol_cif = expense.contact_info ? (expense.contact_info.nif || '') : (expense.contact ? (expense.contact.nif || '') : '');
    expense.contasol_tipo_operacion = ''; // Interior: 0 Importación: 1 Intracomunitario: 2 Agricultura, ganadería y pesca: 3
    expense.contasol_deducible = '0';
    expense.contasol_total = expense.total || 0;
    
    // Process VAT lines to get breakdown by VAT rates
    const vatBreakdown = processVATLines(expense.lines || [], expense);
    
    // Map VAT breakdown to Contasol fields (up to 5 different VAT rates)
    expense.contasol_base_1 = vatBreakdown[0] ? vatBreakdown[0].base : 0;
    expense.contasol_vat_pct_1 = vatBreakdown[0] ? vatBreakdown[0].vat_pct : 0;
    expense.contasol_vat_amount_1 = vatBreakdown[0] ? vatBreakdown[0].vat_amount : 0;
    expense.contasol_recargo_pct_1 = 0; // No surcharge in current system
    expense.contasol_recargo_amount_1 = 0;
    
    expense.contasol_base_2 = vatBreakdown[1] ? vatBreakdown[1].base : 0;
    expense.contasol_vat_pct_2 = vatBreakdown[1] ? vatBreakdown[1].vat_pct : 0;
    expense.contasol_vat_amount_2 = vatBreakdown[1] ? vatBreakdown[1].vat_amount : 0;
    expense.contasol_recargo_pct_2 = 0;
    expense.contasol_recargo_amount_2 = 0;
    
    expense.contasol_base_3 = vatBreakdown[2] ? vatBreakdown[2].base : 0;
    expense.contasol_vat_pct_3 = vatBreakdown[2] ? vatBreakdown[2].vat_pct : 0;
    expense.contasol_vat_amount_3 = vatBreakdown[2] ? vatBreakdown[2].vat_amount : 0;
    expense.contasol_recargo_pct_3 = 0;
    expense.contasol_recargo_amount_3 = 0;
    
    expense.contasol_base_4 = vatBreakdown[3] ? vatBreakdown[3].base : 0;
    expense.contasol_vat_pct_4 = vatBreakdown[3] ? vatBreakdown[3].vat_pct : 0;
    expense.contasol_vat_amount_4 = vatBreakdown[3] ? vatBreakdown[3].vat_amount : 0;
    expense.contasol_recargo_pct_4 = 0;
    expense.contasol_recargo_amount_4 = 0;
    
    expense.contasol_base_5 = vatBreakdown[4] ? vatBreakdown[4].base : 0;
    expense.contasol_vat_pct_5 = vatBreakdown[4] ? vatBreakdown[4].vat_pct : 0;
    expense.contasol_vat_amount_5 = vatBreakdown[4] ? vatBreakdown[4].vat_amount : 0;
    expense.contasol_recargo_pct_5 = 0;
    expense.contasol_recargo_amount_5 = 0;
    
    // IRPF fields
    expense.contasol_retencion_pct = getAverageIRPF(expense.lines || []);
    expense.contasol_retencion_amount = expense.total_irpf || 0;
    expense.contasol_base_irpf = expense.total_base || 0;
    
    // Default values for other fields (same as invoices)
    expense.contasol_bienes_soportados = '';
    expense.contasol_factura_rectificada = '';
    expense.contasol_fecha_factura_rectificada = '';
    expense.contasol_total_factura_rectificada = 0;
    expense.contasol_modelo_347 = '' //expense.total && expense.total > 3005.06 ? '1' : '0';
    expense.contasol_tipo_retencion = '1';
    expense.contasol_retencion_amount_rectificada = 0;
    expense.contasol_fecha_expedicion = expense.emitted ? moment(expense.emitted, 'YYYY-MM-DD').format('DD/MM/YYYY') : '';
    expense.contasol_base_exenta = 0;
    expense.contasol_porcentaje_deducible = 100;
    expense.contasol_base_exenta_rectificada = 0;
    expense.contasol_clave_operacion = '';
    expense.contasol_identificacion_fiscal = expense.contact_info ? (expense.contact_info.nif || '') : (expense.contact ? (expense.contact.nif || '') : '');
    expense.contasol_tipo_impuesto = 'IVA';
    expense.contasol_identificacion_bien = '';
    expense.contasol_prorrata_definitiva = 0;
    expense.contasol_fecha_inicio_utilizacion = '';
    expense.contasol_regularizacion_anual = 0;
    expense.contasol_identificacion_entrega = '';
    expense.contasol_regularizacion_deduccion = 0;
    expense.contasol_base_coste = 0;
    expense.contasol_numero_facturas = '1';
    expense.contasol_primer_numero = expense.contact_invoice_number || expense.number || '';
    expense.contasol_ultimo_numero = expense.contact_invoice_number || expense.number || '';
    expense.contasol_dias_plazo = expense.paybefore ? moment(expense.paybefore).diff(moment(expense.emitted), 'days') : 0;
    expense.contasol_descripcion_bienes = expense.comments || '';
    expense.contasol_otras_facturas = '';
    expense.contasol_estado_miembro = 'ES';
    expense.contasol_suplidos = 0;
    expense.contasol_campo_vacio = '';
    expense.contasol_observaciones = expense.comments || '';
    expense.contasol_documento_factusol = '';
    expense.contasol_serie_factusol = '';
    expense.contasol_codigo_factusol = '';
    expense.contasol_ejercicio_rectificada = '';
    expense.contasol_clave_intracomunitaria = '';
    expense.contasol_fecha_realizacion = expense.emitted ? moment(expense.emitted, 'YYYY-MM-DD').format('DD/MM/YYYY') : '';
    expense.contasol_tipo_rectificativa = '';
    expense.contasol_extra = '';
    expense.contasol_extra2 = '';
    expense.contasol_fecha_registro = expense.created_at ? moment(expense.created_at).format('DD/MM/YYYY') : '';
    expense.contasol_serie = expense.serie ? expense.serie.name : '';
    expense.contasol_serie_rectifica = '';
    expense.contasol_operacion_no_sujeta = '';

    // Additional computed fields
    expense.contasol_tipo_documento = 'received-expense';
    return expense;
  });

  const documents = [...invoices.data, ...expenses.data];
  return documents;
}

const getSupportedVATData  = async () => {
  const payable = await getData();
  
  // Create VAT entries - one entry per VAT rate per document
  const vatEntries = [];
  
  payable.forEach(document => {
    // Process VAT breakdown for each document
    const vatBreakdown = processVATLines(document.lines || [], document);
    
    vatBreakdown.forEach((vatGroup, index) => {
      if (vatGroup.base > 0 || vatGroup.vat_amount > 0) {
        // Create a separate VAT entry for each VAT rate
        const vatEntry = {
          // Copy basic document fields
          contasol_codigo: `${document.contasol_codigo}-VAT${index + 1}`,
          contasol_vat_book: document.contasol_vat_book,
          contasol_fecha: document.contasol_fecha,
          contasol_cuenta: document.contasol_cuenta,
          contasol_numero_factura: document.contasol_numero_factura,
          contasol_nombre: document.contasol_nombre,
          contasol_cif: document.contasol_cif,
          contasol_tipo_operacion: document.contasol_tipo_operacion,
          contasol_deducible: document.contasol_deducible,
          
          // VAT specific fields for this rate
          contasol_base_1: vatGroup.base,
          contasol_vat_pct_1: vatGroup.vat_pct,
          contasol_vat_amount_1: vatGroup.vat_amount,
          contasol_recargo_pct_1: 0,
          contasol_recargo_amount_1: 0,
          
          // Zero out other VAT rates for this entry
          contasol_base_2: 0,
          contasol_vat_pct_2: 0,
          contasol_vat_amount_2: 0,
          contasol_recargo_pct_2: 0,
          contasol_recargo_amount_2: 0,
          
          contasol_base_3: 0,
          contasol_vat_pct_3: 0,
          contasol_vat_amount_3: 0,
          contasol_recargo_pct_3: 0,
          contasol_recargo_amount_3: 0,
          
          contasol_base_4: 0,
          contasol_vat_pct_4: 0,
          contasol_vat_amount_4: 0,
          contasol_recargo_pct_4: 0,
          contasol_recargo_amount_4: 0,
          
          contasol_base_5: 0,
          contasol_vat_pct_5: 0,
          contasol_vat_amount_5: 0,
          contasol_recargo_pct_5: 0,
          contasol_recargo_amount_5: 0,
          
          // Total for this VAT line
          contasol_total: vatGroup.base + vatGroup.vat_amount,
          
          // IRPF fields (proportional to this VAT group)
          contasol_retencion_pct: document.contasol_retencion_pct,
          contasol_retencion_amount: vatBreakdown.length === 1 
            ? document.contasol_retencion_amount 
            : (document.contasol_retencion_amount * vatGroup.base) / (document.total_base || 1),
          contasol_base_irpf: vatGroup.base,
          
          // Copy other fields from original document
          contasol_bienes_soportados: document.contasol_bienes_soportados,
          contasol_factura_rectificada: document.contasol_factura_rectificada,
          contasol_fecha_factura_rectificada: document.contasol_fecha_factura_rectificada,
          contasol_total_factura_rectificada: document.contasol_total_factura_rectificada,
          contasol_modelo_347: document.contasol_modelo_347,
          contasol_tipo_retencion: document.contasol_tipo_retencion,
          contasol_retencion_amount_rectificada: document.contasol_retencion_amount_rectificada,
          contasol_fecha_expedicion: document.contasol_fecha_expedicion,
          contasol_base_exenta: document.contasol_base_exenta,
          contasol_porcentaje_deducible: document.contasol_porcentaje_deducible,
          contasol_base_exenta_rectificada: document.contasol_base_exenta_rectificada,
          contasol_clave_operacion: document.contasol_clave_operacion,
          contasol_identificacion_fiscal: document.contasol_identificacion_fiscal,
          contasol_tipo_impuesto: document.contasol_tipo_impuesto,
          contasol_identificacion_bien: document.contasol_identificacion_bien,
          contasol_prorrata_definitiva: document.contasol_prorrata_definitiva,
          contasol_fecha_inicio_utilizacion: document.contasol_fecha_inicio_utilizacion,
          contasol_regularizacion_anual: document.contasol_regularizacion_anual,
          contasol_identificacion_entrega: document.contasol_identificacion_entrega,
          contasol_regularizacion_deduccion: document.contasol_regularizacion_deduccion,
          contasol_base_coste: document.contasol_base_coste,
          contasol_numero_facturas: document.contasol_numero_facturas,
          contasol_primer_numero: document.contasol_primer_numero,
          contasol_ultimo_numero: document.contasol_ultimo_numero,
          contasol_dias_plazo: document.contasol_dias_plazo,
          contasol_descripcion_bienes: document.contasol_descripcion_bienes,
          contasol_otras_facturas: document.contasol_otras_facturas,
          contasol_estado_miembro: document.contasol_estado_miembro,
          contasol_suplidos: document.contasol_suplidos,
          contasol_campo_vacio: document.contasol_campo_vacio,
          contasol_observaciones: document.contasol_observaciones,
          contasol_documento_factusol: document.contasol_documento_factusol,
          contasol_serie_factusol: document.contasol_serie_factusol,
          contasol_codigo_factusol: document.contasol_codigo_factusol,
          contasol_ejercicio_rectificada: document.contasol_ejercicio_rectificada,
          contasol_clave_intracomunitaria: document.contasol_clave_intracomunitaria,
          contasol_fecha_realizacion: document.contasol_fecha_realizacion,
          contasol_tipo_rectificativa: document.contasol_tipo_rectificativa,
          contasol_extra: document.contasol_extra,
          contasol_extra2: document.contasol_extra2,
          contasol_fecha_registro: document.contasol_fecha_registro,
          contasol_serie: document.contasol_serie,
          contasol_serie_rectifica: document.contasol_serie_rectifica,
          contasol_operacion_no_sujeta: document.contasol_operacion_no_sujeta,
          
          // Document metadata
          contasol_tipo_documento: document.contasol_tipo_documento,
          contasol_original_id: document.id,
          contasol_vat_line_index: index + 1
        };
        
        vatEntries.push(vatEntry);
      }
    });
  });
  
  return vatEntries;
}

const excelFormat = (value) => {
  if (value === null || value === undefined || value === '') return '';
  const numValue = parseFloat(value);
  if (isNaN(numValue)) return value;
  return numValue.toString().replace('.', ',');
};

// Helper function to process VAT lines and group by VAT rate
const processVATLines = (lines, document) => {
  const vatGroups = {};
  
  // If no lines, use total values from document
  if (!lines || lines.length === 0) {
    if (document.total_base || document.total_vat) {
      // Estimate VAT rate from totals
      const estimatedVatRate = document.total_vat && document.total_base 
        ? Math.round((document.total_vat / document.total_base) * 100) 
        : 21; // Default to 21% if can't calculate
      
      vatGroups[estimatedVatRate] = {
        vat_pct: estimatedVatRate,
        base: document.total_base || 0,
        vat_amount: document.total_vat || 0
      };
    }
  } else {
    // Process each line
    lines.forEach(line => {
      const lineBase = (line.base || 0) * (line.quantity || 1);
      const discountedBase = line.discount 
        ? lineBase * (1 - line.discount / 100) 
        : lineBase;
      const vatRate = line.vat || 0;
      const vatAmount = (discountedBase * vatRate) / 100;
      
      if (!vatGroups[vatRate]) {
        vatGroups[vatRate] = {
          vat_pct: vatRate,
          base: 0,
          vat_amount: 0
        };
      }
      
      vatGroups[vatRate].base += discountedBase;
      vatGroups[vatRate].vat_amount += vatAmount;
    });
  }
  
  // Convert to array and sort by VAT rate (highest first)
  return Object.values(vatGroups)
    .sort((a, b) => b.vat_pct - a.vat_pct)
    .slice(0, 5); // Max 5 VAT rates supported by Contasol
};

// Helper function to get average IRPF percentage
const getAverageIRPF = (lines) => {
  if (!lines || lines.length === 0) return 0;
  
  const totalIrpf = lines.reduce((sum, line) => sum + (line.irpf || 0), 0);
  return lines.length > 0 ? totalIrpf / lines.length : 0;
};

const getFields = () => {

  /* 
  Código	Fecha	Cuenta	Nombre	Concepto	Número de factura	Cuenta de cargo	Tipo de cartera	Vencimiento	Importe	Estado	Diario del asiento que provocó el efecto	Fecha del asiento	Número del asiento	Orden del asiento	Cuenta de destinatario	Número de efectos de la factura	Orden del efecto en la factura
  */

  return {
    'Código': 'contasol_codigo',
    'Fecha': 'contasol_fecha',
    'Cuenta': 'contasol_cuenta',
    'Nombre': 'contasol_nombre',
    'Concepto': 'contasol_concepto',
    'Número de factura': 'contasol_numero_factura',
    'Cuenta de cargo': 'contasol_cuenta_cargo',
    'Tipo de cartera': 'contasol_tipo_cartera',
    'Vencimiento': 'contasol_vencimiento',
    'Importe': {
      field: 'contasol_importe',
      callback: value => excelFormat(value)
    },
    'Estado': 'contasol_estado',
    'Diario del asiento que provocó el efecto': 'contasol_diario_asiento',
    'Fecha del asiento': 'contasol_fecha_asiento',
    'Número del asiento': 'contasol_numero_asiento',
    'Orden del asiento': 'contasol_orden_asiento',
    'Cuenta de destinatario': 'contasol_cuenta_destinatario',
    'Número de efectos de la factura': 'contasol_numero_efectos_factura',
    'Orden del efecto en la factura': 'contasol_orden_efecto_factura'
  }
}


const getSupportedVATFields = () => {
  /*
  Código	Libro de IVA	Fecha	Cuenta	Factura	Nombre	C.I.F.	Tipo de operación	Deducible	Base 1	Base 2	Base 3	% de IVA 1	% de IVA 2	% de IVA 3	% de recargo 1	% de recargo 2	% de recargo 3	Importe de IVA 1	Importe de IVA 2	Importe de IVA 3	Importe de recargo 1	Importe de recargo 2	Importe de recargo 3	Total	Bienes soportados	Factura rectificada	Fecha factura rectificada	Total factura rectificada	% IVA 1 factura rectificada	% IVA 2 factura rectificada	% IVA 3 factura rectificada	% recargo 1 factura rectificada	% recargo 2 factura rectificada	% recargo 3 factura rectificada	Base 1 factura rectificada	Base 2 factura rectificada	Base 3 factura rectificada	Importe de IVA 1 factura rectificada	Importe de IVA 2 factura rectificada	Importe de IVA 3 factura rectificada	Importe de recargo 1 factura rectificada	Importe de recargo 2 factura rectificada	Importe de recargo 3 factura rectificada	Incluir en el modelo 347	Porcentaje de retención	Importe de retención	Tipo de retención	Importe retención factura rectificada	Fecha expedición de la factura	Base imponible exenta	Porcentaje deducible	Base exenta factura rectificada	Clave de operación	Identificación fiscal	Tipo de impuesto	Identificación del bien	Prorrata definitiva	Fecha de inicio de la utilización	Regularización anual de la inversión	Identificación de entrega	Regularización de la deducción efectuada	Base imponible a coste	Número de facturas	Primer número	Último número	Tipo de operación	Días de plazo	Descripción de los bienes	Otras facturas o documentación	Estado miembro origen o destino del bien	Importe de suplidos	Campo sin contenido	Observaciones	Documento de FactuSOL que creó el registro de IVA	Serie del documento de FactuSOL que creó el registro de IVA	Código del documento de FactuSOL que creó el registro de IVA	Ejercicio de la factura rectificada	Clave de operación intracomunitaria	Fecha de realización de la operación	Base IRPF	Tipo de rectificativa	EXTRA	EXTRA2	Fecha de registro contable	Serie	Serie de la fra. que rectifica	Operación no sujeta	Base 4	% de IVA 4	Importe de IVA 4	% de recargo 4	Importe de recargo 4	Base 4 factura rectificada	% de IVA 4 factura rectificada	Importe de IVA 4 factura rectificada	% de recargo 4 factura rectificada	Importe de recargo 4 factura rectificada	Base 5	% de IVA 5	Importe de IVA 5	% de recargo 5	Importe de recargo 5	Base 5 factura rectificada	% de IVA 5 factura rectificada	Importe de IVA 5 factura rectificada	% de recargo 5 factura rectificada	Importe de recargo 5 factura rectificada
  */

  return {
    'Código': 'contasol_codigo',
    'Libro de IVA': 'contasol_vat_book',
    'Fecha': 'contasol_fecha',
    'Cuenta': 'contasol_cuenta',
    'Factura': 'contasol_numero_factura',
    'Nombre': 'contasol_nombre',
    'C.I.F.': 'contasol_cif',
    'Tipo de operación': 'contasol_tipo_operacion',
    'Deducible': 'contasol_deducible',
    'Base 1': {
      field: 'contasol_base_1',
      callback: value => excelFormat(value)
    },
    'Base 2': {
      field: 'contasol_base_2',
      callback: value => excelFormat(value)
    },
    'Base 3': {
      field: 'contasol_base_3',
      callback: value => excelFormat(value)
    },
    '% de IVA 1': {
      field: 'contasol_vat_pct_1',
      callback: value => excelFormat(value)
    },
    '% de IVA 2': {
      field: 'contasol_vat_pct_2',
      callback: value => excelFormat(value)
    },
    '% de IVA 3': {
      field: 'contasol_vat_pct_3',
      callback: value => excelFormat(value)
    },
    '% de recargo 1': {
      field: 'contasol_recargo_pct_1',
      callback: value => excelFormat(value)
    },
    '% de recargo 2': {
      field: 'contasol_recargo_pct_2',
      callback: value => excelFormat(value)
    },
    '% de recargo 3': {
      field: 'contasol_recargo_pct_3',
      callback: value => excelFormat(value)
    },
    'Importe de IVA 1': {
      field: 'contasol_vat_amount_1',
      callback: value => excelFormat(value)
    },
    'Importe de IVA 2': {
      field: 'contasol_vat_amount_2',
      callback: value => excelFormat(value)
    },
    'Importe de IVA 3': {
      field: 'contasol_vat_amount_3',
      callback: value => excelFormat(value)
    },
    'Importe de recargo 1': {
      field: 'contasol_recargo_amount_1',
      callback: value => excelFormat(value)
    },
    'Importe de recargo 2': {
      field: 'contasol_recargo_amount_2',
      callback: value => excelFormat(value)
    },
    'Importe de recargo 3': {
      field: 'contasol_recargo_amount_3',
      callback: value => excelFormat(value)
    },
    'Total': {
      field: 'contasol_total',
      callback: value => excelFormat(value)
    },
    'Bienes soportados': 'contasol_bienes_soportados',
    'Factura rectificada': 'contasol_factura_rectificada',
    'Fecha factura rectificada': 'contasol_fecha_factura_rectificada',
    'Total factura rectificada': {
      field: 'contasol_total_factura_rectificada',
      callback: value => excelFormat(value)
    },
    'Incluir en el modelo 347': 'contasol_modelo_347',
    'Porcentaje de retención': {
      field: 'contasol_retencion_pct',
      callback: value => excelFormat(value)
    },
    'Importe de retención': {
      field: 'contasol_retencion_amount',
      callback: value => excelFormat(value)
    },
    'Tipo de retención': 'contasol_tipo_retencion',
    'Importe retención factura rectificada': {
      field: 'contasol_retencion_amount_rectificada',
      callback: value => excelFormat(value)
    },
    'Fecha expedición de la factura': 'contasol_fecha_expedicion',
    'Base imponible exenta': {
      field: 'contasol_base_exenta',
      callback: value => excelFormat(value)
    },
    'Porcentaje deducible': {
      field: 'contasol_porcentaje_deducible',
      callback: value => excelFormat(value)
    },
    'Base exenta factura rectificada': {
      field: 'contasol_base_exenta_rectificada',
      callback: value => excelFormat(value)
    },
    'Clave de operación': 'contasol_clave_operacion',
    'Identificación fiscal': 'contasol_identificacion_fiscal',
    'Tipo de impuesto': 'contasol_tipo_impuesto',
    'Identificación del bien': 'contasol_identificacion_bien',
    'Prorrata definitiva': {
      field: 'contasol_prorrata_definitiva',
      callback: value => excelFormat(value)
    },
    'Fecha de inicio de la utilización': 'contasol_fecha_inicio_utilizacion',
    'Regularización anual de la inversión': {
      field: 'contasol_regularizacion_anual',
      callback: value => excelFormat(value)
    },
    'Identificación de entrega': 'contasol_identificacion_entrega',
    'Regularización de la deducción efectuada': {
      field: 'contasol_regularizacion_deduccion',
      callback: value => excelFormat(value)
    },
    'Base imponible a coste': {
      field: 'contasol_base_coste',
      callback: value => excelFormat(value)
    },
    'Número de facturas': 'contasol_numero_facturas',
    'Primer número': 'contasol_primer_numero',
    'Último número': 'contasol_ultimo_numero',
    'Días de plazo': 'contasol_dias_plazo',
    'Descripción de los bienes': 'contasol_descripcion_bienes',
    'Otras facturas o documentación': 'contasol_otras_facturas',
    'Estado miembro origen o destino del bien': 'contasol_estado_miembro',
    'Importe de suplidos': {
      field: 'contasol_suplidos',
      callback: value => excelFormat(value)
    },
    'Campo sin contenido': 'contasol_campo_vacio',
    'Observaciones': 'contasol_observaciones',
    'Documento de FactuSOL que creó el registro de IVA': 'contasol_documento_factusol',
    'Serie del documento de FactuSOL que creó el registro de IVA': 'contasol_serie_factusol',
    'Código del documento de FactuSOL que creó el registro de IVA': 'contasol_codigo_factusol',
    'Ejercicio de la factura rectificada': 'contasol_ejercicio_rectificada',
    'Clave de operación intracomunitaria': 'contasol_clave_intracomunitaria',
    'Fecha de realización de la operación': 'contasol_fecha_realizacion',
    'Base IRPF': {
      field: 'contasol_base_irpf',
      callback: value => excelFormat(value)
    },
    'Tipo de rectificativa': 'contasol_tipo_rectificativa',
    'EXTRA': 'contasol_extra',
    'EXTRA2': 'contasol_extra2',
    'Fecha de registro contable': 'contasol_fecha_registro',
    'Serie': 'contasol_serie',
    'Serie de la fra. que rectifica': 'contasol_serie_rectifica',
    'Operación no sujeta': 'contasol_operacion_no_sujeta',
    'Base 4': {
      field: 'contasol_base_4',
      callback: value => excelFormat(value)
    },
    '% de IVA 4': {
      field: 'contasol_vat_pct_4',
      callback: value => excelFormat(value)
    },
    'Importe de IVA 4': {
      field: 'contasol_vat_amount_4',
      callback: value => excelFormat(value)
    },
    '% de recargo 4': {
      field: 'contasol_recargo_pct_4',
      callback: value => excelFormat(value)
    },
    'Importe de recargo 4': {
      field: 'contasol_recargo_amount_4',
      callback: value => excelFormat(value)
    },
    'Base 4 factura rectificada': {
      field: 'contasol_base_4_rectificada',
      callback: value => excelFormat(value)
    },
    '% de IVA 4 factura rectificada': {
      field: 'contasol_vat_pct_4_rectificada',
      callback: value => excelFormat(value)
    },
    'Importe de IVA 4 factura rectificada': {
      field: 'contasol_vat_amount_4_rectificada',
      callback: value => excelFormat(value)
    },
    '% de recargo 4 factura rectificada': {
      field: 'contasol_recargo_pct_4_rectificada',
      callback: value => excelFormat(value)
    },
    'Importe de recargo 4 factura rectificada': {
      field: 'contasol_recargo_amount_4_rectificada',
      callback: value => excelFormat(value)
    },
    'Base 5': {
      field: 'contasol_base_5',
      callback: value => excelFormat(value)
    },
    '% de IVA 5': {
      field: 'contasol_vat_pct_5',
      callback: value => excelFormat(value)
    },
    'Importe de IVA 5': {
      field: 'contasol_vat_amount_5',
      callback: value => excelFormat(value)
    },
    '% de recargo 5': {
      field: 'contasol_recargo_pct_5',
      callback: value => excelFormat(value)
    },
    'Importe de recargo 5': {
      field: 'contasol_recargo_amount_5',
      callback: value => excelFormat(value)
    },
    'Base 5 factura rectificada': {
      field: 'contasol_base_5_rectificada',
      callback: value => excelFormat(value)
    },
    '% de IVA 5 factura rectificada': {
      field: 'contasol_vat_pct_5_rectificada',
      callback: value => excelFormat(value)
    },
    'Importe de IVA 5 factura rectificada': {
      field: 'contasol_vat_amount_5_rectificada',
      callback: value => excelFormat(value)
    },
    '% de recargo 5 factura rectificada': {
      field: 'contasol_recargo_pct_5_rectificada',
      callback: value => excelFormat(value)
    },
    'Importe de recargo 5 factura rectificada': {
      field: 'contasol_recargo_amount_5_rectificada',
      callback: value => excelFormat(value)
    }
  }

}


export default {
  getData,
  getSupportedVATData,
  getFields,
  getSupportedVATFields
};