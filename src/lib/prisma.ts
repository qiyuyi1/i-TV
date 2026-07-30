import { getSupabase } from "./db";
import type { Prisma } from "@prisma/client";

// ---------------------------------------------------------------------------
// Column mappings: Prisma field name -> SQL column name
// ---------------------------------------------------------------------------
const USER_COLUMNS: Record<string, string> = {
  id: "id",
  username: "username",
  password: "password",
  role: "role",
  level: "level",
  experience: "experience",
  title: "title",
  isOwner: "is_owner",
  isSuperAdmin: "is_super_admin",
  lastLoginXp: "last_login_xp",
  createdAt: "created_at",
};

const RESOURCE_COLUMNS: Record<string, string> = {
  id: "id",
  tmdbId: "tmdb_id",
  title: "title",
  originalTitle: "original_title",
  posterPath: "poster_path",
  backdropPath: "backdrop_path",
  overview: "overview",
  year: "year",
  type: "type",
  genres: "genres",
  rating: "rating",
  currentEpisode: "current_episode",
  totalEpisodes: "total_episodes",
  status: "status",
  notes: "notes",
  country: "country",
  createdAt: "created_at",
  updatedAt: "updated_at",
  createdById: "created_by_id",
};

const RESOURCE_LINK_COLUMNS: Record<string, string> = {
  id: "id",
  label: "label",
  url: "url",
  type: "type",
  quality: "quality",
  resourceId: "resource_id",
  addedById: "added_by_id",
  createdAt: "created_at",
};

const COMMENT_COLUMNS: Record<string, string> = {
  id: "id",
  content: "content",
  userId: "user_id",
  resourceId: "resource_id",
  parentId: "parent_id",
  isPinned: "is_pinned",
  createdAt: "created_at",
};

// Reverse mapping for convenience
function reverseMap(cols: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [camel, snake] of Object.entries(cols)) {
    result[snake] = camel;
  }
  return result;
}

const USER_REVERSE = reverseMap(USER_COLUMNS);
const RESOURCE_REVERSE = reverseMap(RESOURCE_COLUMNS);
const RESOURCE_LINK_REVERSE = reverseMap(RESOURCE_LINK_COLUMNS);
const COMMENT_REVERSE = reverseMap(COMMENT_COLUMNS);

// ---------------------------------------------------------------------------
// Helper: Generate Prisma-style IDs (cuid-like)
// ---------------------------------------------------------------------------
function cuid(): string {
  return "cl" + Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
}

// ---------------------------------------------------------------------------
// Helper: Map a DB row (snake_case) back to a Prisma-like object (camelCase)
// ---------------------------------------------------------------------------
function mapRow(
  row: Record<string, any>,
  columns: Record<string, string>
): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [prismaField, sqlCol] of Object.entries(columns)) {
    if (row[sqlCol] !== undefined) {
      result[prismaField] = row[sqlCol];
    }
  }
  return result;
}

function mapRows(
  rows: Record<string, any>[],
  columns: Record<string, string>
): Record<string, any>[] {
  return rows.map((r) => mapRow(r, columns));
}

// ---------------------------------------------------------------------------
// Helper: Convert Prisma select object to PostgREST select string
// ---------------------------------------------------------------------------
function buildSelectString(
  select?: Record<string, any>,
  columns?: Record<string, string>
): string {
  if (!select || !columns) return "*";
  const parts: string[] = [];
  for (const [prismaField, sqlCol] of Object.entries(columns)) {
    if (select[prismaField] === true) {
      parts.push(sqlCol);
    }
  }
  return parts.length > 0 ? parts.join(",") : "*";
}

