import { supabase, getCurrentTenantId, setCurrentTenantId } from "./supabase";

// Re-export for callers that import setCurrentTenantId from here
export { setCurrentTenantId, getCurrentTenantId };

async function proxyFetch(body: any): Promise<{ data: any; error: any; count?: number }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }

    const response = await fetch("/api/supabase-proxy", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      let message = "Request failed";
      try {
        const err = await response.json();
        message = err.error || message;
      } catch {
        message = (await response.text()) || message;
      }
      return { data: null, error: message };
    }

    return await response.json();
  } catch (err: any) {
    return { data: null, error: err.message || "Network error" };
  }
}

// Tables that should NOT receive automatic tenant filtering
const SKIP_TENANT_TABLES = new Set<string>(["users"]);

// ─────────────────────────────────────────────
// QueryBuilder — chainable, thenable, mimics Supabase query builder
// ─────────────────────────────────────────────

type FilterSpec = [string, ...any[]];
type OrderSpec = { column: string; ascending?: boolean; nullsFirst?: boolean; foreignTable?: string };
type SelectOptions = { count?: "exact" | "planned" | "estimated"; head?: boolean };

class QueryBuilder implements PromiseLike<{ data: any; error: any; count?: number }> {
  private filters: FilterSpec[] = [];
  private orders: OrderSpec[] = [];
  private limitValue?: number;
  private singleMode?: "single" | "maybeSingle";
  private selectColumns?: string;
  private selectOptions?: SelectOptions;
  private returning = false;

  constructor(
    private table: string,
    private action: "select" | "insert" | "update" | "delete" | "upsert" = "select",
    private payload?: any,
    private upsertOptions?: any
  ) {}

  // ── Filters ──

  eq(column: string, value: any) { this.filters.push(["eq", column, value]); return this; }
  neq(column: string, value: any) { this.filters.push(["neq", column, value]); return this; }
  gt(column: string, value: any) { this.filters.push(["gt", column, value]); return this; }
  gte(column: string, value: any) { this.filters.push(["gte", column, value]); return this; }
  lt(column: string, value: any) { this.filters.push(["lt", column, value]); return this; }
  lte(column: string, value: any) { this.filters.push(["lte", column, value]); return this; }
  is(column: string, value: any) { this.filters.push(["is", column, value]); return this; }
  in(column: string, values: any[]) { this.filters.push(["in", column, values]); return this; }
  like(column: string, pattern: string) { this.filters.push(["like", column, pattern]); return this; }
  ilike(column: string, pattern: string) { this.filters.push(["ilike", column, pattern]); return this; }
  contains(column: string, value: any) { this.filters.push(["contains", column, value]); return this; }
  containedBy(column: string, value: any) { this.filters.push(["containedBy", column, value]); return this; }
  overlaps(column: string, value: any) { this.filters.push(["overlaps", column, value]); return this; }
  textSearch(column: string, query: string, config?: any) { this.filters.push(["textSearch", column, query, config]); return this; }
  not(column: string, operator: string, value: any) { this.filters.push(["not", column, operator, value]); return this; }
  or(filter: string) { this.filters.push(["or", filter]); return this; }
  filter(column: string, operator: string, value: any) { this.filters.push(["filter", column, operator, value]); return this; }

  // ── Modifiers ──

  order(column: string, opts?: { ascending?: boolean; nullsFirst?: boolean; foreignTable?: string }) {
    this.orders.push({ column, ...opts });
    return this;
  }
  limit(count: number) { this.limitValue = count; return this; }
  single() { this.singleMode = "single"; return this; }
  maybeSingle() { this.singleMode = "maybeSingle"; return this; }

  // ── CRUD entrypoints (also called by addTenantFilter proxy) ──

  select(columns?: string, opts?: SelectOptions) {
    if (this.action === "insert" || this.action === "upsert") {
      this.returning = true;
      this.selectColumns = columns || "*";
    } else {
      this.action = "select";
      this.selectColumns = columns || "*";
      this.selectOptions = opts;
    }
    return this;
  }

  insert(values: any, options?: any) {
    this.action = "insert";
    this.payload = values;
    this.upsertOptions = options;
    return this;
  }

