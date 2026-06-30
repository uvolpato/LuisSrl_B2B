INSERT INTO site_config (key, value, updated_at) VALUES
('AI_Immagini_Provider', 'gemini', NOW()),
('AI_Immagini_Modello', 'gemini-2.5-flash-image', NOW()),
('AI_Immagini_Temperature', '0.4', NOW()),
('AI_Immagini_MaxTokens', '4096', NOW()),
('AI_Testi_Provider', 'gemini', NOW()),
('AI_Testi_Modello', 'gemini-2.5-flash', NOW()),
('AI_Testi_Endpoint', 'https://generativelanguage.googleapis.com/v1beta/models/', NOW()),
('AI_Testi_Temperature', '0.7', NOW()),
('AI_Testi_MaxTokens', '8192', NOW())
ON CONFLICT (key) DO NOTHING;
