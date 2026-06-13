-- Migrate existing users from old role names to new
update public.users set role = 'Accountant' where role = 'BillingOfficer';
update public.users set role = 'FrontDesk' where role = 'Receptionist';
update public.users set role = 'Administrator' where role = 'InventoryOfficer';

-- Update CHECK constraint on users.role to match new role set
alter table public.users drop constraint if exists users_role_check;
alter table public.users add constraint users_role_check
  check (role in (
    'SuperAdmin','HospitalAdmin','ChiefMedicalOfficer',
    'Doctor','Nurse','LabTechnician','Pharmacist',
    'Accountant','FrontDesk','Administrator'
  ));
