# Fix: Duplicate User Profile (Demo Admin vs Tony Toney)

## Problem

The staff record (`public.staff`) and the auth user record (`public.users`) can have different names because name changes only flow in one direction. Additionally, the staff record's `auth_user_id` link is not reliably established on every login, causing orphaned records.

## Fixes

### Fix 1: `src/pages/Staff/StaffProfile.tsx` — `handleSaveDetails()` (line 186)

**Current:** Only syncs `role` to `public.users`, not `full_name`.  
**Fix:** Also update `public.users.full_name` when `authUserId` exists.

Change:
```typescript
if (existingUser) {
  const { error: roleError } = await adminSupabase
    .from("users")
    .update({ role: mapPositionToRole(position) })
    .eq("id", staff.authUserId);
  if (roleError) {
    console.error("Failed to sync role to users table:", roleError);
    toast.error("Staff record saved but role sync failed");
    return;
  }
}
```

To:
```typescript
if (existingUser) {
  const { error: userError } = await adminSupabase
    .from("users")
    .update({ full_name: name, role: mapPositionToRole(position) })
    .eq("id", staff.authUserId);
  if (userError) {
    console.error("Failed to sync to users table:", userError);
    toast.error("Staff record saved but user sync failed");
    return;
  }
}
```

### Fix 2: `src/pages/Staff/StaffProfile.tsx` — `handleSaveSettings()` (line 239)

**Current:** When `admin.createUser()` fails with "already registered", it shows a toast but doesn't link the existing auth user.  
**Fix:** In the "already registered" branch, look up the auth user ID from `public.users` by email and link it.

Change lines 238-243 from:
```typescript
if (error.message?.includes("already registered")) {
  toast.success("Login access granted (account already exists)");
} else {
  toast.error(error.message);
}
```

To:
```typescript
if (error.message?.includes("already registered")) {
  const { data: existingUser } = await adminSupabase
    .from("users")
    .select("id")
    .eq("email", staff.email)
    .maybeSingle();
  if (existingUser) {
    await updateRecord(staff.staff_id, { authUserId: existingUser.id });
  }
  toast.success("Login access granted (account already exists)");
} else {
  toast.error(error.message);
}
```

### Fix 3: `src/context/AuthContext.tsx` — `login()` (line 101-125)

**Current:** `ensureStaffRecord()` is only called in the auto-provisioning path (when login fails and a new user is created). On normal successful login, the staff record link is never established.  
**Fix:** Move `ensureStaffRecord()` into `handlePostAuth()` so it runs on every successful login.

Change `handlePostAuth` from:
```typescript
const handlePostAuth = async (userId: string, authUser: any) => {
  if (tenantId) { ... }
  if (tenantId) setCurrentTenantId(tenantId);
  await fetchProfile(userId, authUser);
  logAudit("Logged in", "User", userId);
};
```

To:
```typescript
const handlePostAuth = async (userId: string, authUser: any) => {
  if (tenantId) { ... }
  if (tenantId) setCurrentTenantId(tenantId);
  await ensureStaffRecord(userId);
  await fetchProfile(userId, authUser);
  logAudit("Logged in", "User", userId);
};
```

Also remove the `ensureStaffRecord` calls at lines 211 and 221 (since `handlePostAuth` now calls it).

### Fix 4: `src/pages/Dashboard/Profile.tsx` — `handleSave()` (line 121)

**Current:** If staff record is not found by `auth_user_id` (because link is NULL), the name is only saved to `public.users` and not synced to `public.staff`.  
**Fix:** Add a fallback query — if staff not found by `auth_user_id`, try by `user.email`.

In `handleSave()`, after the `users.upsert` (line 136) and before using `staffRecord` (line 139), add a fallback:

```typescript
let targetStaff = staffRecord;
if (!targetStaff && user.email) {
  const { data: staffByEmail } = await (adminSupabase as any)
    .from("staff")
    .select("*")
    .eq("email", user.email)
    .maybeSingle();
  targetStaff = staffByEmail;
}
if (targetStaff) { ... }
```

Also update the `useQuery` for `staffRecord` (lines 57-70) to have the same email fallback so the edit dialog is populated with correct values:

Change `queryFn` from:
```typescript
queryFn: async () => {
  if (!user?.id) return null;
  const { data } = await (adminSupabase as any)
    .from("staff")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  return data as Record<string, any> | null;
},
```

To:
```typescript
queryFn: async () => {
  if (!user?.id) return null;
  let { data } = await (adminSupabase as any)
    .from("staff")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!data && user?.email) {
    const { data: byEmail } = await (adminSupabase as any)
      .from("staff")
      .select("*")
      .eq("email", user.email)
      .maybeSingle();
    data = byEmail;
  }
  return data as Record<string, any> | null;
},
```

And update `queryKey` to include `user?.email`:
```typescript
queryKey: ["profile-staff", user?.id, user?.email],
```
