-- Create recording_blocks table for 72-hour recording periods
CREATE TABLE public.recording_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  end_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'incomplete' CHECK (status IN ('incomplete', 'complete')),
  
  -- Summary statistics
  void_count INTEGER DEFAULT 0,
  leakage_count INTEGER DEFAULT 0,
  intake_count INTEGER DEFAULT 0,
  total_voided_ml INTEGER DEFAULT 0,
  total_intake_ml INTEGER DEFAULT 0,
  total_leakage_weight_g NUMERIC DEFAULT 0,
  day_voided_ml INTEGER DEFAULT 0,
  night_voided_ml INTEGER DEFAULT 0,
  day_void_count INTEGER DEFAULT 0,
  night_void_count INTEGER DEFAULT 0,
  median_void_volume INTEGER,
  max_void_volume INTEGER,
  min_void_volume INTEGER,
  
  -- Clinical assessment
  clinical_patterns JSONB DEFAULT '[]'::jsonb,
  overall_assessment TEXT,
  
  -- Treatment plan
  treatment_plan TEXT,
  treatment_plan_updated_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.recording_blocks ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Allow all operations for recording_blocks"
ON public.recording_blocks
FOR ALL
USING (true)
WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_recording_blocks_updated_at
BEFORE UPDATE ON public.recording_blocks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();