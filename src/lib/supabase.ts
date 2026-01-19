import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://khnsqupkdnouimonughn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtobnNxdXBrZG5vdWltb251Z2huIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MjAwMzMsImV4cCI6MjA4NDM5NjAzM30.ht5lJRTncl1okstZi-3m3UeA5G2AWuazTlNJsaKr2CU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
