ALTER TYPE public.question_status ADD VALUE IF NOT EXISTS 'deferred';
ALTER TYPE public.question_status ADD VALUE IF NOT EXISTS 'needs_technical_review';
ALTER TYPE public.question_status ADD VALUE IF NOT EXISTS 'resolved';