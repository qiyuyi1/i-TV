import { query, queryOne, queryAll } from "./db";
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
  isPinned: "is_pinned",
  createdAt: "created_at",
};

// ---------------------------------------------------------------------------
// Helper: Generate Prisma-style IDs (cuid-like)
// ---------------------------------------------------------------------------
function cuid(): string {
  return "cl" + Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
}

// ---------------------------------------------------------------------------
// Helper: Convert a Prisma select/include object to SQL column list
// ---------------------------------------------------------------------------
function buildSelectColumns(
  select?: Record<string, any>,
  columns?: Record<string, string>
): string[] | null {
  if (!select || !columns) return null;
  const result: string[] = [];
  for (const [prismaField, sqlCol] of Object.entries(columns)) {
    if (select[prismaField] === true) {
      result.push(sqlCol);
    }
  }
  return result.length > 0 ? result : null;
}

// ---------------------------------------------------------------------------
// Helper: Convert Prisma where clause to SQL conditions + params
// ---------------------------------------------------------------------------
function buildWhere(
  where: Record<string, any> | undefined,
  columns: Record<string, string>
): { sql: string; params: any[] } {
  if (!where || Object.keys(where).length === 0) {
    return { sql: "", params: [] };
  }

  const conditions: string[] = [];
  const params: any[] = [];

  for (const [key, value] of Object.entries(where)) {
    if (key === "OR") {
      // Handle OR: array of where objects
      const orParts: string[] = [];
      for (const orItem of value as Array<Record<string, any>>) {
        const { sql: orSql, params: orParams } = buildWhere(orItem, columns);
        if (orSql) {
          orParts.push(`(${orSql})`);
          params.push(...orParams);
        }
      }
      if (orParts.length > 0) {
        conditions.push(`(${orParts.join(" OR ")})`);
      }
      continue;
    }

    const sqlCol = columns[key] || key;

    if (value === null) {
      conditions.push(`${sqlCol} IS NULL`);
    } else if (typeof value === "object" && value !== null) {
      // Handle operators like { contains: "search" } or { gte: date }
      for (const [op, opValue] of Object.entries(value)) {
        switch (op) {
          case "contains":
            conditions.push(`${sqlCol} ILIKE $${params.length + 1}`);
            params.push(`%${opValue}%`);
            break;
          case "startsWith":
            conditions.push(`${sqlCol} ILIKE $${params.length + 1}`);
            params.push(`${opValue}%`);
            break;
          case "endsWith":
            conditions.push(`${sqlCol} ILIKE $${params.length + 1}`);
            params.push(`%${opValue}`);
            break;
          case "equals":
            if (opValue === null) {
              conditions.push(`${sqlCol} IS NULL`);
            } else {
              conditions.push(`${sqlCol} = $${params.length + 1}`);
              params.push(opValue);
            }
            break;
          case "in":
            conditions.push(`${sqlCol} = ANY($${params.length + 1})`);
            params.push(opValue);
            break;
          case "gte":
            conditions.push(`${sqlCol} >= $${params.length + 1}`);
            params.push(opValue);
            break;
          case "gt":
            conditions.push(`${sqlCol} > $${params.length + 1}`);
            params.push(opValue);
            break;
          case "lte":
            conditions.push(`${sqlCol} <= $${params.length + 1}`);
            params.push(opValue);
            break;
          case "lt":
            conditions.push(`${sqlCol} < $${params.length + 1}`);
            params.push(opValue);
            break;
          default:
            conditions.push(`${sqlCol} = $${params.length + 1}`);
            params.push(opValue);
        }
      }
    } else {
      // Simple equality
      conditions.push(`${sqlCol} = $${params.length + 1}`);
      params.push(value);
    }
  }

  return { sql: conditions.join(" AND "), params };
}

