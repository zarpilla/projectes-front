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
-- the footers, subject and templates are free text: they carried the real IBAN,
-- bank and address and the quote/invoice views print them (issues/056)
UPDATE us SET
  invoice_footer = 'Cooperativa Demo SCCL · Carrer de l''Exemple, 1 · 08000 Vilafranca de Prova · IBAN ES00 0000 0000 0000 0000 0000',
  quote_footer = 'Cooperativa Demo SCCL · Pressupost vàlid durant 30 dies · IBAN ES00 0000 0000 0000 0000 0000',
  order_footer = IF(order_footer IS NULL, NULL, 'Cooperativa Demo SCCL · hola@exemple.coop'),
  invoice_subject = IF(invoice_subject IS NULL, NULL, 'Factura {code} de Cooperativa Demo'),
  invoice_template = NULL,
  contact_form_text = IF(contact_form_text IS NULL, NULL, 'Escriu-nos i et respondrem aviat.'),
  contact_form_thankyou = IF(contact_form_thankyou IS NULL, NULL, 'Gràcies pel missatge.'),
  front_url = NULL;
-- the entity's logo and Google credentials files (media links of the single type)
DELETE FROM files_related_mph WHERE related_type = 'api::me.me';
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
  price = price * @f; -- comments and contact_notes: see the logistics section

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

-- strategies: the names were the source cooperative's strategic plan, with its
-- name in one of them (issues/125). Generic goals by row. Numeric codes (1.1, 2.3…) are
-- kept; the others were project or place names and become 5.1, 5.2…
-- Safe to run again.
CREATE TEMPORARY TABLE named_strategy_codes AS
  SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS n FROM strategies WHERE code NOT REGEXP '^[0-9.]*$';
UPDATE strategies s JOIN named_strategy_codes x ON x.id = s.id SET s.code = CONCAT('5.', x.n);
UPDATE strategies SET
  name = ELT(1 + MOD(id, 12),
    'Enfortir la governança democràtica de la cooperativa',
    'Diversificar els ingressos i reduir la dependència de subvencions',
    'Millorar les condicions laborals i la conciliació de l''equip',
    'Créixer en projectes d''intercooperació amb altres entitats',
    'Consolidar l''acompanyament a entitats de l''economia social',
    'Reforçar la comunicació i la presència al territori',
    'Impulsar la formació interna i el relleu de coneixement',
    'Ampliar la base social i la participació de les sòcies',
    'Reduir l''impacte ambiental de l''activitat',
    'Desenvolupar serveis nous a partir de la demanda',
    'Ordenar la gestió econòmica i la tresoreria',
    'Treballar en xarxa amb les administracions locals'),
  description = NULL;
UPDATE strategies SET code_name = CONCAT_WS(' - ', NULLIF(code, ''), name);

