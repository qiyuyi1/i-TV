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

// 头衔定义
export const TITLE_RULES = {
  // 站长可以给任何头衔
  owner: {
    canAssign: ["站长", "副站长", "管理员", null],
  },
  // 副站长不能给"副站长"头衔，但可以给"管理员"头衔
  superAdmin: {
    canAssign: ["管理员", null],
  },
  // 管理员不能给任何头衔
  admin: {
    canAssign: [],
  },
};

// 特殊头衔显示
export function getUserTitle(user: {
  role?: string;
  isOwner?: boolean;
  isSuperAdmin?: boolean;
  title?: string | null;
}): string {
  if (user.isOwner || user.title === "站长") return "站长";
  if (user.isSuperAdmin || user.title === "副站长") return "副站长";
  if (user.role === "ADMIN") return "管理员";
  if (user.title) return user.title;
  return "";
}

// 是否有管理员权限（可管理资源）
export function hasAdminPermission(user: {
  role?: string;
  isOwner?: boolean;
  isSuperAdmin?: boolean;
}): boolean {
  return user.role === "ADMIN" || user.isOwner || user.isSuperAdmin || false;
}

// 等级计算：每200经验值升一级，初始1级，最高999级
export function getLevelFromExperience(experience: number): number {
  return Math.min(999, Math.floor(experience / 200) + 1);
}

// 经验值规则
export const XP_RULES = {
  CREATE_RESOURCE: 10,
  CREATE_RESOURCE_DAILY_CAP: 100,
  ADD_LINK: 30,
  ADD_LINK_DAILY_CAP: 0, // 0表示无上限
  COMMENT: 5,
  COMMENT_DAILY_CAP: 50,
  DAILY_LOGIN: 10,
  LOGIN_XP_KEY: "lastLoginDate",
};

// 检查是否有管理用户权限
export function canManageUsers(user: {
  role?: string;
  isOwner?: boolean;
  isSuperAdmin?: boolean;
}): boolean {
  return user.isOwner || user.isSuperAdmin || false;
}

// 检查是否可以添加管理员
export function canAddAdmin(user: {
  role?: string;
  isOwner?: boolean;
  isSuperAdmin?: boolean;
}): boolean {
  return user.isOwner || user.isSuperAdmin || false;
}

// 检查是否可以添加副站长
export function canAddSuperAdmin(user: {
  isOwner?: boolean;
}): boolean {
  return user.isOwner || false;
}

// 检查是否可以设置特定头衔
export function canAssignTitle(
  assigner: { role?: string; isOwner?: boolean; isSuperAdmin?: boolean },
  title: string | null
): boolean {
  const assignerTitle = getUserTitle(assigner);

  if (assignerTitle === "站长") {
    // 站长可以给任何头衔
    return true;
  }

  if (assignerTitle === "副站长") {
    // 副站长不能给"副站长"头衔，但可以给"管理员"头衔
    if (title === "副站长") return false;
    if (title === "站长") return false;
    return true;
  }

  // 管理员及以下不能分配任何头衔
  return false;
}

// 获取某角色可分配的头衔列表
export function getAssignableTitles(
  assigner: { role?: string; isOwner?: boolean; isSuperAdmin?: boolean }
): Array<{ value: string | null; label: string }> {
  const assignerTitle = getUserTitle(assigner);

  if (assignerTitle === "站长") {
    return [
      { value: "站长", label: "站长" },
      { value: "副站长", label: "副站长" },
      { value: "管理员", label: "管理员" },
      { value: null, label: "清除头衔" },
    ];
  }

  if (assignerTitle === "副站长") {
    return [
      { value: "管理员", label: "管理员" },
      { value: null, label: "清除头衔" },
    ];
  }

  return [];
}
