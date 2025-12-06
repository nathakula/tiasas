-- Helper to upsert a monthly NAV at the actual month-end date.
-- Usage:
-- SELECT upsert_monthly_nav_eom('org-id-here', '2025-01', 227800);
-- SELECT upsert_monthly_nav_eom('org-id-here', '2025-02-15', 200600);

CREATE OR REPLACE FUNCTION upsert_monthly_nav_eom(p_org_id TEXT, p_date_text TEXT, p_nav NUMERIC)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_first DATE;
  v_last  DATE;
BEGIN
  -- Normalize input to first of month
  IF p_date_text ~ '^\d{4}-\d{2}$' THEN
    v_first := make_date(substring(p_date_text,1,4)::int, substring(p_date_text,6,2)::int, 1);
  ELSE
    v_first := date_trunc('month', p_date_text::date)::date;
  END IF;
  -- Compute true last day
  v_last := (v_first + INTERVAL '1 month - 1 day')::date;

  INSERT INTO "MonthlyNav_eom" ("orgId","date", nav)
  VALUES (p_org_id, v_last, p_nav)
  ON CONFLICT ("orgId","date") DO UPDATE SET nav = EXCLUDED.nav, "updatedAt" = now();
END;
$$;

