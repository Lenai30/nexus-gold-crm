GRANT USAGE ON SCHEMA app_private TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.has_role(uuid, public.app_role) TO authenticated;

GRANT USAGE ON SCHEMA app_private TO anon;
GRANT EXECUTE ON FUNCTION app_private.has_role(uuid, public.app_role) TO anon;