// ---------------------------------------------------------------------------
// Helper: Convert Prisma orderBy to SQL ORDER BY
// ---------------------------------------------------------------------------
function buildOrderBy(
  orderBy: Record<string, "asc" | "desc"> | Array<Record<string, "asc" | "desc">> | undefined,
  columns: Record<string, string>
): string {
  if (!orderBy) return "";
  const orderList = Array.isArray(orderBy) ? orderBy : [orderBy];
  const parts: string[] = [];
  for (const item of orderList) {
    for (const [key, direction] of Object.entries(item)) {
      const sqlCol = columns[key] || key;
      parts.push(`${sqlCol} ${direction.toUpperCase()}`);
    }
  }
  return parts.length > 0 ? `ORDER BY ${parts.join(", ")}` : "";
}

// ---------------------------------------------------------------------------
// Helper: Map a DB row back to a Prisma-like object
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
// Helper: Build SELECT clause from select object
// ---------------------------------------------------------------------------
function buildSelectClause(
  select?: Record<string, any>,
  columns?: Record<string, string>
): string {
  if (!select || !columns) return "*";
  const selected = buildSelectColumns(select, columns);
  if (selected) {
    return selected.join(", ");
  }
  return "*";
}

// ---------------------------------------------------------------------------
// Helper: Build SET clause for UPDATE
// ---------------------------------------------------------------------------
function buildSetClause(
  data: Record<string, any>,
  columns: Record<string, string>
): { clause: string; params: any[] } {
  const sets: string[] = [];
  const params: any[] = [];

  for (const [key, value] of Object.entries(data)) {
    if (key === "id") continue; // Can't update primary key
    const sqlCol = columns[key] || key;

    if (value === undefined) continue;
    if (value === null) {
      sets.push(`${sqlCol} = NULL`);
    } else if (value === true || value === false) {
      sets.push(`${sqlCol} = $${params.length + 1}`);
      params.push(value);
    } else {
      sets.push(`${sqlCol} = $${params.length + 1}`);
      params.push(value);
    }
  }

  return { clause: sets.join(", "), params };
}

// ---------------------------------------------------------------------------
// Helper: Build INSERT column list and values
// ---------------------------------------------------------------------------
function buildInsertClause(
  data: Record<string, any>,
  columns: Record<string, string>
): { cols: string[]; placeholders: string[]; params: any[] } {
  const cols: string[] = [];
  const placeholders: string[] = [];
  const params: any[] = [];

  for (const [key, value] of Object.entries(data)) {
    const sqlCol = columns[key] || key;
    cols.push(sqlCol);
    placeholders.push(`$${params.length + 1}`);
    params.push(value);
  }

  return { cols, placeholders, params };
}

// ---------------------------------------------------------------------------
// Include helpers: fetch related records
// ---------------------------------------------------------------------------
async function includeResourcesForUser(userId: string, limit?: number): Promise<any[]> {
  let sql = `SELECT id, title, type, poster_path, created_at FROM resources WHERE created_by_id = $1 ORDER BY created_at DESC`;
  const params: any[] = [userId];
  if (limit) {
    sql += ` LIMIT $2`;
    params.push(limit);
  }
  const rows = await queryAll(sql, params);
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    type: r.type,
    posterPath: r.poster_path,
    createdAt: r.created_at,
  }));
}

async function includeLinksForUser(userId: string, limit?: number): Promise<any[]> {
  let sql = `SELECT rl.id, rl.label, rl.url, rl.type, rl.quality, rl.resource_id, rl.created_at,
                    r.id as res_id, r.title as res_title
             FROM resource_links rl
             LEFT JOIN resources r ON r.id = rl.resource_id
             WHERE rl.added_by_id = $1
             ORDER BY rl.created_at DESC`;
  const params: any[] = [userId];
  if (limit) {
    sql += ` LIMIT $2`;
    params.push(limit);
  }
  const rows = await queryAll(sql, params);
  return rows.map((r) => ({
    id: r.id,
    label: r.label,
    url: r.url,
    type: r.type,
    quality: r.quality,
    resourceId: r.resource_id,
    createdAt: r.created_at,
    resource: r.res_id ? { id: r.res_id, title: r.res_title } : null,
  }));
}

