-- Fix campaigns that store display name instead of family codice
UPDATE campaigns c SET scope_detail = f.codice
FROM famiglie f
WHERE c.scope = 'family' AND LOWER(c.scope_detail) = LOWER(f.nome) AND c.scope_detail != f.codice;

-- Fix campaigns that store display name instead of raccolta slug/codice
UPDATE campaigns c SET scope_detail = r.slug
FROM raccolte r
WHERE c.scope = 'collection' AND (LOWER(c.scope_detail) = LOWER(r.nome) OR LOWER(c.scope_detail) = LOWER(r.slug)) AND c.scope_detail != r.slug;