// ---------------------------------------------------------------------------
// Helper: Apply Prisma where clause to a Supabase query builder
// ---------------------------------------------------------------------------
function applyWhere(
  query: any,
  where: Record<string, any> | undefined,
  columns: Record<string, string>
): any {
  if (!where || Object.keys(where).length === 0) return query;

  for (const [key, value] of Object.entries(where)) {
    if (key === "OR") {
      // Handle OR: array of where objects
      const orParts: string[] = [];
      for (const orItem of value as Array<Record<string, any>>) {
        for (const [orKey, orValue] of Object.entries(orItem)) {
          const sqlCol = columns[orKey] || orKey;
          if (orValue === null) {
            orParts.push(`${sqlCol}.is.null`);
          } else if (typeof orValue === "object" && orValue !== null) {
            for (const [op, opValue] of Object.entries(orValue)) {
              orParts.push(`${sqlCol}.${opToPostgrest(op, opValue)}`);
            }
          } else {
            orParts.push(`${sqlCol}.eq.${orValue}`);
          }
        }
      }
      if (orParts.length > 0) {
        query = query.or(orParts.join(","));
      }
      continue;
    }

    if (key === "AND") {
      // Handle AND: array of where objects (each condition is ANDed)
      for (const andItem of value as Array<Record<string, any>>) {
        query = applyWhere(query, andItem, columns);
      }
      continue;
    }

    const sqlCol = columns[key] || key;

    if (value === null) {
      query = query.is(sqlCol, null);
    } else if (typeof value === "object" && value !== null) {
      // Handle operators like { contains: "search" } or { gte: date }
      for (const [op, opValue] of Object.entries(value)) {
        switch (op) {
          case "contains":
            query = query.ilike(sqlCol, `%${opValue}%`);
            break;
          case "startsWith":
            query = query.ilike(sqlCol, `${opValue}%`);
            break;
          case "endsWith":
            query = query.ilike(sqlCol, `%${opValue}`);
            break;
          case "equals":
            if (opValue === null) {
              query = query.is(sqlCol, null);
            } else {
              query = query.eq(sqlCol, opValue);
            }
            break;
          case "in":
            query = query.in(sqlCol, opValue);
            break;
          case "gte":
            query = query.gte(sqlCol, opValue);
            break;
          case "gt":
            query = query.gt(sqlCol, opValue);
            break;
          case "lte":
            query = query.lte(sqlCol, opValue);
            break;
          case "lt":
            query = query.lt(sqlCol, opValue);
            break;
          default:
            query = query.eq(sqlCol, opValue);
        }
      }
    } else {
      // Simple equality
      query = query.eq(sqlCol, value);
    }
  }

  return query;
}

function opToPostgrest(op: string, value: any): string {
  switch (op) {
    case "contains":
      return `ilike.%${value}%`;
    case "startsWith":
      return `ilike.${value}%`;
    case "endsWith":
      return `ilike.%${value}`;
    case "equals":
      return value === null ? "is.null" : `eq.${value}`;
    case "in":
      return `in.(${(value as any[]).join(",")})`;
    case "gte":
      return `gte.${value}`;
    case "gt":
      return `gt.${value}`;
    case "lte":
      return `lte.${value}`;
    case "lt":
      return `lt.${value}`;
    default:
      return `eq.${value}`;
  }
}

// ---------------------------------------------------------------------------
// Helper: Apply Prisma orderBy to a Supabase query builder
// ---------------------------------------------------------------------------
function applyOrderBy(
  query: any,
  orderBy: Record<string, "asc" | "desc"> | Array<Record<string, "asc" | "desc">> | undefined,
  columns: Record<string, string>
): any {
  if (!orderBy) return query;

  const orderList = Array.isArray(orderBy) ? orderBy : [orderBy];
  for (const item of orderList) {
    for (const [key, direction] of Object.entries(item)) {
      const sqlCol = columns[key] || key;
      query = query.order(sqlCol, { ascending: direction === "asc" });
    }
  }
  return query;
}

// ---------------------------------------------------------------------------
// Helper: Convert Prisma data object (camelCase) to DB object (snake_case)
// ---------------------------------------------------------------------------
function toDbRow(
  data: Record<string, any>,
  columns: Record<string, string>
): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    const sqlCol = columns[key] || key;
    result[sqlCol] = value;
    // Also write to the old camelCase column for backward compatibility
    result[key] = value;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Include helpers: fetch related records (manual, no FK dependency)
