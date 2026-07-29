// 资源类型常量配置
// 分类顺序：独家制作 -> 电影 -> 电视剧 -> 特摄 -> 综艺 -> 纪录片

export interface ResourceType {
  value: string;
  label: string;
  // TMDB 搜索时对应的类型：movie / tv / multi，null 表示不通过 TMDB 搜索（手动创建）
  tmdbSearchType: "movie" | "tv" | "multi" | null;
  // TMDB 详情查询时对应的类型
  tmdbDetailType: "movie" | "tv" | null;
  // 是否允许手动创建（不从 TMDB 搜索）
  allowManualCreate: boolean;
  // TMDB 的 genre id，用于搜索时过滤，可选
  tmdbGenreId?: number;
}

export const RESOURCE_TYPES: ResourceType[] = [
  {
    value: "exclusive",
    label: "独家制作",
    tmdbSearchType: null,
    tmdbDetailType: null,
    allowManualCreate: true,
  },
  {
    value: "movie",
    label: "电影",
    tmdbSearchType: "movie",
    tmdbDetailType: "movie",
    allowManualCreate: true,
  },
  {
    value: "tv",
    label: "电视剧",
    tmdbSearchType: "tv",
    tmdbDetailType: "tv",
    allowManualCreate: true,
  },
  {
    value: "tokusatsu",
    label: "特摄",
    tmdbSearchType: "multi",
    tmdbDetailType: "tv",
    allowManualCreate: true,
  },
  {
    value: "variety",
    label: "综艺",
    tmdbSearchType: "tv",
    tmdbDetailType: "tv",
    allowManualCreate: true,
    tmdbGenreId: 10764, // Reality genre in TMDB
  },
  {
    value: "documentary",
    label: "纪录片",
    tmdbSearchType: "multi",
    tmdbDetailType: "movie",
    allowManualCreate: true,
    tmdbGenreId: 99, // Documentary genre in TMDB
  },
];

// 快速查询类型信息的工具函数
export function getResourceType(value: string): ResourceType | undefined {
  return RESOURCE_TYPES.find((t) => t.value === value);
}

// 获取类型显示名称
export function getTypeLabel(value: string): string {
  return getResourceType(value)?.label || value;
}

// 获取所有用于首页过滤按钮的类型（包含 all）
export const FILTER_TYPES = ["all", ...RESOURCE_TYPES.map((t) => t.value)];

// 获取搜索下拉框中的类型选项（不含 all）
export const SEARCH_TYPE_OPTIONS = RESOURCE_TYPES;

// 获取搜索类型对应的 TMDB 搜索类型
export function getTMDBSearchType(resourceTypeValue: string): string {
  const type = getResourceType(resourceTypeValue);
  // 如果是 multi 或有明确的 TMDB 搜索类型，返回对应值
  if (type?.tmdbSearchType) return type.tmdbSearchType;
  // 默认使用 multi
  return "multi";
}