async function includeCountsForUser(userId: string): Promise<any> {
  const resourceCount = await queryOne(
    "SELECT COUNT(*) as cnt FROM resources WHERE created_by_id = $1",
    [userId]
  );
  const commentCount = await queryOne(
    "SELECT COUNT(*) as cnt FROM comments WHERE user_id = $1",
    [userId]
  );
  return {
    _count: {
      resources: Number(resourceCount?.cnt || 0),
      comments: Number(commentCount?.cnt || 0),
    },
  };
}

async function includeLinksForResource(resourceId: string): Promise<any[]> {
  const rows = await queryAll(
    `SELECT rl.id, rl.label, rl.url, rl.type, rl.quality, rl.resource_id, rl.created_at,
            u.id as added_by_id, u.username as added_by_username
     FROM resource_links rl
     LEFT JOIN users u ON u.id = rl.added_by_id
     WHERE rl.resource_id = $1
     ORDER BY rl.created_at ASC`,
    [resourceId]
  );
  return rows.map((r) => ({
    id: r.id,
    label: r.label,
    url: r.url,
    type: r.type,
    quality: r.quality,
    resourceId: r.resource_id,
    createdAt: r.created_at,
    addedBy: r.added_by_id
      ? { id: r.added_by_id, username: r.added_by_username }
      : null,
  }));
}

async function includeCreatedByForResource(createdById: string | null): Promise<any | null> {
  if (!createdById) return null;
  const row = await queryOne(
    "SELECT id, username FROM users WHERE id = $1",
    [createdById]
  );
  return row ? { id: row.id, username: row.username } : null;
}

async function includeUserForComment(userId: string): Promise<any | null> {
  const row = await queryOne(
    "SELECT id, username, level, experience, title, role, is_owner, is_super_admin FROM users WHERE id = $1",
    [userId]
  );
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    level: row.level,
    experience: row.experience,
    title: row.title,
    role: row.role,
    isOwner: row.is_owner,
    isSuperAdmin: row.is_super_admin,
  };
}

// ---------------------------------------------------------------------------
// User model implementation
// ---------------------------------------------------------------------------
class UserModel {
  async findUnique(args: { where: Record<string, any>; include?: any; select?: any }) {
    const { where, include, select } = args;
    const { sql: whereSql, params } = buildWhere(where, USER_COLUMNS);
    const selectClause = buildSelectClause(select, USER_COLUMNS);

    const row = await queryOne(
      `SELECT ${selectClause} FROM users WHERE ${whereSql} LIMIT 1`,
      params
    );

    if (!row) return null;

    const user = mapRow(row, USER_COLUMNS);

    // Handle _count in select (e.g. select: { _count: { select: { resources: true } } })
    if (select?._count) {
      const countSelect = select._count.select || select._count;
      const counts: Record<string, number> = {};
      if (countSelect.resources) {
        const r = await queryOne(
          "SELECT COUNT(*) as cnt FROM resources WHERE created_by_id = $1",
          [user.id]
        );
        counts.resources = Number(r?.cnt || 0);
      }
      if (countSelect.comments) {
        const r = await queryOne(
          "SELECT COUNT(*) as cnt FROM comments WHERE user_id = $1",
          [user.id]
        );
        counts.comments = Number(r?.cnt || 0);
      }
      if (countSelect.links) {
        const r = await queryOne(
          "SELECT COUNT(*) as cnt FROM resource_links WHERE added_by_id = $1",
          [user.id]
        );
        counts.links = Number(r?.cnt || 0);
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
        user.links = await includeLinksForUser(user.id, limit);
      }
      if (include._count) {
        Object.assign(user, await includeCountsForUser(user.id));
      }
    }

    return user;
  }