// ---------------------------------------------------------------------------
async function includeResourcesForUser(userId: string, limit?: number): Promise<any[]> {
  const supabase = getSupabase();
  let query = supabase
    .from("resources")
    .select("id, title, type, poster_path, created_at")
    .eq("created_by_id", userId)
    .order("created_at", { ascending: false });

  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((r: any) => ({
    id: r.id,
    title: r.title,
    type: r.type,
    posterPath: r.poster_path,
    createdAt: r.created_at,
  }));
}

async function includeLinksForUser(userId: string, limit?: number, includeResource?: boolean): Promise<any[]> {
  const supabase = getSupabase();
  let query = supabase
    .from("resource_links")
    .select("id, label, url, type, quality, resource_id, added_by_id, created_at")
    .eq("added_by_id", userId)
    .order("created_at", { ascending: false });

  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error) throw error;

  const links: any[] = (data || []).map((r: any) => ({
    id: r.id,
    label: r.label,
    url: r.url,
    type: r.type,
    quality: r.quality,
    resourceId: r.resource_id,
    createdAt: r.created_at,
  }));

  // If includeResource is requested, fetch resource info for each link
  if (includeResource) {
    for (const link of links) {
      if (link.resourceId) {
        const { data: res } = await supabase
          .from("resources")
          .select("id, title")
          .eq("id", link.resourceId)
          .single();
        link.resource = res ? { id: res.id, title: res.title } : null;
      } else {
        link.resource = null;
      }
    }
  }

  return links;
}

