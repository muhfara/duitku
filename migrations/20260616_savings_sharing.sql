-- ============================================================
-- DuitKu — Savings Sharing Feature
-- ============================================================

-- 1. Add email to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Backfill email from auth.users for existing accounts
UPDATE profiles p SET email = u.email FROM auth.users u WHERE u.id = p.id AND p.email IS NULL;

-- Update trigger to capture email on new signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.profile->>'name', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email WHERE profiles.email IS NULL;
  RETURN NEW;
END;
$$;

-- Allow any authenticated user to read any profile (needed for member display & email lookup)
DROP POLICY IF EXISTS "profiles_read_public" ON profiles;
CREATE POLICY "profiles_read_public" ON profiles FOR SELECT TO authenticated USING (true);

-- 2. Add user_id to savings_transactions to track who made each deposit
ALTER TABLE savings_transactions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 3. Create savings_members table
CREATE TABLE IF NOT EXISTS savings_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  savings_id UUID NOT NULL REFERENCES savings(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (savings_id, user_id)
);

ALTER TABLE savings_members ENABLE ROW LEVEL SECURITY;

-- Owner and members can view the member list
DROP POLICY IF EXISTS "savings_members_select" ON savings_members;
CREATE POLICY "savings_members_select" ON savings_members FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM savings s WHERE s.id = savings_id AND s.user_id = auth.uid())
  );

-- Only owner can add members
DROP POLICY IF EXISTS "savings_members_insert" ON savings_members;
CREATE POLICY "savings_members_insert" ON savings_members FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM savings s WHERE s.id = savings_id AND s.user_id = auth.uid()));

-- Owner can remove any member; member can remove themselves
DROP POLICY IF EXISTS "savings_members_delete" ON savings_members;
CREATE POLICY "savings_members_delete" ON savings_members FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM savings s WHERE s.id = savings_id AND s.user_id = auth.uid())
  );

GRANT SELECT, INSERT, DELETE ON savings_members TO authenticated;

-- 4. Update savings RLS: add SELECT policy for members
-- (existing "savings_own" FOR ALL already handles owner; adding member read)
DROP POLICY IF EXISTS "savings_member_read" ON savings;
CREATE POLICY "savings_member_read" ON savings FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM savings_members sm WHERE sm.savings_id = id AND sm.user_id = auth.uid()
  ));

-- 5. Update savings_transactions RLS: allow members to read and insert deposits
DROP POLICY IF EXISTS "savings_trx_member_read" ON savings_transactions;
CREATE POLICY "savings_trx_member_read" ON savings_transactions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM savings_members sm
    WHERE sm.savings_id = savings_transactions.savings_id AND sm.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "savings_trx_member_insert" ON savings_transactions;
CREATE POLICY "savings_trx_member_insert" ON savings_transactions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM savings_members sm
    WHERE sm.savings_id = savings_id AND sm.user_id = auth.uid()
  ));