-- scopes, project types and activity types: each entity names them after its own
-- projects, areas and programmes, which identifies it. Generic names are kept; any
-- other name is replaced, in id order, from a list of generic ones (ordered so that each
-- one resembles the projectes_v5_manual name it replaces). The comparison ignores case and
-- accents. The fake names count as generic, so it is safe to run again.
CREATE TEMPORARY TABLE generic_names (tbl VARCHAR(20), name VARCHAR(100), short_name VARCHAR(20), n INT);
INSERT INTO generic_names (tbl, name) VALUES
  ('scope', 'Docència i recerca'), ('scope', 'Entitats, cooperatives i empreses'),
  ('scope', 'Desenvolupament personal i relacional'), ('scope', 'Estructura'),
  ('type', 'Standard'), ('type', 'Propi'), ('type', 'Urgent'), ('type', 'Remunerat'), ('type', 'No remunerat'),
  ('type', 'Comunicació'), ('type', 'Universitats'), ('type', 'Cursos'), ('type', 'Observatori'),
  ('activity', 'Baixa'), ('activity', 'baixa mèdica'), ('activity', 'Vacances'), ('activity', 'Trasllat'),
  ('activity', 'Excedència'), ('activity', 'Visita mèdica'), ('activity', 'Permís maternitat'),
  ('activity', 'Gestió'), ('activity', 'Disseny'), ('activity', 'Helpdesk'), ('activity', 'Servidors'),
  ('activity', 'Estructura'), ('activity', 'i+d'), ('activity', 'Fons Locals'), ('activity', 'Fons Transnacionals'),
  ('activity', 'Fons Estatals'), ('activity', 'Fons Europeus'), ('activity', 'Fons Catalunya'),
  ('activity', 'ADMIN'), ('activity', 'LEGAL'), ('activity', 'COMUNICA'), ('activity', 'ESPAI CURES'),
  ('activity', 'INFOR'), ('activity', 'INFORMÀTICA'), ('activity', 'FORMACIÓ'), ('activity', 'PROSPECCIÓ'),
  ('activity', 'ROL CONSELL'), ('activity', 'ROL ESTRATÈGIC (CONSELL RECTOR)'), ('activity', 'PLANIFICACIÓ ESTRATÈGICA'),
  ('activity', 'F1 Coordinació'), ('activity', 'F5 Curriculum'), ('activity', 'F2 Assessorament'),
  ('activity', 'F2: Formació en línia'), ('activity', 'F3: Formació presencial'),
  ('activity', 'Reunions'), ('activity', 'Transport'), ('activity', 'desplaçament'), ('activity', 'comercial'),
  ('activity', 'comptabilitat'), ('activity', 'gestió rutes'), ('activity', 'Gestions tècniques'),
  ('activity', 'hores acumulades any anterior'), ('activity', 'laboral');
INSERT INTO generic_names (tbl, name, short_name, n) VALUES
  ('fake_scope', 'Territori i administracions', 'T', 1), ('fake_scope', 'Comunitats i barris', 'C', 2),
  ('fake_scope', 'Estratègia interna', 'EI', 3), ('fake_scope', 'Transició ecològica', 'TE', 4),
  ('fake_scope', 'Comunicació', 'Co', 5), ('fake_scope', 'Xarxes i aliances', 'X', 6),
  ('fake_scope', 'Habitatge cooperatiu', 'H', 7), ('fake_scope', 'Cultura i territori', 'CT', 8),
  ('fake_scope', 'Consultoria', 'Cn', 9), ('fake_scope', 'Emprenedoria social', 'ES', 10),
  ('fake_scope', 'Projectes formatius', 'PF', 11), ('fake_scope', 'Cursos', 'Cu', 12),
  ('fake_scope', 'Universitats', 'U', 13),
  ('fake_type', 'Consultoria', NULL, 1), ('fake_type', 'Consultoria internacional', NULL, 2),
  ('fake_type', 'Acompanyament a entitats', NULL, 3), ('fake_type', 'Xarxes locals', NULL, 4),
  ('fake_type', 'Aliances internacionals', NULL, 5), ('fake_type', 'Encàrrecs puntuals', NULL, 6),
  ('fake_type', 'Ateneu cooperatiu', NULL, 7), ('fake_type', 'Formació de formadores', NULL, 8),
  ('fake_type', 'Estructura', NULL, 9), ('fake_type', 'Prospecció internacional', NULL, 10),
  ('fake_type', 'Prospecció local', NULL, 11), ('fake_type', 'Economia social', NULL, 12),
  ('fake_type', 'Recerca aplicada', NULL, 13), ('fake_type', 'Transició energètica', NULL, 14),
  ('fake_type', 'Jornades i trobades', NULL, 15), ('fake_type', 'Barris cooperatius', NULL, 16),
  ('fake_type', 'Ecosistema emprenedor', NULL, 17), ('fake_type', 'Desenvolupament local', NULL, 18),
  ('fake_type', 'Projectes formatius', NULL, 19), ('fake_type', 'Cooperació', NULL, 20),
  ('fake_type', 'Habitatge', NULL, 21), ('fake_type', 'Alimentació', NULL, 22),
  ('fake_type', 'Educació ambiental', NULL, 23), ('fake_type', 'Cures i comunitat', NULL, 24),
  ('fake_activity', 'Desenvolupament web', NULL, 1), ('fake_activity', 'Dades obertes', NULL, 2),
  ('fake_activity', 'Traduccions', NULL, 3), ('fake_activity', 'F1 Recerca participativa', NULL, 4),
  ('fake_activity', 'F2 Caixa d''eines', NULL, 5), ('fake_activity', 'F3 Itineraris formatius', NULL, 6),
  ('fake_activity', 'F4 Guia de bones pràctiques', NULL, 7), ('fake_activity', 'F6 Coordinació i avaluació', NULL, 8),
  ('fake_activity', 'Web', NULL, 9), ('fake_activity', 'F1: Coordinació i avaluació', NULL, 10),
  ('fake_activity', 'F4: Acompanyament a l''alumnat', NULL, 11);
