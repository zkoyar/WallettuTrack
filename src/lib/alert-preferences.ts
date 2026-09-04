export interface AlertPreferenceDto {
  budgetAlerts: boolean;
  upcomingAlerts: boolean;
  upcomingDays: number;
  goalAlerts: boolean;
  lowBalanceEnabled: boolean;
  lowBalanceThreshold: number;
  unusualExpenseEnabled: boolean;
  unusualExpenseThreshold: number;
  subscriptionAlerts: boolean;
}

export const DEFAULT_ALERT_PREFERENCES: AlertPreferenceDto = {
  budgetAlerts: true,
  upcomingAlerts: true,
  upcomingDays: 7,
  goalAlerts: true,
  lowBalanceEnabled: false,
  lowBalanceThreshold: 0,
  unusualExpenseEnabled: false,
  unusualExpenseThreshold: 100,
  subscriptionAlerts: true,
};

export function serializeAlertPreference(
  value?: Partial<
    Omit<
      AlertPreferenceDto,
      "lowBalanceThreshold" | "unusualExpenseThreshold"
    >
  > & {
    lowBalanceThreshold?: unknown;
    unusualExpenseThreshold?: unknown;
  } | null
): AlertPreferenceDto {
  if (!value) return { ...DEFAULT_ALERT_PREFERENCES };
  return {
    budgetAlerts: value.budgetAlerts ?? true,
    upcomingAlerts: value.upcomingAlerts ?? true,
    upcomingDays: value.upcomingDays ?? 7,
    goalAlerts: value.goalAlerts ?? true,
    lowBalanceEnabled: value.lowBalanceEnabled ?? false,
    lowBalanceThreshold: Number(value.lowBalanceThreshold ?? 0),
    unusualExpenseEnabled: value.unusualExpenseEnabled ?? false,
    unusualExpenseThreshold: Number(value.unusualExpenseThreshold ?? 100),
    subscriptionAlerts: value.subscriptionAlerts ?? true,
  };
}
