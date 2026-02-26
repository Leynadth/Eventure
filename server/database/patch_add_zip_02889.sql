-- Add ZIP 02889 (Warwick, RI) to zip_locations so radius search from 02910 includes 02889.
-- Run this once on existing DBs that were seeded before 02889 was added.
INSERT INTO zip_locations (zip_code, lat, lng, city, state) VALUES
('02889', 41.6962, -71.4912, 'Warwick', 'RI')
ON CONFLICT (zip_code) DO UPDATE SET
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng,
  city = EXCLUDED.city,
  state = EXCLUDED.state;