-- MySQL can't reopen a temporary table in the same query: copy the name lists
CREATE TEMPORARY TABLE keep_names AS
  SELECT REPLACE(tbl, 'fake_', '') AS tbl, name FROM generic_names;
CREATE TEMPORARY TABLE renamed_config (tbl VARCHAR(20), id INT, n INT);
INSERT INTO renamed_config SELECT 'scope', id, ROW_NUMBER() OVER (ORDER BY id) FROM project_scopes
  WHERE name NOT IN (SELECT name FROM keep_names WHERE tbl = 'scope');
INSERT INTO renamed_config SELECT 'type', id, ROW_NUMBER() OVER (ORDER BY id) FROM project_types
  WHERE TRIM(name) NOT IN (SELECT name FROM keep_names WHERE tbl = 'type');
INSERT INTO renamed_config SELECT 'activity', id, ROW_NUMBER() OVER (ORDER BY id) FROM activity_types
  WHERE name NOT IN (SELECT name FROM keep_names WHERE tbl = 'activity');
UPDATE project_scopes s
  JOIN renamed_config x ON x.tbl = 'scope' AND x.id = s.id
  JOIN generic_names g ON g.tbl = 'fake_scope' AND g.n = 1 + MOD(x.n - 1, 13)
  SET s.name = g.name, s.short_name = g.short_name;
UPDATE project_types t
  JOIN renamed_config x ON x.tbl = 'type' AND x.id = t.id
  JOIN generic_names g ON g.tbl = 'fake_type' AND g.n = 1 + MOD(x.n - 1, 24)
  SET t.name = g.name;
UPDATE activity_types a
  JOIN renamed_config x ON x.tbl = 'activity' AND x.id = a.id
  JOIN generic_names g ON g.tbl = 'fake_activity' AND g.n = 1 + MOD(x.n - 1, 11)
  SET a.name = g.name;

-- project money fields (grants, invoiced hours)
UPDATE projects SET
  invoice_hours_price = invoice_hours_price * @f,
  grantable_amount = grantable_amount * @f, grantable_amount_total = grantable_amount_total * @f,
  grantable_cofinancing = grantable_cofinancing * @f, grantable_structural_expenses = grantable_structural_expenses * @f,
  grantable_structural_expenses_justify_invoices = grantable_structural_expenses_justify_invoices * @f;

