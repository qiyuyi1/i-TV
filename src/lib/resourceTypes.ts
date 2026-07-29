// 资源类型常量配置
// 分类顺序：独家制作 -> 电影 -> 剧集 -> 特摄 -> 综艺 -> 纪录

export interface ResourceType {
  value: string;
  label: string;
  allowManualCreate: boolean;
}

export const RESOURCE_TYPES: ResourceType[] = [
  {
    value: "exclusive",
    label: "独家制作",
    allowManualCreate: true,
  },
  {
    value: "movie",
    label: "电影",
    allowManualCreate: true,
  },
  {
    value: "tv",
    label: "剧集",
    allowManualCreate: true,
  },
  {
    value: "tokusatsu",
    label: "特摄",
    allowManualCreate: true,
  },
  {
    value: "variety",
    label: "综艺",
    allowManualCreate: true,
  },
  {
    value: "documentary",
    label: "纪录",
    allowManualCreate: true,
  },
];

export function getResourceType(value: string): ResourceType | undefined {
  return RESOURCE_TYPES.find((t) => t.value === value);
}

export function getTypeLabel(value: string): string {
  return getResourceType(value)?.label || value;
}

export const FILTER_TYPES = ["all", ...RESOURCE_TYPES.map((t) => t.value)];

export const SEARCH_TYPE_OPTIONS = RESOURCE_TYPES;
