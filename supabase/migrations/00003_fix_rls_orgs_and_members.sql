-- Ensure owners can select their organizations directly (not only via membership)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'organizations'
      AND policyname = 'Owners can view organization'
  ) THEN
    CREATE POLICY "Owners can view organization" ON public.organizations
      FOR SELECT USING (owner_id = auth.uid());
  END IF;
END $$;

-- Simplify membership visibility: users can view their own membership rows
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'organization_members'
      AND policyname = 'Users can view own membership'
  ) THEN
    CREATE POLICY "Users can view own membership" ON public.organization_members
      FOR SELECT USING (user_id = auth.uid());
  END IF;
END $$;