-- stored project totals (money only; *_hours without "price" are hours), in
-- project_totals since issues/328 (the old columns of projects were dropped by
-- issues/329: a dump from before 2026-10-24 needs a backend boot first).
UPDATE project_totals SET balance = balance * @f, estimated_balance = estimated_balance * @f, estimated_incomes_expenses = estimated_incomes_expenses * @f, incomes_expenses = incomes_expenses * @f, original_incomes_expenses = original_incomes_expenses * @f, total_estimated_expenses = total_estimated_expenses * @f, total_estimated_expenses_vat = total_estimated_expenses_vat * @f, total_estimated_hours_price = total_estimated_hours_price * @f, total_estimated_incomes = total_estimated_incomes * @f, total_expenses = total_expenses * @f, total_expenses_vat = total_expenses_vat * @f, total_incomes = total_incomes * @f, total_original_expenses = total_original_expenses * @f, total_original_expenses_vat = total_original_expenses_vat * @f, total_original_hours_price = total_original_hours_price * @f, total_original_incomes = total_original_incomes * @f, total_real_expenses = total_real_expenses * @f, total_real_expenses_vat = total_real_expenses_vat * @f, total_real_hours_price = total_real_hours_price * @f, total_real_incomes = total_real_incomes * @f, total_real_incomes_expenses = total_real_incomes_expenses * @f;

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
UPDATE configs SET front_url = 'https://demo.exemple.coop/';
UPDATE us SET front_url = 'https://demo.exemple.coop/';
UPDATE social_entities SET name = fake_company(id + 100);
UPDATE verifactus SET software_developer_name = 'Desenvolupador Demo', software_developer_irs_id = '00000000T',
  software_number = 'F00000000', software_address = 'Carrer de l''Exemple, 1',
  software_location = 'Vilafranca de Prova';
UPDATE admin_users SET firstname = 'Admin', lastname = id, username = NULL, email = CONCAT('admin', id, '@exemple.coop');
DELETE FROM files WHERE ext IN ('.p12', '.pfx');
UPDATE files SET hash = CONCAT('document_', id), url = CONCAT('/uploads/document_', id, IFNULL(ext, '')),
  formats = NULL, preview_url = NULL;

-- ── logistics (block F, diligencia) ────────────────────────────────────────
-- Added for projectes_v5_manual_logistica. Everything here is idempotent (values derive
-- from row ids or from other already-fake rows) and touches only logistics tables, which
-- are empty or unused in the resilience copies. Runs after the generic sections above, so
-- contacts, users and orders already have fake values: here they get logistics-flavoured
-- names and the order snapshots are made to match the (fake) linked contact.
-- Contacts and users are renamed only when the copy has orders (@log), so a resilience
-- copy keeps the generic fake names it gets above.
SET @log = EXISTS (SELECT 1 FROM orders);
DROP FUNCTION IF EXISTS fake_point;
DROP FUNCTION IF EXISTS fake_producer;
DELIMITER //
-- delivery / consumption points (shops, restaurants, consumer groups…)
CREATE FUNCTION fake_point (i INT) RETURNS VARCHAR(150) DETERMINISTIC
  RETURN CONCAT(
    ELT(1 + i % 10, 'Botiga', 'Restaurant', 'Grup de consum', 'Fleca', 'Bar', 'Escola', 'Cooperativa de consum',
      'Queviures', 'Mercat', 'Punt de consum'), ' ',
    ELT(1 + (i DIV 10) % 30, 'La Placeta', 'El Cistell', 'Can Prova', 'L''Esquirol', 'La Plaça', 'El Rebost Demo',
      'La Cantonada', 'El Graner', 'Cal Mostra', 'La Murtra', 'El Celler Vell', 'Les Oliveres', 'La Rambla',
      'El Portal', 'Cal Fictici', 'La Font', 'El Mercadal', 'La Teulada', 'Can Exemple', 'El Pati', 'La Porxada',
      'El Pou', 'Ca la Demo', 'Les Hortes', 'El Raval', 'La Riera', 'El Campanar', 'La Sitja', 'L''Àncora', 'El Pinar'),
    IF(i >= 300, CONCAT(' ', i), ''));
