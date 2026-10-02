-- Fixes slugs generated from accented brand names (e.g. "Lumière Skin" → "lumi-re-skin").
-- Idempotent: only rows still carrying the old slug are touched.
update brands set slug = 'lumiere-skin' where slug = 'lumi-re-skin';
update products set slug = 'lumiere-skin-' || substr(slug, length('lumi-re-skin-') + 1) where slug like 'lumi-re-skin-%';
