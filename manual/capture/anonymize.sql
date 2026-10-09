-- Anonymizes a COPY of a tenant database for the user-manual screenshots.
-- Never run it on a live tenant. Run it on a v5 database made with the ETL:
--
--   mysql projectes_v5_manual < anonymize.sql
--
-- Run it ONCE on a fresh ETL copy: money is multiplied on every run. Fake values derive
-- from row ids, so a fresh copy always gets the same fake data.
-- - People, contacts, the entity, projects and free text get fake values.
-- - Every money column is multiplied by the same factor (@f): sums, balances and
--   quantity × price stay consistent. Hours, quantities, percentages stay real.
-- - Secrets (certificate passwords, API tokens, iCal links) are cleared.
-- Afterwards check-leaks.sh compares the result against the source database.

SET @f = 0.87;
SET FOREIGN_KEY_CHECKS = 0;

-- ── fake-value helpers ──────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS fake_person;
DROP FUNCTION IF EXISTS fake_company;
DROP FUNCTION IF EXISTS fake_project;
DROP FUNCTION IF EXISTS fake_concept;
DROP FUNCTION IF EXISTS fake_activity;
DROP FUNCTION IF EXISTS fake_task;
DROP FUNCTION IF EXISTS fake_town;
DELIMITER //
CREATE FUNCTION fake_person (i INT) RETURNS VARCHAR(100) DETERMINISTIC
  RETURN CONCAT(
    ELT(1 + i % 24, 'Anna', 'Marc', 'Laia', 'Pau', 'Núria', 'Jordi', 'Marta', 'Arnau', 'Clara', 'Biel',
      'Júlia', 'Oriol', 'Mireia', 'Roger', 'Berta', 'Quim', 'Aina', 'Èric', 'Gemma', 'Xavi', 'Neus', 'Txell', 'Iu', 'Rita'),
    ' ',
    ELT(1 + (i DIV 24) % 20, 'Puig', 'Serra', 'Vila', 'Soler', 'Ferrer', 'Roca', 'Pujol', 'Riera', 'Casals', 'Font',
      'Mas', 'Bosch', 'Sala', 'Torrent', 'Camps', 'Prat', 'Coll', 'Vidal', 'Grau', 'Pla'));
//
CREATE FUNCTION fake_town (i INT) RETURNS VARCHAR(60) DETERMINISTIC
  RETURN ELT(1 + i % 16, 'Vilafranca de Prova', 'Sant Fictici de Mar', 'Riudemostra', 'Castellexemple',
    'La Vall Imaginària', 'Torredemo', 'Bellmodel', 'Santa Mostra', 'Montprova', 'Les Planes de Mentida',
    'Vilanova de l''Exemple', 'Pobla de Proves', 'Sant Simulat', 'Rocafictícia', 'Masdemo', 'Prats de Mostra');
//
CREATE FUNCTION fake_company (i INT) RETURNS VARCHAR(150) DETERMINISTIC
  RETURN CASE
    WHEN i % 7 = 0 THEN CONCAT('Ajuntament de ', fake_town(i))
    WHEN i % 11 = 0 THEN CONCAT('Consell Comarcal de ', fake_town(i))
    ELSE CONCAT(
      ELT(1 + i % 6, 'Cooperativa', 'Associació', 'Fundació', 'Col·lectiu', 'Xarxa', 'Ateneu'), ' ',
      ELT(1 + (i DIV 6) % 30, 'Alba', 'Riu Clar', 'L''Era', 'Teixit', 'La Llavor', 'Arrels', 'El Brot', 'Sòlida',
        'Bruixola', 'L''Olivera Fictícia', 'Mostra', 'Pedra Seca', 'Garbí', 'Tramuntana', 'El Rusc', 'Fil a l''Agulla',
        'La Sínia', 'El Safareig', 'Cal Demo', 'Els Horts', 'Vent de Prova', 'La Teranyina', 'Ca l''Exemple',
        'L''Engranatge', 'Mar Endins', 'El Rebost', 'La Farga', 'Sembra', 'Brúixola Verda', 'El Molí'),
      IF(i % 6 = 0, ' SCCL', ''))
  END;