async function includeCountsForUser(userId: string): Promise<any> {
  const supabase = getSupabase();

  const [resourcesRes, commentsRes, linksRes] = await Promise.all([
    supabase.from("resources").select("*", { count: "exact", head: true }).eq("created_by_id", userId),
    supabase.from("comments").select("*", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("resource_links").select("*", { count: "exact", head: true }).eq("added_by_id", userId),
  ]);

  return {
    _count: {
      resources: resourcesRes.count || 0,
      comments: commentsRes.count || 0,
      links: linksRes.count || 0,
    },
  };
}

async function includeLinksForResource(resourceId: string): Promise<any[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("resource_links")
    .select("id, label, url, type, quality, resource_id, added_by_id, created_at")
    .eq("resource_id", resourceId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  const links: any[] = (data || []).map((r: any) => ({
    id: r.id,
    label: r.label,
    url: r.url,
    type: r.type,
    quality: r.quality,
    resourceId: r.resource_id,
    createdAt: r.created_at,
    addedById: r.added_by_id,
  }));

  // Fetch addedBy user info for each link
  for (const link of links) {
    if (link.addedById) {
      const { data: user } = await supabase
        .from("users")
        .select("id, username")
        .eq("id", link.addedById)
        .single();
      link.addedBy = user ? { id: user.id, username: user.username } : null;
    } else {
      link.addedBy = null;
    }
    delete link.addedById;
  }

  return links;
}

async function includeCreatedByForResource(createdById: string | null): Promise<any | null> {
  if (!createdById) return null;
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("users")
    .select("id, username")
    .eq("id", createdById)
    .single();

  if (error || !data) return null;
  return { id: data.id, username: data.username };
}

async function includeUserForComment(userId: string): Promise<any | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("users")
    .select("id, username, level, experience, title, role, is_owner, is_super_admin")
    .eq("id", userId)
    .single();

  if (error || !data) return null;
  return {
    id: data.id,
    username: data.username,
    level: data.level,
    experience: data.experience,
    title: data.title,
    role: data.role,
    isOwner: data.is_owner,
    isSuperAdmin: data.is_super_admin,
  };
}

// ---------------------------------------------------------------------------
// User model implementation
// ---------------------------------------------------------------------------
class UserModel {
  async findUnique(args: { where: Record<string, any>; include?: any; select?: any }) {
    const { where, include, select } = args;
    const supabase = getSupabase();

    const selectStr = buildSelectString(select, USER_COLUMNS);
    let query = supabase.from("users").select(selectStr);
    query = applyWhere(query, where, USER_COLUMNS);
    query = query.limit(1);

    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) return null;

    const user = mapRow(data[0], USER_COLUMNS);

    // Handle _count in select
    if (select?._count) {
      const countSelect = select._count.select || select._count;
      const counts: Record<string, number> = {};
      if (countSelect.resources) {
        const c = await includeCountsForUser(user.id);
        counts.resources = c._count.resources;
      }
      if (countSelect.comments) {
        const c = await includeCountsForUser(user.id);
        counts.comments = c._count.comments;
      }
      if (countSelect.links) {
        const c = await includeCountsForUser(user.id);
        counts.links = c._count.links;
      }
      (user as any)._count = counts;
    }

    if (include) {
      if (include.resources !== undefined) {
        const limit = include.resources?.take || undefined;
        user.resources = await includeResourcesForUser(user.id, limit);
      }
      if (include.links !== undefined) {
        const limit = include.links?.take || undefined;
        const includeResource = !!include.links?.include?.resource;
        user.links = await includeLinksForUser(user.id, limit, includeResource);
      }
      if (include._count) {
        Object.assign(user, await includeCountsForUser(user.id));
      }
    }

    return user;
  }

  async findFirst(args: { where?: Record<string, any>; select?: any }) {
    const { where, select } = args;
    const supabase = getSupabase();

    const selectStr = buildSelectString(select, USER_COLUMNS);
    let query = supabase.from("users").select(selectStr);
    query = applyWhere(query, where, USER_COLUMNS);
    query = query.limit(1);

    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) return null;

    return mapRow(data[0], USER_COLUMNS);
  }

  async create(args: { data: Record<string, any>; select?: any }) {
    const { data, select } = args;

    // Generate ID if not provided
    if (!data.id) {
      data.id = cuid();
    }
    // Set defaults
    if (!data.role) data.role = "USER";
    if (data.level === undefined) data.level = 1;
    if (data.experience === undefined) data.experience = 0;
    if (data.isOwner === undefined) data.isOwner = false;
    if (data.isSuperAdmin === undefined) data.isSuperAdmin = false;

    const dbRow = toDbRow(data, USER_COLUMNS);
    const supabase = getSupabase();

    const selectStr = buildSelectString(select, USER_COLUMNS);
    const { data: result, error } = await supabase
      .from("users")
      .insert(dbRow)
      .select(selectStr)
      .single();

    if (error) throw error;
    if (!result) throw new Error("Failed to create user.");

    return mapRow(result, USER_COLUMNS);
  }

  async update(args: { where: Record<string, any>; data: Record<string, any>; select?: any }) {
    const { where, data, select } = args;
    const supabase = getSupabase();

    const dbRow = toDbRow(data, USER_COLUMNS);
    // Remove id from update data
    delete dbRow.id;

    const selectStr = buildSelectString(select, USER_COLUMNS);
    let query = supabase.from("users").update(dbRow).select(selectStr);
    query = applyWhere(query, where, USER_COLUMNS);

    const { data: result, error } = await query;

    if (error) throw error;
    if (!result || result.length === 0) {
      const err: any = new Error("Record to update not found.");
      err.code = "P2025";
      throw err;
    }

    return mapRow(result[0], USER_COLUMNS);
  }

  async count(args?: { where?: Record<string, any> }) {
    const where = args?.where;
    const supabase = getSupabase();

    let query = supabase.from("users").select("*", { count: "exact", head: true });
    query = applyWhere(query, where, USER_COLUMNS);

    const { count, error } = await query;
    if (error) throw error;

    return count || 0;
  }
}

// ---------------------------------------------------------------------------
// Resource model implementation
// ---------------------------------------------------------------------------
class ResourceModel {
  async findUnique(args: { where: Record<string, any>; include?: any; select?: any }) {
    const { where, include, select } = args;
    const supabase = getSupabase();

    const selectStr = buildSelectString(select, RESOURCE_COLUMNS);
    let query = supabase.from("resources").select(selectStr);
    query = applyWhere(query, where, RESOURCE_COLUMNS);
    query = query.limit(1);

    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) return null;

    const resource = mapRow(data[0], RESOURCE_COLUMNS);

