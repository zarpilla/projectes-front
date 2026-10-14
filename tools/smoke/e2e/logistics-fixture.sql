-- Logistics records orders.spec.mjs needs and an empty (seeded) database doesn't have.
-- Users can't create routes, pickups or delivery types through the API (only the
-- Strapi admin can), so they are inserted here, next to the "E2E SENTINEL" contact:
--   mysql ... <database> < tools/smoke/e2e/logistics-fixture.sql
-- Idempotent: each row is only added when it is missing. Cities and the city ↔ route
-- links are created by the spec itself, through the API.

-- a route that runs every day, so any delivery date is valid
INSERT INTO routes (document_id, name, short_name, active, `order`, monday, tuesday, wednesday, thursday, friday, saturday, sunday, created_at, updated_at, published_at)
SELECT 'e2e-route', 'E2E Ruta', 'E2E', 1, 1, 1, 1, 1, 1, 1, 1, 1, NOW(), NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM routes WHERE name = 'E2E Ruta');

-- "Recollida comanda": a warehouse (pickup = 0 is a normal pickup, not a collection point)
INSERT INTO pickups (document_id, name, alias, pickup, created_at, updated_at, published_at)
SELECT 'e2e-pickup', 'E2E Magatzem', 'E2E', 0, NOW(), NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM pickups WHERE name = 'E2E Magatzem');

-- "Tipus de servei": a new order takes the first one
INSERT INTO delivery_types (document_id, name, refrigerated, created_at, updated_at, published_at)
SELECT 'e2e-delivery-type', 'E2E Normal', 0, NOW(), NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM delivery_types WHERE name = 'E2E Normal');

-- the order form always sends contact_legal_form = 1
INSERT INTO legal_forms (id, document_id, name, created_at, updated_at, published_at)
SELECT 1, 'e2e-legal-form', 'E2E Cooperativa', NOW(), NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM legal_forms WHERE id = 1);

-- "Sector *" of a delivery point
INSERT INTO sectors (document_id, name, created_at, updated_at, published_at)
SELECT 'e2e-sector', 'E2E Sector', NOW(), NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sectors WHERE name = 'E2E Sector');

-- the delivery-point form gives every new contact the contact type with id 4
INSERT INTO contact_types (id, document_id, name, created_at, updated_at, published_at)
SELECT 3, 'e2e-contact-type-3', 'E2E tipus 3', NOW(), NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM contact_types WHERE id = 3);
INSERT INTO contact_types (id, document_id, name, created_at, updated_at, published_at)
SELECT 4, 'e2e-contact-type-4', 'E2E Punt d''entrega', NOW(), NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM contact_types WHERE id = 4);