//
CREATE FUNCTION fake_project (i INT) RETURNS VARCHAR(200) DETERMINISTIC
  RETURN CONCAT(
    ELT(1 + i % 12, 'Formació en', 'Diagnosi de', 'Acompanyament en', 'Pla de', 'Estudi sobre', 'Dinamització de',
      'Jornades de', 'Assessorament en', 'Campanya de', 'Taller de', 'Recerca en', 'Projecte pilot de'), ' ',
    ELT(1 + (i DIV 12) % 30, 'economia social', 'transició energètica', 'sobirania alimentària', 'habitatge cooperatiu',
      'cures comunitàries', 'comerç de proximitat', 'mobilitat sostenible', 'gestió de residus', 'emprenedoria col·lectiva',
      'participació ciutadana', 'igualtat de gènere', 'cultura popular', 'joventut', 'turisme responsable', 'agroecologia',
      'compra pública responsable', 'finances ètiques', 'inserció laboral', 'educació ambiental', 'salut comunitària',
      'tecnologies lliures', 'rehabilitació energètica', 'xarxes de suport', 'consum responsable', 'territori rural',
      'aigua i clima', 'memòria històrica', 'cooperació internacional', 'comunicació comunitària', 'gent gran'),
    IF(i >= 360, CONCAT(' ', fake_town(i)), ''));
//
CREATE FUNCTION fake_concept (i INT) RETURNS VARCHAR(100) DETERMINISTIC
  RETURN ELT(1 + i % 16, 'Coordinació', 'Disseny de materials', 'Sessions formatives', 'Dinamització', 'Desplaçaments',
    'Lloguer d''espai', 'Comunicació i difusió', 'Impressió', 'Avaluació', 'Redacció d''informe', 'Assessorament',
    'Recerca de camp', 'Disseny gràfic', 'Servei de càtering', 'Material fungible', 'Gestió administrativa');
//
CREATE FUNCTION fake_activity (i INT) RETURNS VARCHAR(100) DETERMINISTIC
  RETURN ELT(1 + i % 12, 'Reunió de coordinació', 'Preparació de sessió', 'Sessió amb el grup', 'Redacció de document',
    'Revisió de materials', 'Seguiment amb l''entitat', 'Gestió de correu', 'Treball de camp', 'Anàlisi de dades',
    'Preparació de pressupost', 'Justificació', 'Formació interna');
//
CREATE FUNCTION fake_task (i INT) RETURNS VARCHAR(100) DETERMINISTIC
  RETURN ELT(1 + i % 12, 'Preparar la proposta', 'Enviar el pressupost', 'Revisar la factura', 'Convocar la reunió',
    'Actualitzar el calendari', 'Preparar materials', 'Fer l''acta', 'Tancar la justificació', 'Revisar les hores',
    'Publicar la difusió', 'Trucar a l''entitat', 'Arxivar la documentació');
//
DELIMITER ;

-- ── the entity itself (single type "us") ───────────────────────────────────
UPDATE us SET name = 'Cooperativa Demo SCCL', nif = 'F00000000', address = 'Carrer de l''Exemple, 1',
  city = 'Vilafranca de Prova', postcode = '08000', state = 'Barcelona', country = 'España',
  phone = '930 000 000', email = 'hola@exemple.coop', invoice_email = 'factures@exemple.coop',
  contact_form_email = 'hola@exemple.coop', ccc = NULL, ical = NULL,
  certificate_pwd = NULL, face_certificate_password = NULL, dir_3_api_token = NULL, invoice_parser_api_token = NULL;
UPDATE verifactus SET certificate_password = NULL;

-- ── people ─────────────────────────────────────────────────────────────────
UPDATE `users-permissions_user` SET
  username = fake_person(id), fullname = fake_person(id),
  email = CONCAT('persona', id, '@exemple.coop'),
  identity_number = NULL, naf = NULL, ical = NULL,
  cost_by_hour = cost_by_hour * @f, monthly_salary = monthly_salary * @f;

