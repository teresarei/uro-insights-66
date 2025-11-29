-- Add pad weight columns for leakage calculation
ALTER TABLE public.diary_entries 
ADD COLUMN IF NOT EXISTS dry_pad_weight_g numeric NULL,
ADD COLUMN IF NOT EXISTS wet_pad_weight_g numeric NULL,
ADD COLUMN IF NOT EXISTS leakage_weight_g numeric NULL;

-- Add comment explaining the leakage weight calculation
COMMENT ON COLUMN public.diary_entries.dry_pad_weight_g IS 'Weight of dry pad in grams (new pad)';
COMMENT ON COLUMN public.diary_entries.wet_pad_weight_g IS 'Weight of wet pad in grams after use';
COMMENT ON COLUMN public.diary_entries.leakage_weight_g IS 'Calculated leakage weight: wet_pad - dry_pad (in grams)';