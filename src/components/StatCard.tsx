import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "default" | "success" | "warning";
}

export function StatCard({ title, value, icon: Icon, trend, variant = "default" }: StatCardProps) {
  const variantStyles = {
    default: "border-neutral-200",
    success: "border-neutral-200",
    warning: "border-neutral-200",
  };

  return (
    <div className={`bg-white border ${variantStyles[variant]} p-6 hover:border-neutral-400 transition-colors`}>
      <div className="flex items-start justify-between mb-4">
        <p className="text-xs font-medium text-neutral-600 uppercase tracking-wide">{title}</p>
        <Icon className="h-5 w-5 text-neutral-400" />
      </div>
      <p className="text-3xl font-semibold text-black">{value}</p>
      {trend && (
        <p className={`text-xs font-medium mt-2 ${trend.isPositive ? 'text-neutral-600' : 'text-neutral-600'}`}>
          {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}% desde el último mes
        </p>
      )}
    </div>
  );
}