-- ── contacts (clients, providers, delivery points) ─────────────────────────
UPDATE contacts SET
  name = fake_company(id), trade_name = IF(trade_name IS NULL, NULL, fake_company(id)),
  nif = CONCAT(ELT(1 + id % 3, 'B', 'F', 'G'), LPAD(id, 8, '0')),
  phone = IF(phone IS NULL, NULL, CONCAT('600 ', LPAD(id % 1000, 3, '0'), ' 000')),
  email = IF(email IS NULL, NULL, CONCAT('contacte', id, '@exemple.org')),
  address = IF(address IS NULL, NULL, CONCAT('Carrer Major, ', 1 + id % 120)),
  city = IF(city IS NULL, NULL, fake_town(id)), postcode = IF(postcode IS NULL, NULL, '08000'),
  contact_person = IF(contact_person IS NULL, NULL, fake_person(id + 7)),
  contact_phone = IF(contact_phone IS NULL, NULL, '600 000 000'),
  contact_email = IF(contact_email IS NULL, NULL, CONCAT('persona.contacte', id, '@exemple.org')),
  website = NULL, notes = NULL, notes_delivery = NULL,
  face_dir_3_oc = IF(face_dir_3_oc IS NULL, NULL, 'L00000000'),
  face_dir_3_og = IF(face_dir_3_og IS NULL, NULL, 'L00000000'),
  face_dir_3_ut = IF(face_dir_3_ut IS NULL, NULL, 'L00000000'),
  partner_amount = partner_amount * @f;

-- contact snapshots stored on documents: copy the (already fake) linked contact
UPDATE components_contact_contact_data SET name = fake_company(id), nif = 'B00000000',
  address = 'Carrer Major, 1', postcode = '08000', city = fake_town(id), state = NULL;
UPDATE components_contact_contact_data cd
  JOIN emitted_invoices_cmps m ON m.cmp_id = cd.id AND m.component_type = 'contact.contact-data'
  JOIN emitted_invoices_contact_lnk l ON l.emitted_invoice_id = m.entity_id
  JOIN contacts c ON c.id = l.contact_id
  SET cd.name = c.name, cd.nif = c.nif, cd.address = c.address, cd.postcode = c.postcode, cd.city = c.city;

UPDATE orders SET contact_name = fake_person(id), contact_trade_name = NULL, contact_nif = NULL,
  contact_phone = IF(contact_phone IS NULL, NULL, '600 000 000'),
  contact_address = IF(contact_address IS NULL, NULL, CONCAT('Carrer Major, ', 1 + id % 120)),
  contact_city = IF(contact_city IS NULL, NULL, fake_town(id)), contact_postcode = IF(contact_postcode IS NULL, NULL, '08000'),
  contact_notes = NULL, comments = NULL, price = price * @f;

-- ── projects and their budgets ─────────────────────────────────────────────
UPDATE projects SET name = fake_project(id), description = NULL, purpose = NULL, internal_notes = NULL,
  grantable_reference = IF(grantable_reference IS NULL, NULL, CONCAT('EXP-', LPAD(id, 5, '0')));

-- Catalan elision: "de economia" -> "d'economia"
UPDATE projects SET name = REGEXP_REPLACE(name, ' de ([aeiouàèéíòóúh])', ' d''$1') WHERE name REGEXP ' de [aeiouàèéíòóúh]';

-- phase names: keep the generic ones that many projects share, replace the rest
CREATE TEMPORARY TABLE common_phase_names AS
  SELECT name FROM project_phases WHERE name IS NOT NULL GROUP BY name HAVING COUNT(*) >= 5;
UPDATE project_phases SET name = fake_concept(id) WHERE name NOT IN (SELECT name FROM common_phase_names);
UPDATE project_original_phases SET name = fake_concept(id) WHERE name NOT IN (SELECT name FROM common_phase_names);
UPDATE components_project_phase_project_phases SET name = fake_concept(id) WHERE name NOT IN (SELECT name FROM common_phase_names);
UPDATE components_project_phase_original_project_phases SET name = fake_concept(id) WHERE name NOT IN (SELECT name FROM common_phase_names);

UPDATE phase_incomes SET concept = fake_concept(id), amount = amount * @f, total_amount = total_amount * @f;
UPDATE phase_expenses SET concept = fake_concept(id + 5), amount = amount * @f, total_amount = total_amount * @f;
UPDATE estimated_hours SET comment = NULL, amount = amount * @f, total_amount = total_amount * @f;
UPDATE components_hours_hours SET comment = NULL, amount = amount * @f, total_amount = total_amount * @f;
UPDATE components_budget_line_budget_lines SET concept = fake_concept(id), amount = amount * @f, total_amount = total_amount * @f;
UPDATE components_budget_line_simple_incomes SET concept = fake_concept(id), amount = amount * @f, total_amount = total_amount * @f;
UPDATE components_budget_line_simple_expenses SET concept = fake_concept(id + 5), amount = amount * @f, total_amount = total_amount * @f;
UPDATE components_expense_expenses SET concept = fake_concept(id + 5), amount = amount * @f, total_amount = total_amount * @f;
UPDATE components_periodification_periodifications SET incomes = incomes * @f, expenses = expenses * @f,
  real_incomes = real_incomes * @f, real_expenses = real_expenses * @f;
