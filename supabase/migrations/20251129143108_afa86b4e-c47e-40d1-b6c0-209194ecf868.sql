-- Create enum for event types
CREATE TYPE public.event_type AS ENUM ('void', 'leakage', 'intake');

-- Create enum for leakage severity
CREATE TYPE public.leakage_severity AS ENUM ('small', 'medium', 'large');

-- Create enum for data source
CREATE TYPE public.entry_source AS ENUM ('scan', 'manual');

-- Create diary_entries table
CREATE TABLE public.diary_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  time TIME NOT NULL DEFAULT CURRENT_TIME,
  event_type public.event_type NOT NULL,
  volume_ml INTEGER,
  urgency INTEGER CHECK (urgency >= 1 AND urgency <= 5),
  leakage_severity public.leakage_severity,
  intake_type TEXT,
  trigger TEXT,
  notes TEXT,
  source public.entry_source NOT NULL DEFAULT 'manual',
  confidence TEXT CHECK (confidence IN ('high', 'medium', 'low')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.diary_entries ENABLE ROW LEVEL SECURITY;

-- For now, allow all operations (we'll tighten this with auth later)
CREATE POLICY "Allow all operations for now" 
ON public.diary_entries 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_diary_entries_date ON public.diary_entries(date);
CREATE INDEX idx_diary_entries_event_type ON public.diary_entries(event_type);
CREATE INDEX idx_diary_entries_user_id ON public.diary_entries(user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_diary_entries_updated_at
BEFORE UPDATE ON public.diary_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for the table
ALTER PUBLICATION supabase_realtime ADD TABLE public.diary_entries;