    if (include) {
      if (include.links !== undefined) {
        resource.links = await includeLinksForResource(resource.id);
      }
      if (include.createdBy !== undefined) {
        resource.createdBy = await includeCreatedByForResource(resource.createdById);
      }
    }

    return resource;
  }

  async findMany(args: { where?: Record<string, any>; include?: any; orderBy?: any; take?: number; skip?: number }) {
    const { where, include, orderBy, take, skip } = args;
    const supabase = getSupabase();

    let query = supabase.from("resources").select("*");
    query = applyWhere(query, where, RESOURCE_COLUMNS);
    query = applyOrderBy(query, orderBy, RESOURCE_COLUMNS);

    if (skip) query = query.range(skip, skip + (take || 100) - 1);
    else if (take) query = query.limit(take);

    const { data, error } = await query;
    if (error) throw error;

    const resources = mapRows(data || [], RESOURCE_COLUMNS);

    if (include) {
      for (const resource of resources) {
        if (include.links !== undefined) {
          resource.links = await includeLinksForResource(resource.id);
        }
        if (include.createdBy !== undefined) {
          resource.createdBy = await includeCreatedByForResource(resource.createdById);
        }
      }
    }

    return resources;
  }

  async create(args: { data: Record<string, any>; select?: any }) {
    const { data, select } = args;

    if (!data.id) {
      data.id = cuid();
    }

    const dbRow = toDbRow(data, RESOURCE_COLUMNS);
    const supabase = getSupabase();

    const selectStr = buildSelectString(select, RESOURCE_COLUMNS);
    const { data: result, error } = await supabase
      .from("resources")
      .insert(dbRow)
      .select(selectStr)
      .single();

    if (error) throw error;
    if (!result) throw new Error("Failed to create resource.");

    return mapRow(result, RESOURCE_COLUMNS);
  }

  async update(args: { where: Record<string, any>; data: Record<string, any>; select?: any }) {
    const { where, data, select } = args;
    const supabase = getSupabase();

    const dbRow = toDbRow(data, RESOURCE_COLUMNS);
    delete dbRow.id;

    const selectStr = buildSelectString(select, RESOURCE_COLUMNS);
    let query = supabase.from("resources").update(dbRow).select(selectStr);
    query = applyWhere(query, where, RESOURCE_COLUMNS);

    const { data: result, error } = await query;

    if (error) throw error;
    if (!result || result.length === 0) {
      const err: any = new Error("Record to update not found.");
      err.code = "P2025";
      throw err;
    }

    return mapRow(result[0], RESOURCE_COLUMNS);
  }

  async delete(args: { where: Record<string, any> }) {
    const { where } = args;
    const supabase = getSupabase();

    // First fetch the record to return it
    let selectQuery = supabase.from("resources").select("*");
    selectQuery = applyWhere(selectQuery, where, RESOURCE_COLUMNS);
    selectQuery = selectQuery.limit(1);

    const { data: existing, error: selectError } = await selectQuery;
    if (selectError) throw selectError;
    if (!existing || existing.length === 0) {
      const err: any = new Error("Record to delete not found.");
      err.code = "P2025";
      throw err;
    }

    // Delete
    let deleteQuery = supabase.from("resources").delete();
    deleteQuery = applyWhere(deleteQuery, where, RESOURCE_COLUMNS);

    const { error: deleteError } = await deleteQuery;
    if (deleteError) throw deleteError;

    return mapRow(existing[0], RESOURCE_COLUMNS);
  }

  async count(args?: { where?: Record<string, any> }) {
    const where = args?.where;
    const supabase = getSupabase();

    let query = supabase.from("resources").select("*", { count: "exact", head: true });
    query = applyWhere(query, where, RESOURCE_COLUMNS);

    const { count, error } = await query;
    if (error) throw error;

    return count || 0;
  }
}

// ---------------------------------------------------------------------------
// ResourceLink model implementation
// ---------------------------------------------------------------------------
class ResourceLinkModel {
  async findUnique(args: { where: Record<string, any> }) {
    const { where } = args;
    const supabase = getSupabase();

    let query = supabase.from("resource_links").select("*");
    query = applyWhere(query, where, RESOURCE_LINK_COLUMNS);
    query = query.limit(1);

    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) return null;

