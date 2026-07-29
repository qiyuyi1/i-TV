// 资源质量选项
export const QUALITY_OPTIONS = [
  "独家",
  "4K",
  "4KHDR",
  "4KDV",
  "4K原盘",
  "1080P原盘",
  "1080P",
  "720P",
  "普通",
];

// 网盘选项
export const STORAGE_OPTIONS = [
  "夸克",
  "光鸭",
  "百度",
  "123",
  "115",
  "迅雷",
  "UC",
  "阿里",
];

// 角色名称映射
export const ROLE_LABELS: Record<string, string> = {
  USER: "用户",
  ADMIN: "管理员",
};

// 特殊头衔显示
export function getUserTitle(user: {
  role?: string;
  isOwner?: boolean;
  isSuperAdmin?: boolean;
  title?: string | null;
}): string {
  if (user.isOwner) return "站长";
  if (user.isSuperAdmin) return "副站长";
  if (user.role === "ADMIN") return "管理员";
  if (user.title) return user.title;
  return "";
}

// 是否有管理员权限
export function hasAdminPermission(user: {
  role?: string;
  isOwner?: boolean;
  isSuperAdmin?: boolean;
}): boolean {
  return user.role === "ADMIN" || user.isOwner || user.isSuperAdmin || false;
}

// 等级计算
export function getLevelFromExperience(experience: number): number {
  return Math.floor(experience / 200) + 1;
}

// 检查是否有管理权限（删除资源、添加管理员等）
export function canManageUsers(user: {
  role?: string;
  isOwner?: boolean;
  isSuperAdmin?: boolean;
}): boolean {
  return user.isOwner || user.isSuperAdmin || false;
}

export function canAddAdmin(user: {
  role?: string;
  isOwner?: boolean;
  isSuperAdmin?: boolean;
}): boolean {
  return user.isOwner || user.isSuperAdmin || false;
}

export function canAddSuperAdmin(user: {
  isOwner?: boolean;
}): boolean {
  return user.isOwner || false;
}
