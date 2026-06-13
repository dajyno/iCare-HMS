import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

export default async function handler(req: any, res: any) {
  res.setHeader("Content-Type", "application/json");

  try {
    if (req.method !== "POST") {
      return res.status(405).json({ data: null, error: "Method not allowed" });
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return res.status(500).json({ data: null, error: "Server misconfiguration: missing Supabase credentials" });
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      realtime: { transport: WebSocket as any },
    });

    const { type } = req.body;

    let result;
    switch (type) {
      case "table":
        result = await handleTable(supabase, req.body);
        break;
      case "auth":
        result = await handleAuth(supabase, req.body);
        break;
      default:
        return res.status(400).json({ data: null, error: `Unknown operation type: ${type}` });
    }

    res.json(result);
  } catch (err: any) {
    console.error("Supabase proxy error:", err);
    res.status(500).json({ data: null, error: err.message || "Internal server error" });
  }
}

async function handleTable(supabase: any, body: any) {
  const { table, action, columns, payload, upsertOptions, filters, orders, limit, single, returning } = body;

  let query = supabase.from(table);

  const applyFilters = (q: any) => {
    for (const f of filters || []) {
      const [op, col, val, ...rest] = f;
      q = applyOp(q, op, col, val, ...rest);
    }
    return q;
  };

  if (action === "insert" || action === "upsert") {
    query = action === "insert" ? query.insert(payload) : query.upsert(payload, upsertOptions);
    if (returning) {
      query = query.select(columns || "*");
      for (const ord of orders || []) {
        query = query.order(ord.column, { ascending: ord.ascending, nullsFirst: ord.nullsFirst, foreignTable: ord.foreignTable });
      }
      if (limit) query = query.limit(limit);
      if (single === "single") query = query.single();
      if (single === "maybeSingle") query = query.maybeSingle();
    }
  } else if (action === "update") {
    query = applyFilters(query);
    query = query.update(payload);
  } else if (action === "delete") {
    query = applyFilters(query);
    query = query.delete();
  } else {
    query = query.select(columns || "*");
    query = applyFilters(query);
    for (const ord of orders || []) {
      query = query.order(ord.column, { ascending: ord.ascending, nullsFirst: ord.nullsFirst, foreignTable: ord.foreignTable });
    }
    if (limit) query = query.limit(limit);
    if (single === "single") query = query.single();
    if (single === "maybeSingle") query = query.maybeSingle();
  }

  const { data, error, count } = await query;
  return { data, error, count };
}

function applyOp(query: any, op: string, col: string, val: any, ...rest: any[]) {
  switch (op) {
    case "eq": return query.eq(col, val);
    case "neq": return query.neq(col, val);
    case "gt": return query.gt(col, val);
    case "gte": return query.gte(col, val);
    case "lt": return query.lt(col, val);
    case "lte": return query.lte(col, val);
    case "in": return query.in(col, val);
    case "is": return query.is(col, val);
    case "like": return query.like(col, val);
    case "ilike": return query.ilike(col, val);
    case "contains": return query.contains(col, val);
    case "containedBy": return query.containedBy(col, val);
    case "rangeGt": return query.gt(col, val);
    case "rangeGte": return query.gte(col, val);
    case "rangeLt": return query.lt(col, val);
    case "rangeLte": return query.lte(col, val);
    case "overlaps": return query.overlaps(col, val);
    case "textSearch": return query.textSearch(col, val, rest[0]);
    case "not": return query.not(col, val, rest[0]);
    case "or": return query.or(col);
    case "filter": return query.filter(col, val, rest[0]);
    default: return query;
  }
}

async function handleAuth(supabase: any, body: any) {
  const { action, args } = body;

  try {
    let result;
    switch (action) {
      case "listUsers":
        result = await supabase.auth.admin.listUsers();
        break;
      case "createUser":
        result = await supabase.auth.admin.createUser(args);
        break;
      case "updateUserById":
        result = await supabase.auth.admin.updateUserById(args.id, args.updates);
        break;
      default:
        return { data: null, error: `Unknown auth action: ${action}` };
    }
    return result;
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}