    return mapRow(data[0], RESOURCE_LINK_COLUMNS);
  }

  async findMany(args: { where?: Record<string, any>; include?: any; orderBy?: any }) {
    const { where, include, orderBy } = args;
    const supabase = getSupabase();

    let query = supabase.from("resource_links").select("*");
    query = applyWhere(query, where, RESOURCE_LINK_COLUMNS);
    query = applyOrderBy(query, orderBy, RESOURCE_LINK_COLUMNS);

    const { data, error } = await query;
    if (error) throw error;

    const links = mapRows(data || [], RESOURCE_LINK_COLUMNS);

    if (include) {
      for (const link of links) {
        if (include.addedBy !== undefined) {
          const supabase2 = getSupabase();
          const { data: user } = await supabase2
            .from("users")
            .select("id, username")
            .eq("id", link.addedById)
            .single();
          link.addedBy = user ? { id: user.id, username: user.username } : null;
        }
      }
    }

    return links;
  }

  async create(args: { data: Record<string, any> }) {
    const { data } = args;

    if (!data.id) {
      data.id = cuid();
    }

    const dbRow = toDbRow(data, RESOURCE_LINK_COLUMNS);
    const supabase = getSupabase();

    const { data: result, error } = await supabase
      .from("resource_links")
      .insert(dbRow)
      .select("*")
      .single();

    if (error) throw error;
    if (!result) throw new Error("Failed to create resource link.");

    return mapRow(result, RESOURCE_LINK_COLUMNS);
  }

  async delete(args: { where: Record<string, any> }) {
    const { where } = args;
    const supabase = getSupabase();

    // First fetch the record to return it
    let selectQuery = supabase.from("resource_links").select("*");
    selectQuery = applyWhere(selectQuery, where, RESOURCE_LINK_COLUMNS);
    selectQuery = selectQuery.limit(1);

    const { data: existing, error: selectError } = await selectQuery;
    if (selectError) throw selectError;
    if (!existing || existing.length === 0) {
      const err: any = new Error("Record to delete not found.");
      err.code = "P2025";
      throw err;
    }

    // Delete
    let deleteQuery = supabase.from("resource_links").delete();
    deleteQuery = applyWhere(deleteQuery, where, RESOURCE_LINK_COLUMNS);

    const { error: deleteError } = await deleteQuery;
    if (deleteError) throw deleteError;

    return mapRow(existing[0], RESOURCE_LINK_COLUMNS);
  }

  async count(args?: { where?: Record<string, any> }) {
    const where = args?.where;
    const supabase = getSupabase();

    let query = supabase.from("resource_links").select("*", { count: "exact", head: true });
    query = applyWhere(query, where, RESOURCE_LINK_COLUMNS);

    const { count, error } = await query;
    if (error) throw error;

    return count || 0;
  }
}

// ---------------------------------------------------------------------------
// Comment model implementation
// ---------------------------------------------------------------------------
class CommentModel {
  async findUnique(args: { where: Record<string, any> }) {
    const { where } = args;
    const supabase = getSupabase();

    let query = supabase.from("comments").select("*");
    query = applyWhere(query, where, COMMENT_COLUMNS);
    query = query.limit(1);

    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) return null;

