insert into public.tenants (tenant_id, hospital_name, url_slug, status, created_at, updated_at)
values ('T-DEMO-01', 'iCare Demo Hospital', 'demo', 'Active', now(), now())
on conflict (url_slug) do nothing;
