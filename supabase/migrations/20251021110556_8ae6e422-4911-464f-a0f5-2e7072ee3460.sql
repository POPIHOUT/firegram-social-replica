-- Update prices for 10 premium avatar frames to 100-250 flames
UPDATE frames 
SET price = 100 
WHERE name IN ('Space Galaxy', 'Lightning Storm', 'Magic Spell');

UPDATE frames 
SET price = 120 
WHERE name IN ('Dragon Scale', 'Fire Blaze');

UPDATE frames 
SET price = 150 
WHERE name IN ('Gem Diamond', 'Gold Crown');

UPDATE frames 
SET price = 180 
WHERE name IN ('Neon Glow', 'Tech Circuit');

UPDATE frames 
SET price = 200 
WHERE name IN ('Ice Frozen', 'Tribal Pattern');