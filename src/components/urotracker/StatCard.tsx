import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'info';
  className?: string;
}

const iconVariants = {
  default: 'bg-muted text-muted-foreground',
  primary: 'bg-highlight text-highlight-strong',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning-foreground',
  info: 'bg-info-soft text-info',
};

export function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon,
  variant = 'default',
  className 
}: StatCardProps) {
  return (
    <Card 
      variant="stat" 
      className={cn("p-5 animate-fade-in", className)}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold text-foreground">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className={cn(
          "flex h-11 w-11 items-center justify-center rounded-xl transition-transform hover:scale-110",
          iconVariants[variant]
        )}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}