UPDATE components_grantable_contact_grantable_contacts SET amount = amount * @f;
UPDATE components_grantable_grantable_years SET grantable_amount = grantable_amount * @f,
  grantable_amount_total = grantable_amount_total * @f, grantable_cofinancing = grantable_cofinancing * @f,
  grantable_structural_expenses = grantable_structural_expenses * @f,
  grantable_structural_expenses_justify_invoices = grantable_structural_expenses_justify_invoices * @f;

-- stored project totals (money only; *_hours without "price" are hours)
UPDATE projects SET
  balance = balance * @f, estimated_balance = estimated_balance * @f,
  estimated_incomes_expenses = estimated_incomes_expenses * @f, incomes_expenses = incomes_expenses * @f,
  original_incomes_expenses = original_incomes_expenses * @f, invoice_hours_price = invoice_hours_price * @f,
  grantable_amount = grantable_amount * @f, grantable_amount_total = grantable_amount_total * @f,
  grantable_cofinancing = grantable_cofinancing * @f, grantable_structural_expenses = grantable_structural_expenses * @f,
  grantable_structural_expenses_justify_invoices = grantable_structural_expenses_justify_invoices * @f,
  total_estimated_expenses = total_estimated_expenses * @f, total_estimated_expenses_vat = total_estimated_expenses_vat * @f,
  total_estimated_hours_price = total_estimated_hours_price * @f, total_estimated_incomes = total_estimated_incomes * @f,
  total_expenses = total_expenses * @f, total_expenses_vat = total_expenses_vat * @f, total_incomes = total_incomes * @f,
  total_original_expenses = total_original_expenses * @f, total_original_expenses_vat = total_original_expenses_vat * @f,
  total_original_hours_price = total_original_hours_price * @f, total_original_incomes = total_original_incomes * @f,
  total_real_expenses = total_real_expenses * @f, total_real_expenses_vat = total_real_expenses_vat * @f,
  total_real_hours_price = total_real_hours_price * @f, total_real_incomes = total_real_incomes * @f,
  total_real_incomes_expenses = total_real_incomes_expenses * @f;

-- ── hours ──────────────────────────────────────────────────────────────────
UPDATE activities SET description = IF(description IS NULL OR description = '', description, fake_activity(id)),
  uid_ical = NULL, cost_by_hour = cost_by_hour * @f, invoice_hours_price = invoice_hours_price * @f;
UPDATE daily_dedications SET cost_by_hour = cost_by_hour * @f, monthly_salary = monthly_salary * @f, quota = quota * @f;
UPDATE components_dedication_dedications SET comment = NULL, costbyhour = costbyhour * @f;
UPDATE time_counters SET description = NULL;

-- ── documents ──────────────────────────────────────────────────────────────
UPDATE emitted_invoices SET comments = NULL, comments_internal = NULL, pdf = NULL, qr = NULL, rectification_reason = NULL,
  total = total * @f, total_base = total_base * @f, total_vat = total_vat * @f, total_irpf = total_irpf * @f;
UPDATE received_invoices SET comments = NULL, comments_internal = NULL,
  total = total * @f, total_base = total_base * @f, total_vat = total_vat * @f, total_irpf = total_irpf * @f;
UPDATE received_expenses SET comments = NULL, comments_internal = NULL,
  total = total * @f, total_base = total_base * @f, total_vat = total_vat * @f, total_irpf = total_irpf * @f;
UPDATE received_incomes SET comments = NULL, comments_internal = NULL,
  total = total * @f, total_base = total_base * @f, total_vat = total_vat * @f, total_irpf = total_irpf * @f;
UPDATE quotes SET comments = NULL, comments_internal = NULL, pdf = NULL,
  total = total * @f, total_base = total_base * @f, total_vat = total_vat * @f, total_irpf = total_irpf * @f;