    return mapRow(data[0], COMMENT_COLUMNS);
  }

  async findMany(args: { where?: Record<string, any>; include?: any; orderBy?: any }) {
    const { where, include, orderBy } = args;
    const supabase = getSupabase();

    let query = supabase.from("comments").select("*");
    query = applyWhere(query, where, COMMENT_COLUMNS);
    query = applyOrderBy(query, orderBy, COMMENT_COLUMNS);

    const { data, error } = await query;
    if (error) throw error;

    const comments = mapRows(data || [], COMMENT_COLUMNS);

    if (include) {
      for (const comment of comments) {
        if (include.user !== undefined) {
          comment.user = await includeUserForComment(comment.userId);
        }
      }
    }

    return comments;
  }

  async create(args: { data: Record<string, any>; include?: any }) {
    const { data, include } = args;

    if (!data.id) {
      data.id = cuid();
    }

    // Only use snake_case columns for comments table to avoid
    // writing to non-existent camelCase columns
    const dbRow: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined || value === null) continue;
      const sqlCol = COMMENT_COLUMNS[key] || key;
      dbRow[sqlCol] = value;
    }

    const supabase = getSupabase();

    const { data: result, error } = await supabase
      .from("comments")
      .insert(dbRow)
      .select("*")
      .single();

    if (error) throw error;
    if (!result) throw new Error("Failed to create comment.");

    const comment = mapRow(result, COMMENT_COLUMNS);

    if (include && include.user !== undefined) {
      comment.user = await includeUserForComment(comment.userId);
    }

    return comment;
  }

  async update(args: { where: Record<string, any>; data: Record<string, any> }) {
    const { where, data } = args;
    const supabase = getSupabase();

    // Only use snake_case columns for comments table
    const dbRow: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      const sqlCol = COMMENT_COLUMNS[key] || key;
      dbRow[sqlCol] = value;
    }
    delete dbRow.id;

    let query = supabase.from("comments").update(dbRow).select("*");
    query = applyWhere(query, where, COMMENT_COLUMNS);

    const { data: result, error } = await query;

    if (error) throw error;
    if (!result || result.length === 0) {
      const err: any = new Error("Record to update not found.");
      err.code = "P2025";
      throw err;
    }

    return mapRow(result[0], COMMENT_COLUMNS);
  }

  async delete(args: { where: Record<string, any> }) {
    const { where } = args;
    const supabase = getSupabase();

    // First fetch the record to return it
    let selectQuery = supabase.from("comments").select("*");
    selectQuery = applyWhere(selectQuery, where, COMMENT_COLUMNS);
    selectQuery = selectQuery.limit(1);

    const { data: existing, error: selectError } = await selectQuery;
    if (selectError) throw selectError;
    if (!existing || existing.length === 0) {
      const err: any = new Error("Record to delete not found.");
      err.code = "P2025";
      throw err;
    }

    // Delete
    let deleteQuery = supabase.from("comments").delete();
    deleteQuery = applyWhere(deleteQuery, where, COMMENT_COLUMNS);

    const { error: deleteError } = await deleteQuery;
    if (deleteError) throw deleteError;

    return mapRow(existing[0], COMMENT_COLUMNS);
  }

  async count(args?: { where?: Record<string, any> }) {
    const where = args?.where;
    const supabase = getSupabase();

    let query = supabase.from("comments").select("*", { count: "exact", head: true });
    query = applyWhere(query, where, COMMENT_COLUMNS);

    const { count, error } = await query;
    if (error) throw error;

    return count || 0;
  }
}

// ---------------------------------------------------------------------------
// Main Prisma-like client
// ---------------------------------------------------------------------------
class PrismaDb {
  user = new UserModel();
  resource = new ResourceModel();
  resourceLink = new ResourceLinkModel();
  comment = new CommentModel();

  async $disconnect() {
    const { disconnect } = await import("./db");
    await disconnect();
  }
}

let _prisma: PrismaDb | null = null;

export function getPrismaClient(): PrismaDb {
  if (_prisma) return _prisma;
  _prisma = new PrismaDb();
  console.log("Prisma client initialized successfully (Supabase PostgREST API)");
  return _prisma;
}

export const prisma = new Proxy({} as PrismaDb, {
  get(_target, prop) {
    const client = getPrismaClient();
    const value = (client as any)[prop];
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export async function testConnection(): Promise<{
  connected: boolean;
  message: string;
  users?: number;
  resources?: number;
}> {
  try {
    const { user, resource } = getPrismaClient();
    const users = await user.count();
    const resources = await resource.count();
    return {
      connected: true,
      message: "Database connected successfully",
      users,
      resources,
    };
  } catch (error: any) {
    const msg = error?.message || String(error) || "Unknown error";
    console.error("Database connection test failed:", msg);
    return {
      connected: false,
      message: `Database connection failed: ${msg}`,
    };
  }
}

// Re-export Prisma type for compatibility
export type { Prisma } from "@prisma/client";
