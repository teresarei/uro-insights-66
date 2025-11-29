import { useDiary } from '@/context/DiaryContext';
import { StatCard } from './StatCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Droplets, 
  TrendingUp, 
  AlertCircle, 
  Gauge, 
  Moon, 
  Sun,
  GlassWater,
  PlusCircle,
  ArrowRight,
  Clock,
  Camera
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { format } from 'date-fns';

export function Dashboard() {
  const { entries, getStats, setCurrentView, getEntriesLast48Hours, getVoidsPer24Hours } = useDiary();
  const stats = getStats();
  const recentEntries = getEntriesLast48Hours();
  const voidsPer24h = getVoidsPer24Hours();

  // Prepare chart data - use 48-hour filtered data
  const dailyData = recentEntries.map(entry => ({
    date: format(entry.date, 'EEE'),
    fullDate: format(entry.date, 'MMM d'),
    voids: entry.voids.length,
    leakages: entry.leakages.length,
    intake: Math.round(entry.intakes.reduce((sum, i) => sum + i.volume, 0) / 100) / 10, // in liters
    avgVolume: entry.voids.length > 0 
      ? Math.round(entry.voids.reduce((sum, v) => sum + v.volume, 0) / entry.voids.length)
      : 0,
  }));

  const dayNightData = [
    { name: 'Day (7am-11pm)', value: stats.dayVoids, fill: 'hsl(var(--primary))' },
    { name: 'Night (11pm-7am)', value: stats.nightVoids, fill: 'hsl(var(--info))' },
  ];

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center animate-fade-in">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-highlight mb-6 animate-float">
          <Droplets className="h-10 w-10 text-highlight-strong" />
        </div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          Welcome to UroTracker
        </h2>
        <p className="text-muted-foreground max-w-md mb-8">
          Let's make sense of your bladder habits—one day at a time. Start by logging your first entry.
        </p>
        <Button variant="hero" size="lg" onClick={() => setCurrentView('entry')}>
          <PlusCircle className="h-5 w-5" />
          Log Your First Entry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Welcome message with 48-hour indicator */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-foreground">
            Here's how your bladder rhythm looks
          </h1>
          <p className="text-muted-foreground">
            Last updated {format(new Date(), 'MMM d, h:mm a')}
          </p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          48-hour tracking
        </Badge>
      </div>

      {/* Voids per 24 hours highlight */}
      <Card variant="highlight" className="border-primary/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Droplets className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Voids in last 24 hours</p>
                <p className="text-3xl font-bold text-foreground">{voidsPer24h}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Normal range</p>
              <p className="text-sm font-medium text-foreground">6-8 per day</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Voids (48h)"
          value={stats.totalVoids}
          subtitle={`~${stats.avgVoidsPerDay}/day`}
          icon={Droplets}
          variant="primary"
        />
        <StatCard
          title="Total Intake (48h)"
          value={`${(stats.totalIntake / 1000).toFixed(1)}L`}
          subtitle="48-hour period"
          icon={GlassWater}
          variant="info"
        />
        <StatCard
          title="Median Volume"
          value={`${stats.medianVolume}ml`}
          subtitle={`Range: ${stats.minVolume}-${stats.maxVolume}ml`}
          icon={Gauge}
          variant="success"
        />
        <StatCard
          title="Leakage Events"
          value={stats.totalLeakages}
          subtitle={stats.totalLeakages > 0 ? `~${stats.avgLeakagesPerDay}/day` : 'None recorded'}
          icon={AlertCircle}
          variant={stats.totalLeakages > 0 ? 'warning' : 'default'}
        />
      </div>

      {/* Charts section */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Daily voids chart */}
        <Card variant="elevated" className="animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Daily Voiding Pattern
            </CardTitle>
            <CardDescription>
              Number of bathroom trips per day
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyData}>
                  <defs>
                    <linearGradient id="voidGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px',
                      boxShadow: 'var(--shadow-card)',
                    }}
                    labelFormatter={(_, payload) => payload[0]?.payload?.fullDate || ''}
                  />
                  <Area
                    type="monotone"
                    dataKey="voids"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#voidGradient)"
                    name="Voids"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Fluid intake chart */}
        <Card variant="elevated" className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GlassWater className="h-5 w-5 text-info" />
              Fluid Intake
            </CardTitle>
            <CardDescription>
              Daily fluid consumption in liters
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    unit="L"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px',
                      boxShadow: 'var(--shadow-card)',
                    }}
                    formatter={(value: number) => [`${value}L`, 'Intake']}
                    labelFormatter={(_, payload) => payload[0]?.payload?.fullDate || ''}
                  />
                  <Bar
                    dataKey="intake"
                    fill="hsl(var(--info))"
                    radius={[6, 6, 0, 0]}
                    name="Intake"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Day vs Night section */}
      <Card variant="warm" className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <CardHeader>
          <CardTitle>Day vs. Night Patterns</CardTitle>
          <CardDescription>
            Understanding when you need to go most
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="flex items-center gap-4 p-4 rounded-xl bg-card shadow-soft">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warning-soft">
                <Sun className="h-6 w-6 text-warning-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Daytime voids</p>
                <p className="text-2xl font-bold text-foreground">{stats.dayVoids}</p>
                <p className="text-xs text-muted-foreground">7:00 AM – 11:00 PM</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-xl bg-card shadow-soft">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-info-soft">
                <Moon className="h-6 w-6 text-info" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Nighttime voids</p>
                <p className="text-2xl font-bold text-foreground">{stats.nightVoids}</p>
                <p className="text-xs text-muted-foreground">11:00 PM – 7:00 AM</p>
              </div>
            </div>
          </div>
          {stats.nightVoids > stats.totalVoids * 0.3 && (
            <div className="mt-4 p-4 rounded-xl bg-info-soft border border-info/20">
              <p className="text-sm text-info">
                💡 You have more nighttime voids than average. This might be worth discussing with your healthcare provider.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* CTA section */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Button 
          variant="hero" 
          size="lg" 
          onClick={() => setCurrentView('entry')}
        >
          <PlusCircle className="h-5 w-5" />
          Log Entry
        </Button>
        <Button 
          variant="soft" 
          size="lg" 
          onClick={() => setCurrentView('scan')}
        >
          <Camera className="h-5 w-5" />
          Scan Diary
        </Button>
        <Button 
          variant="outline" 
          size="lg" 
          onClick={() => setCurrentView('insights')}
        >
          View Insights
          <ArrowRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
