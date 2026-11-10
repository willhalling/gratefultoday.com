const RECOVERY_MILESTONE_PATTERN =
  /\b(sober|sobriety|recovery|clean time|days? clean|months? clean|years? clean|sober anniversary|soberversary)\b/i;

export function mentionsRecoveryMilestone(text: string): boolean {
  return RECOVERY_MILESTONE_PATTERN.test(text);
}