//
-- producers that send orders (providers)
CREATE FUNCTION fake_producer (i INT) RETURNS VARCHAR(150) DETERMINISTIC
  RETURN CONCAT(
    ELT(1 + i % 10, 'Mas', 'Formatgeria', 'Horta', 'Celler', 'Obrador', 'Granja', 'Fleca', 'Cervesa', 'Mel', 'Conserves'), ' ',
    ELT(1 + (i DIV 10) % 20, 'Can Demo', 'El Prat Fictici', 'La Solana', 'Les Feixes', 'Cal Mostra', 'El Bosc',
      'La Vall', 'Puigprova', 'El Serrat', 'La Riba', 'Can Exemple', 'El Turó', 'La Plana', 'Les Bruixes',
      'El Rieral', 'Coll de Prova', 'La Closa', 'El Molí Vell', 'Sant Demo', 'La Garriga Fictícia'));
//
DELIMITER ;

-- providers: contacts of users with the `orders` permission, plus type Proveïdora
CREATE TEMPORARY TABLE log_order_users AS
  SELECT DISTINCT c.entity_id AS user_id
  FROM `users-permissions_user_cmps` c
  JOIN components_permissions_application_permissions p ON p.id = c.cmp_id
  WHERE c.component_type = 'permissions.application-permission' AND p.permission = 'orders';
CREATE TEMPORARY TABLE log_providers AS
  SELECT DISTINCT l.contact_id FROM contacts_users_permissions_user_lnk l JOIN log_order_users u ON u.user_id = l.user_id
  UNION
  SELECT l.contact_id FROM contacts_contact_types_lnk l JOIN contact_types t ON t.id = l.contact_type_id
  WHERE t.name = 'Proveïdora';
-- delivery points: contacts that receive orders, plus type Punt d'entrega
CREATE TEMPORARY TABLE log_points AS
  SELECT DISTINCT contact_id FROM orders_contact_lnk
  UNION
  SELECT l.contact_id FROM contacts_contact_types_lnk l JOIN contact_types t ON t.id = l.contact_type_id
  WHERE t.name = 'Punt d''entrega';
UPDATE contacts SET name = fake_point(id), trade_name = IF(trade_name IS NULL, NULL, fake_point(id))
  WHERE id IN (SELECT contact_id FROM log_points)
    AND id NOT IN (SELECT contact_id FROM log_providers WHERE contact_id IS NOT NULL) AND @log;
UPDATE contacts SET name = fake_producer(id), trade_name = IF(trade_name IS NULL, NULL, fake_producer(id))
  WHERE id IN (SELECT contact_id FROM log_providers) AND @log;