UPDATE emitted_grants SET total = total * @f, total_base = total_base * @f, total_vat = total_vat * @f, total_irpf = total_irpf * @f;
UPDATE received_grants SET total = total * @f, total_base = total_base * @f, total_vat = total_vat * @f, total_irpf = total_irpf * @f;
UPDATE tickets SET total = total * @f, total_base = total_base * @f, total_vat = total_vat * @f, total_irpf = total_irpf * @f;
UPDATE diets SET total = total * @f, total_base = total_base * @f, total_vat = total_vat * @f, total_irpf = total_irpf * @f;
UPDATE payrolls SET total = total * @f, total_base = total_base * @f, total_vat = total_vat * @f, total_irpf = total_irpf * @f,
  net_base = net_base * @f, irpf_base = irpf_base * @f, ss_base = ss_base * @f, other_base = other_base * @f;
UPDATE components_invoice_line_invoice_lines SET concept = fake_concept(id), comments = NULL, base = base * @f;
UPDATE components_invoice_line_invoice_line_expenses SET concept = fake_concept(id + 5), comments = NULL, base = base * @f;
UPDATE components_invoice_line_ticket_lines SET concept = fake_concept(id + 5), comments = NULL, base = base * @f;
UPDATE components_invoice_line_invoice_creations SET base = base * @f;
UPDATE files SET name = CONCAT('document-', id, IFNULL(ext, '')), alternative_text = NULL, caption = NULL;

-- ── money elsewhere ────────────────────────────────────────────────────────
UPDATE treasuries SET comment = IF(comment IS NULL, NULL, ELT(1 + id % 4, 'Ajust de saldo', 'Previsió de pagament',
  'Previsió de cobrament', 'Moviment bancari')), total = total * @f, balance = balance * @f;
UPDATE bank_accounts SET iban = CONCAT('ES00 0000 0000 00 ', LPAD(id, 10, '0'));
UPDATE payment_methods SET invoice_text = IF(invoice_text IS NULL, NULL, 'Transferència al compte ES00 0000 0000 0000 0000 0000');
UPDATE products SET base = base * @f;
UPDATE routes SET volume_discount_price = volume_discount_price * @f;
UPDATE route_rates SET additional_30 = additional_30 * @f, additional_60 = additional_60 * @f,
  from_10_to_20 = from_10_to_20 * @f, from_20_to_30 = from_20_to_30 * @f, from_30_to_40 = from_30_to_40 * @f,
  from_40_to_50 = from_40_to_50 * @f, from_50_to_60 = from_50_to_60 * @f, less_10 = less_10 * @f,
  less_15 = less_15 * @f, less_30 = less_30 * @f, more_10 = more_10 * @f, pickup_point = pickup_point * @f;

-- ── tasks ──────────────────────────────────────────────────────────────────
UPDATE tasks SET name = fake_task(id), description = NULL;
UPDATE components_task_task_checklists SET name = fake_task(id + 3);

-- ── leftovers found by check-leaks.sh ──────────────────────────────────────
UPDATE configs SET front_url = 'https://demo.exemple.coop/stats/#/';
UPDATE us SET front_url = 'https://demo.exemple.coop/stats/#/';
UPDATE social_entities SET name = fake_company(id + 100);
UPDATE verifactus SET software_developer_name = 'Desenvolupador Demo', software_developer_irs_id = '00000000T',
  software_number = 'F00000000', software_address = 'Carrer de l''Exemple, 1';
UPDATE admin_users SET firstname = 'Admin', lastname = id, username = NULL, email = CONCAT('admin', id, '@exemple.coop');
DELETE FROM files WHERE ext IN ('.p12', '.pfx');
UPDATE files SET hash = CONCAT('document_', id), url = CONCAT('/uploads/document_', id, IFNULL(ext, '')),
  formats = NULL, preview_url = NULL;

-- ── never send anything from this copy ─────────────────────────────────────
DELETE FROM face_queues;
DELETE FROM verifactu_chains;

SET FOREIGN_KEY_CHECKS = 1;
DROP FUNCTION fake_person; DROP FUNCTION fake_company; DROP FUNCTION fake_project; DROP FUNCTION fake_concept;
DROP FUNCTION fake_activity; DROP FUNCTION fake_task; DROP FUNCTION fake_town;