  update(values: any) {
    this.action = "update";
    this.payload = values;
    return this;
  }

  delete() {
    this.action = "delete";
    return this;
  }

  upsert(values: any, options?: any) {
    this.action = "upsert";
    this.payload = values;
    this.upsertOptions = options;
    return this;
  }

  // ── PromiseLike — makes the builder awaitable ──

  then<TResult1 = { data: any; error: any }, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: any }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async execute() {
    return proxyFetch({
      type: "table",
      table: this.table,
      action: this.action,
      columns: this.action === "select" ? this.selectColumns : this.returning ? this.selectColumns : undefined,
      payload: ["insert", "update", "upsert"].includes(this.action) ? this.payload : undefined,
      upsertOptions: this.upsertOptions,
      filters: this.filters.length > 0 ? this.filters : undefined,
      orders: this.orders.length > 0 ? this.orders : undefined,
      limit: this.limitValue,
      single: this.singleMode,
      returning: this.returning || undefined,
      selectOptions: this.selectOptions,
    });
  }
}

// ─────────────────────────────────────────────
// AdminClient — provides .from(), .rpc(), .auth.admin.*
// ─────────────────────────────────────────────

class AdminClient {
  auth = {
    admin: {
      listUsers: async () => {
        return proxyFetch({ type: "auth", action: "listUsers" });
      },
      createUser: async (args: any) => {
        return proxyFetch({ type: "auth", action: "createUser", args });
      },
      updateUserById: async (id: string, updates: any) => {
        return proxyFetch({ type: "auth", action: "updateUserById", args: { id, updates } });
      },
    },
  };

  from(table: string) {
    return new QueryBuilder(table);
  }

  rpc(name: string, args: any) {
    return proxyFetch({ type: "rpc", name, args });
  }
}

const rawAdminSupabase = new AdminClient();

// ─────────────────────────────────────────────
// Tenant-filtering Proxy (unchanged logic)
// ─────────────────────────────────────────────

function addTenantFilter(table: string, builder: any): any {
  if (!getCurrentTenantId() || SKIP_TENANT_TABLES.has(table)) return builder;

  return new Proxy(builder, {
    get(bTarget: any, bProp: string, bReceiver: any) {
      if (bProp === "select") {
        return (...args: any[]) => bTarget.select(...args).eq("tenant_id", getCurrentTenantId());
      }
      if (bProp === "update") {
        return (...args: any[]) => bTarget.update(...args).eq("tenant_id", getCurrentTenantId());
      }
      if (bProp === "delete") {
        return (...args: any[]) => bTarget.delete(...args).eq("tenant_id", getCurrentTenantId());
      }
      if (bProp === "insert") {
        return (...args: any[]) => {
          const data = args[0];
          if (Array.isArray(data)) {
            return bTarget.insert(data.map((item: any) => ({ ...item, tenant_id: getCurrentTenantId() })), args[1]);
          }
          if (data && typeof data === "object") {
            return bTarget.insert({ ...data, tenant_id: getCurrentTenantId() }, args[1]);
          }
          return bTarget.insert(data, args[1]);
        };
      }
      if (bProp === "upsert") {
        return (...args: any[]) => {
          const data = args[0];
          if (Array.isArray(data)) {
            return bTarget.upsert(data.map((item: any) => ({ ...item, tenant_id: getCurrentTenantId() })), args[1]);
          }
          if (data && typeof data === "object") {
            return bTarget.upsert({ ...data, tenant_id: getCurrentTenantId() }, args[1]);
          }
          return bTarget.upsert(data, args[1]);
        };
      }
      return Reflect.get(bTarget, bProp, bReceiver);
    },
  });
}

export const adminSupabase = new Proxy(rawAdminSupabase, {
  get(target, prop, receiver) {
    if (prop === "from") {
      return (table: string) => addTenantFilter(table, target.from(table));
    }
    return Reflect.get(target, prop, receiver);
  },
}) as any;

// Converts snake_case DB rows to camelCase
export function toCamel(obj: any): any {
  if (Array.isArray(obj)) return obj.map(toCamel);
  if (obj && typeof obj === "object" && obj.constructor === Object) {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      result[camelKey] = toCamel(value);
    }
    return result;
  }
  return obj;
}
