-- Quick SQL to diversify violation driver names
-- Run this in Django dbshell or PostgreSQL

DO $$
DECLARE
    cambodian_names TEXT[] := ARRAY[
        'Sokha Chan', 'Dara Kim', 'Srey Pov', 'Vanna Ly', 'Sophea Oum',
        'Ratana Kong', 'Bopha Chea', 'Piseth Heng', 'Chenda Sok', 'Rithy Mao',
        'Kunthea Tan', 'Narith Sam', 'Sreypov Keo', 'Virak Sim', 'Makara Chhin',
        'Sothea Prak', 'Reaksmey Nith', 'Channary Um', 'Pheakdey Yim', 'Soksan Chea'
    ];
    v_record RECORD;
    random_name TEXT;
BEGIN
    -- Update each violation with a random name from the array
    FOR v_record IN SELECT id FROM violations ORDER BY created_at
    LOOP
        random_name := cambodian_names[1 + floor(random() * array_length(cambodian_names, 1))::int];
        
        UPDATE violations 
        SET driver_name = random_name
        WHERE id = v_record.id;
    END LOOP;
    
    RAISE NOTICE 'Updated violations with diversified driver names';
END $$;

-- Show results
SELECT driver_name, COUNT(*) as count 
FROM violations 
GROUP BY driver_name 
ORDER BY driver_name 
LIMIT 20;
