export interface DefaultCategory {
  name: string;
  color: string;
  icon: string;
  type: "EXPENSE" | "INCOME";
}

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  { name: "Groceries", color: "#10b981", icon: "🛒", type: "EXPENSE" },
  { name: "Housing and rent", color: "#6366f1", icon: "🏠", type: "EXPENSE" },
  { name: "Transport", color: "#f59e0b", icon: "🚗", type: "EXPENSE" },
  { name: "Utilities", color: "#eab308", icon: "💡", type: "EXPENSE" },
  { name: "Dining", color: "#ef4444", icon: "🍽️", type: "EXPENSE" },
  { name: "Health", color: "#ec4899", icon: "💊", type: "EXPENSE" },
  { name: "Entertainment", color: "#8b5cf6", icon: "🎬", type: "EXPENSE" },
  { name: "Clothing", color: "#14b8a6", icon: "👕", type: "EXPENSE" },
  { name: "Travel", color: "#06b6d4", icon: "✈️", type: "EXPENSE" },
  { name: "Education", color: "#3b82f6", icon: "📚", type: "EXPENSE" },
  { name: "Subscriptions", color: "#a855f7", icon: "🔁", type: "EXPENSE" },
  { name: "Other", color: "#94a3b8", icon: "📦", type: "EXPENSE" },
  { name: "Salary", color: "#22c55e", icon: "💼", type: "INCOME" },
  { name: "Freelance", color: "#0ea5e9", icon: "💻", type: "INCOME" },
  { name: "Investments", color: "#84cc16", icon: "📈", type: "INCOME" },
  { name: "Gifts", color: "#f472b6", icon: "🎁", type: "INCOME" },
];
