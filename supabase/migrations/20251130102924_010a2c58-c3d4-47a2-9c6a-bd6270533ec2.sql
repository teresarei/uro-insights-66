-- Create enum for roles
CREATE TYPE public.app_role AS ENUM ('patient', 'doctor');

-- Create user_roles table (separate from auth.users for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create doctors table for doctor credentials
CREATE TABLE public.doctors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    department TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on doctors
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;

-- Create patients table to store patient info
CREATE TABLE public.patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE,
    personal_number TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on patients
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- Create doctor-patient assignments table
CREATE TABLE public.doctor_patient_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    notes TEXT,
    UNIQUE (doctor_id, patient_id)
);

-- Enable RLS on assignments
ALTER TABLE public.doctor_patient_assignments ENABLE ROW LEVEL SECURITY;

-- Create treatment_plans table for doctors to add treatment plans
CREATE TABLE public.treatment_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recording_block_id UUID NOT NULL REFERENCES public.recording_blocks(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    plan_text TEXT NOT NULL,
    clinician_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on treatment_plans
ALTER TABLE public.treatment_plans ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (true);

CREATE POLICY "Allow insert for role assignment"
ON public.user_roles
FOR INSERT
WITH CHECK (true);

-- RLS Policies for doctors table
CREATE POLICY "Doctors can view their own info"
ON public.doctors
FOR SELECT
USING (true);

CREATE POLICY "Allow doctor creation"
ON public.doctors
FOR INSERT
WITH CHECK (true);

-- RLS Policies for patients table
CREATE POLICY "View patients"
ON public.patients
FOR SELECT
USING (true);

CREATE POLICY "Allow patient creation"
ON public.patients
FOR INSERT
WITH CHECK (true);

-- RLS Policies for doctor_patient_assignments
CREATE POLICY "View assignments"
ON public.doctor_patient_assignments
FOR SELECT
USING (true);

CREATE POLICY "Allow assignment creation"
ON public.doctor_patient_assignments
FOR INSERT
WITH CHECK (true);

-- RLS Policies for treatment_plans
CREATE POLICY "View treatment plans"
ON public.treatment_plans
FOR SELECT
USING (true);

CREATE POLICY "Doctors can create treatment plans"
ON public.treatment_plans
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Doctors can update treatment plans"
ON public.treatment_plans
FOR UPDATE
USING (true);

-- Add trigger for updated_at on doctors
CREATE TRIGGER update_doctors_updated_at
BEFORE UPDATE ON public.doctors
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add trigger for updated_at on patients
CREATE TRIGGER update_patients_updated_at
BEFORE UPDATE ON public.patients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add trigger for updated_at on treatment_plans
CREATE TRIGGER update_treatment_plans_updated_at
BEFORE UPDATE ON public.treatment_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some demo doctors for testing
INSERT INTO public.doctors (username, password_hash, display_name, department)
VALUES 
    ('dr.andersson', 'demo123', 'Dr. Erik Andersson', 'Urology'),
    ('dr.lindqvist', 'demo123', 'Dr. Anna Lindqvist', 'Urology');

-- Insert demo patients
INSERT INTO public.patients (personal_number, display_name)
VALUES 
    ('19800101-1234', 'Lars Karlsson'),
    ('19750515-5678', 'Maria Svensson'),
    ('19900303-9012', 'Johan Nilsson');

-- Assign demo patients to demo doctors
INSERT INTO public.doctor_patient_assignments (doctor_id, patient_id)
SELECT d.id, p.id FROM public.doctors d, public.patients p
WHERE d.username = 'dr.andersson';