  async findFirst(args: { where?: Record<string, any>; select?: any }) {
    const { where, select } = args;
    const { sql: whereSql, params } = where
      ? buildWhere(where, USER_COLUMNS)
      : { sql: "1=1", params: [] };
    const selectClause = buildSelectClause(select, USER_COLUMNS);

    const row = await queryOne(
      `SELECT ${selectClause} FROM users WHERE ${whereSql} LIMIT 1`,
      params
    );

    return row ? mapRow(row, USER_COLUMNS) : null;
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

    const { cols, placeholders, params } = buildInsertClause(data, USER_COLUMNS);
    const selectClause = buildSelectClause(select, USER_COLUMNS);

    const row = await queryOne(
      `INSERT INTO users (${cols.join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING ${selectClause}`,
      params
    );

    if (!row) {
      throw new Error("Failed to create user.");
    }

    return mapRow(row, USER_COLUMNS);
  }

  async update(args: { where: Record<string, any>; data: Record<string, any>; select?: any }) {
    const { where, data, select } = args;
    const { sql: whereSql, params: whereParams } = buildWhere(where, USER_COLUMNS);
    const { clause: setClause, params: setParams } = buildSetClause(data, USER_COLUMNS);
    const selectClause = buildSelectClause(select, USER_COLUMNS);

    const allParams = [...setParams, ...whereParams];
    const row = await queryOne(
      `UPDATE users SET ${setClause} WHERE ${whereSql} RETURNING ${selectClause}`,
      allParams
    );

    if (!row) {
      const err: any = new Error("Record to update not found.");
      err.code = "P2025";
      throw err;
    }

    return mapRow(row, USER_COLUMNS);
  }

  async count(args?: { where?: Record<string, any> }) {
    const where = args?.where;
    const { sql: whereSql, params } = where
      ? buildWhere(where, USER_COLUMNS)
      : { sql: "", params: [] };

    const row = await queryOne(
      `SELECT COUNT(*) as cnt FROM users${whereSql ? " WHERE " + whereSql : ""}`,
      params
    );

    return Number(row?.cnt || 0);
  }
}

// ---------------------------------------------------------------------------
// Resource model implementation
// ---------------------------------------------------------------------------
class ResourceModel {
  async findUnique(args: { where: Record<string, any>; include?: any; select?: any }) {
    const { where, include, select } = args;
    const { sql: whereSql, params } = buildWhere(where, RESOURCE_COLUMNS);
    const selectClause = buildSelectClause(select, RESOURCE_COLUMNS);

    const row = await queryOne(
      `SELECT ${selectClause} FROM resources WHERE ${whereSql} LIMIT 1`,
      params
    );

    if (!row) return null;

    const resource = mapRow(row, RESOURCE_COLUMNS);

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
    const { sql: whereSql, params } = where
      ? buildWhere(where, RESOURCE_COLUMNS)
      : { sql: "", params: [] };
    const orderSql = buildOrderBy(orderBy, RESOURCE_COLUMNS);

    let sql = `SELECT * FROM resources${whereSql ? " WHERE " + whereSql : ""} ${orderSql}`;
    if (take) sql += ` LIMIT ${take}`;
    if (skip) sql += ` OFFSET ${skip}`;

    const rows = await queryAll(sql, params);
    const resources = rows.map((r) => mapRow(r, RESOURCE_COLUMNS));

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

    const { cols, placeholders, params } = buildInsertClause(data, RESOURCE_COLUMNS);
    const selectClause = buildSelectClause(select, RESOURCE_COLUMNS);

    const row = await queryOne(
      `INSERT INTO resources (${cols.join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING ${selectClause}`,
      params
    );

    if (!row) {
      throw new Error("Failed to create resource.");
    }

    return mapRow(row, RESOURCE_COLUMNS);
  }

