-- Non-superuser application role so FORCE RLS actually applies.
-- Superuser `verbal` (POSTGRES_USER) is reserved for migrations/seed admin tasks.

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'verbal_app') THEN
    CREATE ROLE verbal_app LOGIN PASSWORD 'verbal' NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
  END IF;
END
$$;

GRANT CONNECT ON DATABASE verbal_crm TO verbal_app;
GRANT USAGE ON SCHEMA public TO verbal_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO verbal_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO verbal_app;
ALTER DEFAULT PRIVILEGES FOR ROLE verbal IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO verbal_app;
ALTER DEFAULT PRIVILEGES FOR ROLE verbal IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO verbal_app;
