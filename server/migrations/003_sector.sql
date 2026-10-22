-- Custom sector support. Sector presets are configuration: the industry
-- check widens to 'custom' and the field presets live in their own jsonb
-- column so the fixed BANT qualification shape stays intact.
ALTER TABLE business_profiles DROP CONSTRAINT IF EXISTS business_profiles_industry_check;
ALTER TABLE business_profiles ADD CONSTRAINT business_profiles_industry_check CHECK(industry IN ('general','real_estate','medical','automotive','beauty','ecommerce','custom'));
ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS sector_fields jsonb NOT NULL DEFAULT '[]'::jsonb;
