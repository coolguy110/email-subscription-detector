export interface EmailInput {
  body: string;
  snippet: string;
  from: string;
  date: string;
  subject: string;
}

export type SubscriptionCycle = 
  | 'monthly' 
  | 'yearly' 
  | 'weekly' 
  | 'bi-weekly' 
  | 'quarterly' 
  | 'bi-monthly' 
  | 'bi-yearly' 
  | 'unknown';

export type SubscriptionCategory = 
  | 'streaming'
  | 'utilities'
  | 'software'
  | 'rent'
  | 'insurance'
  | 'food_delivery'
  | 'storage'
  | 'entertainment'
  | 'other';

export interface SubscriptionOutput {
  name: string;
  amount?: number;
  cycle: SubscriptionCycle;
  start_date: string;
  is_trial?: boolean;
  trial_duration_in_days?: number;
  trial_end_date?: string;
  category: SubscriptionCategory;
}