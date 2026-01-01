interface StatusDef {
  code: string;
  label: string;
}

// 2）定义一个常量对象，键当成枚举名用
export const JobStatus = {
  COMPLETED: { code: "COMPLETED", label: "Completed" },
  FAILED: { code: "FAILED", label: "Failed" },
  RUNNING: { code: "RUNNING", label: "Running" },
} as const satisfies Record<string, StatusDef>;

export function getStatusLabel(
  statusMap: Record<string, StatusDef>,
  code?: string | null
): string {
  if (!code) return "-";

  const upper = code.toUpperCase();

  // 在 map 里找，比较 code（兼容后端给小写）
  const def = Object.values(statusMap).find((s) => s.code === upper);

  if (def) return def.label;

  // fallback：未知状态，简单 prettify
  const lower = code.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}
