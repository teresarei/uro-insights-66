-- Add catheter-related columns to diary_entries table
ALTER TABLE public.diary_entries 
ADD COLUMN uses_catheter boolean DEFAULT false,
ADD COLUMN volume_with_catheter_ml integer DEFAULT NULL,
ADD COLUMN volume_without_catheter_ml integer DEFAULT NULL;