  async update(args: { where: Record<string, any>; data: Record<string, any>; select?: any }) {
    const { where, data, select } = args;
    const { sql: whereSql, params: whereParams } = buildWhere(where, RESOURCE_COLUMNS);
    const { clause: setClause, params: setParams } = buildSetClause(data, RESOURCE_COLUMNS);
    const selectClause = buildSelectClause(select, RESOURCE_COLUMNS);

    const allParams = [...setParams, ...whereParams];
    const row = await queryOne(
      `UPDATE resources SET ${setClause} WHERE ${whereSql} RETURNING ${selectClause}`,
      allParams
    );

    if (!row) {
      const err: any = new Error("Record to update not found.");
      err.code = "P2025";
      throw err;
    }

    return mapRow(row, RESOURCE_COLUMNS);
  }

  async delete(args: { where: Record<string, any> }) {
    const { where } = args;
    const { sql: whereSql, params } = buildWhere(where, RESOURCE_COLUMNS);

    const row = await queryOne(`SELECT * FROM resources WHERE ${whereSql}`, params);
    if (!row) {
      const err: any = new Error("Record to delete not found.");
      err.code = "P2025";
      throw err;
    }

    await query(`DELETE FROM resources WHERE ${whereSql}`, params);
    return mapRow(row, RESOURCE_COLUMNS);
  }

  async count(args?: { where?: Record<string, any> }) {
    const where = args?.where;
    const { sql: whereSql, params } = where
      ? buildWhere(where, RESOURCE_COLUMNS)
      : { sql: "", params: [] };

    const row = await queryOne(
      `SELECT COUNT(*) as cnt FROM resources${whereSql ? " WHERE " + whereSql : ""}`,
      params
    );

    return Number(row?.cnt || 0);
  }
}

// ---------------------------------------------------------------------------
// ResourceLink model implementation
// ---------------------------------------------------------------------------
class ResourceLinkModel {
  async findUnique(args: { where: Record<string, any> }) {
    const { where } = args;
    const { sql: whereSql, params } = buildWhere(where, RESOURCE_LINK_COLUMNS);

    const row = await queryOne(
      `SELECT * FROM resource_links WHERE ${whereSql} LIMIT 1`,
      params
    );

    return row ? mapRow(row, RESOURCE_LINK_COLUMNS) : null;
  }

