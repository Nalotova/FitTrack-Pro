export interface Set {
  reps: number;
  weight: number;
  cardioValues?: number[];
}

export interface Exercise {
  name: string;
  sets: Set[];
  isCardio?: boolean;
  isStatic?: boolean;
  staticType?: 'time' | 'reps';
  fields?: string[];
  rpe?: number;
}

export interface TechItem {
  id?: string;
  title: string;
  subtitle: string;
  content: string;
  order: number;
}

export interface Workout {
  id?: string;
  userId: string;
  date: string;
  day: string;
  exercises: Exercise[];
  notes?: string;
  isCardio?: boolean;
  duration?: number;
  avgHeartRate?: number;
  caloriesBurned?: number;
  totalVolume?: number;
}

export interface WeightMeasurement {
  id?: string;
  userId: string;
  date: string;
  weight: number;
  age?: number;
  fat?: number;
  muscle?: number;
  water?: number;
  chest?: number;
  waist?: number;
  waistHigh?: number;
  waistNavel?: number;
  waistWidest?: number;
  hips?: number;
  bicep?: number;
  thigh?: number;
  bmi?: number;
  visceralFat?: number;
  skeletalMuscleIndex?: number;
  waistHipRatio?: number;
  bodyType?: string;
  bodyShape?: string;
  bmr?: number;
  boneMass?: number;
  protein?: number;
  fatFreeMass?: number;
  biologicalAge?: number;
  heartRate?: number;
  photos?: string[];
}

export interface StrengthRecord {
  id?: string;
  userId: string;
  date: string;
  exercise: string;
  weight: number;
  reps: number;
  volume?: number;
  avgWeight?: number;
  maxWeight?: number;
  totalReps?: number;
  setsCount?: number;
  unit?: string;
  isBodyweight?: boolean;
  isCardio?: boolean;
  isStatic?: boolean;
  staticType?: 'time' | 'reps';
  rpe?: number;
}

export interface UserProfile {
  displayName: string;
  email: string;
  photoURL?: string;
  role: 'user' | 'admin';
  age?: string | number;
  gender?: 'male' | 'female';
  goal?: string;
  goalType?: 'hypertrophy' | 'strength' | 'fat_loss' | 'recomposition' | 'endurance' | 'tone';
  goalChangedAt?: string;
  reminders?: any[];
  createdAt?: string;
  updatedAt?: string;
  uid?: string;
}
