import { BaseEntity } from '../shared';

// Course pricing model
export interface CoursePrice extends BaseEntity {
  name: string;
  description: string;
  durations: CourseDuration[];
  features: string[];
  category: 'standard' | 'premium' | 'vip';
  displayOrder: number;
  isActive: boolean;
  isPopular?: boolean;
  targetAudience?: string;
  minAge?: number;
  maxAge?: number;
}

export interface CourseDuration {
  time: number; // in minutes
  price: number; // in yen
}

// Option pricing model
export interface OptionPrice extends BaseEntity {
  name: string;
  description?: string;
  price: number;
  duration?: number; // additional time in minutes
  category: 'relaxation' | 'body-care' | 'extension' | 'special';
  displayOrder: number;
  isActive: boolean;
  note?: string;
}

// Additional fees model
export interface AdditionalFee extends BaseEntity {
  name: string;
  type: 'fixed' | 'percentage' | 'range';
  value: number | { min: number; max: number };
  description?: string;
  displayOrder: number;
  isActive: boolean;
}

// Store-specific pricing configuration
export interface StorePricing {
  storeId: string;
  courses: CoursePrice[];
  options: OptionPrice[];
  additionalFees: AdditionalFee[];
  notes: string[];
  lastUpdated: Date;
}

// Pricing sync status
export interface PricingSyncStatus {
  storeId: string;
  lastSyncedAt: Date;
  isSynced: boolean;
  pendingChanges: number;
}