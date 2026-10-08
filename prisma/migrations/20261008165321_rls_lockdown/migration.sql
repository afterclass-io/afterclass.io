-- Deny-all lockdown for the Supabase Data API roles (issue 562).
-- Backend access runs as the table owner, which skips RLS. No policy is created.
DO $$
DECLARE
  tbl regclass;
  fn regprocedure;
  api_role text;
  grantees text := 'PUBLIC';
BEGIN
  -- Lock 1: enable RLS on every ordinary or partitioned table in public.
  FOR tbl IN
    SELECT c.oid::regclass
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
  LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', tbl);
  END LOOP;

  -- Lock 2 and 3: act only on the API roles that exist on this server.
  FOR api_role IN
    SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated')
  LOOP
    grantees := grantees || ', ' || quote_ident(api_role);

    EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %I', api_role);
    EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %I', api_role);

    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM %I', api_role);
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM %I', api_role);
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM %I', api_role);
  END LOOP;

  -- Lock 2 for functions: skip extension members (pg_trgm) via pg_depend.deptype = 'e'.
  FOR fn IN
    SELECT p.oid::regprocedure
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND NOT EXISTS (
        SELECT 1 FROM pg_depend d
        WHERE d.classid = 'pg_proc'::regclass
          AND d.objid = p.oid
          AND d.deptype = 'e'
      )
  LOOP
    EXECUTE format('REVOKE ALL ON ROUTINE %s FROM %s', fn, grantees);
  END LOOP;
END
$$;
