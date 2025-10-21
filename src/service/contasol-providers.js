import service from "@/service/index";

const getData  = async () => {
  const response = await service({ requiresAuth: true, cached: false }).get("/contacts/basic?_limit=-1&_sort=name:ASC&_where[contact_types.id]=2")
    return response.data;
};

const getFields = () => {

  /* 
  Código	Nombre	NIF	Sigla del domicilio	Domicilio	Número de la calle	Código postal	Población	Provincia	Teléfono	Fax	Móvil	Concepto Debe	Tipo de operaciones	País	Persona de contacto	E-mail	% de IVA	% de recargo	Cuenta contrapartidas 1	Cuenta contrapartidas 2	Cuenta contrapartida 3	Banco	Entidad	Oficina	Dígito de control	Cuenta	Mensaje emergente	Concepto haber	Cuenta de banco	Nombre comercial	Tipo de retenciones	Porcentaje de retención	Tipo de deducción	Código IBAN	Cartera de efectos	Identificación fiscal	Tipo de impuesto	Clave de operación habitual	Ayuda en el cálculo	Tipo de IVA predefinido	Clave de operación intracomunitaria	Código BIC	Clave m190	Subclave	Descripción operación SII

  */
  return {
    'Código': 'nif',
    'Nombre': 'name',
    'NIF': 'nif',
    'Domicilio': 'address',
    'Código postal': 'postcode',
    'Población': 'city',
    'Provincia': 'state',
    'Teléfono': 'phone',
    'E-mail': 'email',
    'Cuenta': 'zzz',
    'Persona de contacto': 'contact_person',
    'Nombre comercial': 'trade_name',
    'Código IBAN': 'zzz',
    'Código BIC': 'zzz',
  }
}

export default {
  getData,
  getFields
};