-- town of a delivery point: a real town served by the route of its latest order (towns are
-- configuration, not personal data, and a fake one would not match the route's town list)
CREATE TEMPORARY TABLE log_contact_route AS
  SELECT ocl.contact_id, MAX(orl.route_id) AS route_id
  FROM orders_contact_lnk ocl JOIN orders_route_lnk orl ON orl.order_id = ocl.order_id GROUP BY ocl.contact_id;
CREATE TEMPORARY TABLE log_route_city AS
  SELECT crr.route_id, ci.name,
    ROW_NUMBER() OVER (PARTITION BY crr.route_id ORDER BY ci.id) AS rn, COUNT(*) OVER (PARTITION BY crr.route_id) AS n
  FROM city_routes_route_lnk crr
  JOIN city_routes_city_lnk crc ON crc.city_route_id = crr.city_route_id
  JOIN cities ci ON ci.id = crc.city_id;
UPDATE contacts c
  JOIN log_contact_route lr ON lr.contact_id = c.id
  JOIN log_route_city rc ON rc.route_id = lr.route_id AND rc.rn = 1 + c.id % rc.n
  SET c.city = rc.name WHERE c.city IS NOT NULL;
UPDATE contacts SET address = IF(address IS NULL, NULL, CONCAT('Carrer Exemple, ', 1 + id % 120)),
  external_id = IF(external_id IS NULL OR external_id = '', external_id, CONCAT('EXT-', id)),
  external_id_2 = IF(external_id_2 IS NULL OR external_id_2 = '', external_id_2, CONCAT('EXT2-', id))
  WHERE @log;

-- provider logins show their company name (the generic section gave them a person's name)
UPDATE `users-permissions_user` u
  JOIN (SELECT l.user_id, MIN(l.contact_id) AS contact_id FROM contacts_users_permissions_user_lnk l
        JOIN log_order_users ou ON ou.user_id = l.user_id GROUP BY l.user_id) uc ON uc.user_id = u.id
  JOIN contacts c ON c.id = uc.contact_id
  SET u.username = c.name, u.fullname = c.name WHERE @log;

-- orders: the recipient snapshot copies the (fake) linked contact; free text becomes generic
UPDATE orders o
  JOIN orders_contact_lnk l ON l.order_id = o.id
  JOIN contacts c ON c.id = l.contact_id
  SET o.contact_name = c.name, o.contact_trade_name = c.trade_name, o.contact_nif = c.nif,
    o.contact_phone = IF(o.contact_phone IS NULL OR o.contact_phone = '', o.contact_phone, IFNULL(c.phone, '600 000 000')),
    o.contact_address = IF(o.contact_address IS NULL OR o.contact_address = '', o.contact_address, IFNULL(c.address, CONCAT('Carrer Exemple, ', 1 + c.id % 120))),
    o.contact_city = IF(o.contact_city IS NULL OR o.contact_city = '', o.contact_city, IFNULL(c.city, o.contact_city)),
    o.contact_postcode = IF(o.contact_postcode IS NULL OR o.contact_postcode = '', o.contact_postcode, IFNULL(c.postcode, '08000'));
UPDATE orders SET
  comments = IF(comments IS NULL OR TRIM(comments) = '', comments, ELT(1 + id % 8, 'Trucar abans d''entregar',
    'Entregar al matí', 'Retornar els envasos', 'Fràgil: ampolles de vidre', 'Entrada per la porta del darrere',
    'Horari de recepció de 9 a 13 h', 'Mantenir refrigerat', 'Deixar a la recepció')),
  contact_notes = IF(contact_notes IS NULL OR TRIM(contact_notes) = '', contact_notes, ELT(1 + id % 5,
    'Avisar 10 minuts abans d''arribar', 'Timbre del segon pis', 'Tancat els dilluns',
    'Càrrega i descàrrega al carrer del costat', 'Preguntar per la persona responsable')),
  provider_order_number = IF(provider_order_number IS NULL OR provider_order_number = '', provider_order_number,
    CONCAT('PED-', LPAD(id, 6, '0')));
-- packages of a multi-recipient order (orders_cmps → orders.lines)
UPDATE components_orders_lines SET name = fake_person(id + 300),
  nif = IF(nif IS NULL OR nif = '', nif, CONCAT(LPAD(id, 8, '0'), 'T'));

-- incidences and their replies
UPDATE incidences SET description = IF(description IS NULL OR description = '', description, ELT(1 + id % 8,
  'El client diu que no ha rebut la comanda', 'Canvi de data d''entrega demanat pel proveïdor',
  'Falta un bult a l''entrega', 'Adreça incompleta, cal confirmar-la', 'Comanda entrada fora d''hora',
  'Establiment tancat a l''hora d''entrega', 'Bult malmès durant el transport', 'Cal entregar-la un altre dia'));
UPDATE components_orders_incidence_responses SET text = IF(text IS NULL OR text = '', text, ELT(1 + id % 6,
  'Revisat, l''entreguem demà', 'Hem parlat amb el client i tot és correcte', 'Adreça corregida',
  'D''acord, gràcies!', 'Comanda anul·lada', 'Data d''entrega canviada'));

-- pickup points (warehouses): keep the town, drop the partner's name
UPDATE pickups SET name = TRIM(SUBSTRING_INDEX(name, ' - ', 1)),
  message = IF(message IS NULL, NULL, CONCAT('Recorda que la data límit de dipòsit al magatzem és a les 14.00 h ',
    'del dia anterior a l''entrega.'));
-- route names are place names; one carried a person's name
UPDATE routes SET name = REGEXP_REPLACE(name, 'CONTACTA [[:alpha:]]+', 'CONTACTA AMB L''OFICINA'),
  short_name = REGEXP_REPLACE(short_name, 'CONTACTA [[:alpha:]]+', 'CONTACTA AMB L''OFICINA')
  WHERE name REGEXP 'CONTACTA [[:alpha:]]+' AND name NOT LIKE '%L''OFICINA%';

-- contact form messages
UPDATE form_submissions SET name = fake_person(id + 500), email = CONCAT('formulari', id, '@exemple.org'),
  message = 'Hola, voldria informació sobre el servei de distribució. Gràcies!';
-- change log: who made the change, and the full snapshot of the document
UPDATE document_change_logs SET username = IF(username IS NULL, NULL, 'Persona Demo'), snapshot = NULL;
-- open sessions of the real users
DELETE FROM strapi_sessions;

-- found by check-leaks.sh on the logistics copy (generic, also safe on other copies):
-- document concepts are free text with supplier names and months
UPDATE emitted_invoices SET document_concept = IF(document_concept IS NULL OR document_concept = '', document_concept,
  'Serveis logístics');
UPDATE quotes SET document_concept = IF(document_concept IS NULL OR document_concept = '', document_concept,
  'Pressupost de serveis');
UPDATE received_invoices SET document_concept = IF(document_concept IS NULL OR document_concept = '', document_concept,
  fake_concept(id + 5));
UPDATE received_expenses SET document_concept = IF(document_concept IS NULL OR document_concept = '', document_concept,
  fake_concept(id + 5));
UPDATE received_incomes SET document_concept = IF(document_concept IS NULL OR document_concept = '', document_concept,
  fake_concept(id));
UPDATE received_invoices SET contact_invoice_number = IF(contact_invoice_number IS NULL OR contact_invoice_number = '',
  contact_invoice_number, CONCAT('FRA-', LPAD(id, 6, '0')));
UPDATE `users-permissions_user` SET reset_password_token = NULL, confirmation_token = NULL;
-- invoice snapshots of the contact: copy the logistics names given above
UPDATE components_contact_contact_data cd
  JOIN emitted_invoices_cmps m ON m.cmp_id = cd.id AND m.component_type = 'contact.contact-data'
  JOIN emitted_invoices_contact_lnk l ON l.emitted_invoice_id = m.entity_id
  JOIN contacts c ON c.id = l.contact_id
  SET cd.name = c.name, cd.nif = c.nif, cd.address = c.address, cd.postcode = c.postcode, cd.city = c.city
  WHERE @log;
-- file names with dots ("51.-23 Factura <entity> - <client>") left the rest in the extension
UPDATE files SET ext = '' WHERE ext IS NOT NULL AND ext NOT REGEXP '^\\.[A-Za-z0-9]{1,6}$';
UPDATE files SET name = CONCAT('document-', id, IFNULL(ext, '')), url = CONCAT('/uploads/document_', id, IFNULL(ext, ''));
-- the users-permissions provider settings carry the tenant's domain in the callback urls
UPDATE strapi_core_store_settings SET value = REGEXP_REPLACE(value, 'https://[^/"\\\\]+/api/auth/', 'https://demo.exemple.coop/api/auth/')
  WHERE `key` = 'plugin_users-permissions_grant';

DROP FUNCTION fake_point; DROP FUNCTION fake_producer;

-- ── never send anything from this copy ─────────────────────────────────────
DELETE FROM face_queues;
DELETE FROM verifactu_chains;

SET FOREIGN_KEY_CHECKS = 1;
DROP FUNCTION fake_person; DROP FUNCTION fake_company; DROP FUNCTION fake_project; DROP FUNCTION fake_concept;
DROP FUNCTION fake_activity; DROP FUNCTION fake_task; DROP FUNCTION fake_town;
