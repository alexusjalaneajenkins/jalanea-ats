-- Production was created from the simple-auth schema, which omitted this
-- nullable field even though the current session RPC contract returns it.
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS device_type text;
