export type AppRole = 'patient' | 'doctor';

export interface Doctor {
  id: string;
  user_id: string | null;
  username: string;
  display_name: string;
  department: string | null;
  created_at: string;
  updated_at: string;
}

export interface Patient {
  id: string;
  user_id: string | null;
  personal_number: string;
  display_name: string;
  created_at: string;
  updated_at: string;
}

export interface DoctorPatientAssignment {
  id: string;
  doctor_id: string;
  patient_id: string;
  assigned_at: string;
  notes: string | null;
  patient?: Patient;
}

export interface TreatmentPlan {
  id: string;
  recording_block_id: string;
  doctor_id: string;
  patient_id: string;
  plan_text: string;
  clinician_notes: string | null;
  created_at: string;
  updated_at: string;
  doctor?: Doctor;
}