  async findMany(args: { where?: Record<string, any>; include?: any; orderBy?: any }) {
    const { where, include, orderBy } = args;
    const { sql: whereSql, params } = where
      ? buildWhere(where, RESOURCE_LINK_COLUMNS)
      : { sql: "", params: [] };
    const orderSql = buildOrderBy(orderBy, RESOURCE_LINK_COLUMNS);

    const rows = await queryAll(
      `SELECT * FROM resource_links${whereSql ? " WHERE " + whereSql : ""} ${orderSql}`,
      params
    );

    const links = rows.map((r) => mapRow(r, RESOURCE_LINK_COLUMNS));

    if (include) {
      for (const link of links) {
        if (include.addedBy !== undefined) {
          const addedByRow = await queryOne(
            "SELECT id, username FROM users WHERE id = $1",
            [link.addedById]
          );
          link.addedBy = addedByRow
            ? { id: addedByRow.id, username: addedByRow.username }
            : null;
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

    const { cols, placeholders, params } = buildInsertClause(data, RESOURCE_LINK_COLUMNS);

    const row = await queryOne(
      `INSERT INTO resource_links (${cols.join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING *`,
      params
    );

    if (!row) {
      throw new Error("Failed to create resource link.");
    }

    return mapRow(row, RESOURCE_LINK_COLUMNS);
  }

  async delete(args: { where: Record<string, any> }) {
    const { where } = args;
    const { sql: whereSql, params } = buildWhere(where, RESOURCE_LINK_COLUMNS);

    const row = await queryOne(`SELECT * FROM resource_links WHERE ${whereSql}`, params);
    if (!row) {
      const err: any = new Error("Record to delete not found.");
      err.code = "P2025";
      throw err;
    }

    await query(`DELETE FROM resource_links WHERE ${whereSql}`, params);
    return mapRow(row, RESOURCE_LINK_COLUMNS);
  }

  async count(args?: { where?: Record<string, any> }) {
    const where = args?.where;
    const { sql: whereSql, params } = where
      ? buildWhere(where, RESOURCE_LINK_COLUMNS)
      : { sql: "", params: [] };

    const row = await queryOne(
      `SELECT COUNT(*) as cnt FROM resource_links${whereSql ? " WHERE " + whereSql : ""}`,
      params
    );

    return Number(row?.cnt || 0);
  }
}

// ---------------------------------------------------------------------------
// Comment model implementation
// ---------------------------------------------------------------------------
class CommentModel {
  async findUnique(args: { where: Record<string, any> }) {
    const { where } = args;
    const { sql: whereSql, params } = buildWhere(where, COMMENT_COLUMNS);

    const row = await queryOne(
      `SELECT * FROM comments WHERE ${whereSql} LIMIT 1`,
      params
    );

    return row ? mapRow(row, COMMENT_COLUMNS) : null;
  }

  async findMany(args: { where?: Record<string, any>; include?: any; orderBy?: any }) {
    const { where, include, orderBy } = args;
    const { sql: whereSql, params } = where
      ? buildWhere(where, COMMENT_COLUMNS)
      : { sql: "", params: [] };
    const orderSql = buildOrderBy(orderBy, COMMENT_COLUMNS);

    const rows = await queryAll(
      `SELECT * FROM comments${whereSql ? " WHERE " + whereSql : ""} ${orderSql}`,
      params
    );

    const comments = rows.map((r) => mapRow(r, COMMENT_COLUMNS));

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

    const { cols, placeholders, params } = buildInsertClause(data, COMMENT_COLUMNS);

    const row = await queryOne(
      `INSERT INTO comments (${cols.join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING *`,
      params
    );

    if (!row) {
      throw new Error("Failed to create comment.");
    }
    const comment = mapRow(row, COMMENT_COLUMNS);

    if (include && include.user !== undefined) {
      comment.user = await includeUserForComment(comment.userId);
    }

    return comment;
  }

  async update(args: { where: Record<string, any>; data: Record<string, any> }) {
    const { where, data } = args;
    const { sql: whereSql, params: whereParams } = buildWhere(where, COMMENT_COLUMNS);
    const { clause: setClause, params: setParams } = buildSetClause(data, COMMENT_COLUMNS);

    const allParams = [...setParams, ...whereParams];
    const row = await queryOne(
      `UPDATE comments SET ${setClause} WHERE ${whereSql} RETURNING *`,
      allParams
    );

    if (!row) {
      const err: any = new Error("Record to update not found.");
      err.code = "P2025";
      throw err;
    }

    return mapRow(row, COMMENT_COLUMNS);
  }

  async delete(args: { where: Record<string, any> }) {
    const { where } = args;
    const { sql: whereSql, params } = buildWhere(where, COMMENT_COLUMNS);

    const row = await queryOne(`SELECT * FROM comments WHERE ${whereSql}`, params);
    if (!row) {
      const err: any = new Error("Record to delete not found.");
      err.code = "P2025";
      throw err;
    }

    await query(`DELETE FROM comments WHERE ${whereSql}`, params);
    return mapRow(row, COMMENT_COLUMNS);
  }

  async count(args?: { where?: Record<string, any> }) {
    const where = args?.where;
    const { sql: whereSql, params } = where
      ? buildWhere(where, COMMENT_COLUMNS)
      : { sql: "", params: [] };

    const row = await queryOne(
      `SELECT COUNT(*) as cnt FROM comments${whereSql ? " WHERE " + whereSql : ""}`,
      params
    );

    return Number(row?.cnt || 0);
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
  console.log("Prisma client initialized successfully (pg driver, no adapter)");
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
