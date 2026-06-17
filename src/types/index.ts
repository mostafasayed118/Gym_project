export type UserRole = "admin" | "coach" | "user";

export interface UserPublicMetadata {
  role: UserRole;
}

export interface ConvexUser {
  _id: string;
  clerkId: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  coachId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Plan {
  _id: string;
  _creationTime: number;
  coachId: string;
  clientId: string;
  title: string;
  description: string;
  exercises: PlanExercise[];
  startDate: string;
  endDate: string;
  status: "active" | "completed" | "archived";
}

export interface PlanExercise {
  name: string;
  sets: number;
  reps: number;
  weight?: number;
  duration?: number;
  notes?: string;
}

export interface Session {
  _id: string;
  _creationTime: number;
  clientId: string;
  coachId: string;
  planId: string;
  date: string;
  exercises: SessionExercise[];
  completed: boolean;
  notes?: string;
}

export interface SessionExercise {
  name: string;
  sets: SessionSet[];
}

export interface SessionSet {
  reps: number;
  weight: number;
  completed: boolean;
}

export interface Progress {
  _id: string;
  _creationTime: number;
  clientId: string;
  date: string;
  weight?: number;
  bodyFat?: number;
  measurements?: BodyMeasurements;
  notes?: string;
  photos?: string[];
}

export interface BodyMeasurements {
  chest?: number;
  waist?: number;
  hips?: number;
  arms?: number;
  thighs?: number;
}
