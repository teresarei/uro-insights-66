import { useMemo, useState } from 'react';
import { useDiary } from '@/context/DiaryContext';
import { StatCard } from './StatCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  Brain,
  Loader2,
  Scale,
  Calendar,
  RefreshCw,
  User,
  Eye
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
import { format, parseISO, subDays } from 'date-fns';

interface DashboardProps {
  readOnly?: boolean;
  patientName?: string;
}

export function Dashboard({ readOnly = false, patientName }: DashboardProps) {
  const { entries, loading, getStats, setCurrentView, getEntriesLast48Hours, getVoidsPer24Hours, getLeakageWeight24Hours } = useDiary();
  
  // Date range state - default to last 24 hours
  const today = format(new Date(), 'yyyy-MM-dd');
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
  
  const [startDate, setStartDate] = useState(yesterday);
  const [endDate, setEndDate] = useState(today);
  const [appliedStartDate, setAppliedStartDate] = useState(yesterday);
  const [appliedEndDate, setAppliedEndDate] = useState(today);
  const [dateError, setDateError] = useState<string | null>(null);
  
  // Filter entries based on selected date range
  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      return entry.date >= appliedStartDate && entry.date <= appliedEndDate;
    });
  }, [entries, appliedStartDate, appliedEndDate]);
  
  // Compute stats for filtered entries
  const stats = useMemo(() => {
    const voids = filteredEntries.filter(e => e.event_type === 'void');
    const leakages = filteredEntries.filter(e => e.event_type === 'leakage');
    const intakes = filteredEntries.filter(e => e.event_type === 'intake');
    
    const volumes = voids
      .map(v => v.volume_ml)
      .filter((v): v is number => v !== null && v > 0);
    
    const sortedVolumes = [...volumes].sort((a, b) => a - b);
    const medianVolume = sortedVolumes.length > 0
      ? sortedVolumes[Math.floor(sortedVolumes.length / 2)]
      : 0;
    
    const dayVoids = voids.filter(v => {
      const hour = parseInt(v.time.split(':')[0]);
      return hour >= 7 && hour < 23;
    }).length;
    
    const nightVoids = voids.filter(v => {
      const hour = parseInt(v.time.split(':')[0]);
      return hour < 7 || hour >= 23;
    }).length;
    
    // Calculate unique days for averaging
    const uniqueDates = new Set(filteredEntries.map(e => e.date));
    const dayCount = uniqueDates.size || 1;
    
    // Calculate total leakage weight from pad weights
    const totalLeakageWeight = leakages.reduce((sum, l) => {
      return sum + (l.leakage_weight_g || 0);
    }, 0);
    
    return {
      totalVoids: voids.length,
      totalLeakages: leakages.length,
      totalIntake: intakes.reduce((sum, i) => sum + (i.volume_ml || 0), 0),
      medianVolume,
      maxVolume: volumes.length > 0 ? Math.max(...volumes) : 0,
      minVolume: volumes.length > 0 ? Math.min(...volumes) : 0,
      avgVoidsPerDay: Math.round(voids.length / dayCount * 10) / 10,
      avgLeakagesPerDay: Math.round(leakages.length / dayCount * 10) / 10,
      dayVoids,
      nightVoids,
      totalLeakageWeight,
    };
  }, [filteredEntries]);
  
  // Get time range label
  const timeRangeLabel = useMemo(() => {
    if (appliedStartDate === appliedEndDate) {
      return format(parseISO(appliedStartDate), 'MMM d, yyyy');
    }
    return `${format(parseISO(appliedStartDate), 'MMM d')} - ${format(parseISO(appliedEndDate), 'MMM d, yyyy')}`;
  }, [appliedStartDate, appliedEndDate]);
  
  // Handle apply timeframe
  const handleApplyTimeframe = () => {
    if (startDate > endDate) {
      setDateError('Start date cannot be after end date');
      return;
    }
    setDateError(null);
    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);
  };
  
  // Reset to last 24 hours
  const handleReset = () => {
    setStartDate(yesterday);
    setEndDate(today);
    setAppliedStartDate(yesterday);
    setAppliedEndDate(today);
    setDateError(null);
  };

  // Prepare chart data - group entries by hour
  const hourlyData = useMemo(() => {
    const grouped = new Map<string, { voids: number; leakages: number; intake: number; totalVolume: number; voidCount: number; timestamp: Date }>();
    
    filteredEntries.forEach(entry => {
      // Create a datetime from date and time
      const dateTime = new Date(`${entry.date}T${entry.time}`);
      // Round to the hour
      const hourKey = format(dateTime, 'yyyy-MM-dd HH:00');
      const current = grouped.get(hourKey) || { voids: 0, leakages: 0, intake: 0, totalVolume: 0, voidCount: 0, timestamp: dateTime };
      
      if (entry.event_type === 'void') {
        current.voids++;
        current.voidCount++;
        current.totalVolume += entry.volume_ml || 0;
      } else if (entry.event_type === 'leakage') {
        current.leakages++;
      } else if (entry.event_type === 'intake') {
        current.intake += (entry.volume_ml || 0) / 1000; // Convert to liters
      }
      
      grouped.set(hourKey, current);
    });

    return Array.from(grouped.entries())
      .map(([hourKey, data]) => ({
        hour: format(new Date(hourKey), 'HH:mm'),
        fullDate: format(new Date(hourKey), 'MMM d, HH:mm'),
        voids: data.voids,
        leakages: data.leakages,
        intake: Math.round(data.intake * 10) / 10,
        avgVolume: data.voidCount > 0 ? Math.round(data.totalVolume / data.voidCount) : 0,
      }))
      .sort((a, b) => a.fullDate.localeCompare(b.fullDate));
  }, [filteredEntries]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center animate-fade-in">
        <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Loading your diary data...</p>
      </div>
    );
  }

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
      {/* Doctor viewing patient banner */}
      {readOnly && patientName && (
        <Alert className="bg-info-soft border-info/30">
          <Eye className="h-4 w-4 text-info" />
          <AlertDescription className="flex items-center gap-2 text-info-foreground">
            <User className="h-4 w-4" />
            <span>Viewing Dashboard for Patient: <strong>{patientName}</strong></span>
          </AlertDescription>
        </Alert>
      )}

      {/* Header with title */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-foreground">
            {readOnly ? 'Patient Bladder Rhythm' : "Here's how your bladder rhythm looks"}
          </h1>
          <p className="text-muted-foreground">
            Last updated {format(new Date(), 'MMM d, h:mm a')}
          </p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5" />
          {timeRangeLabel}
        </Badge>
      </div>

      {/* Date Range Selector */}
      <Card variant="elevated">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="startDate" className="text-sm font-medium">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setDateError(null);
                }}
                max={today}
              />
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor="endDate" className="text-sm font-medium">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setDateError(null);
                }}
                max={today}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleApplyTimeframe}>
                <Clock className="h-4 w-4 mr-2" />
                Apply Timeframe
              </Button>
              <Button variant="outline" size="icon" onClick={handleReset} title="Reset to last 24 hours">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {dateError && (
            <p className="text-sm text-destructive mt-2">{dateError}</p>
          )}
        </CardContent>
      </Card>

      {/* No entries message for selected range */}
      {filteredEntries.length === 0 && (
        <Card variant="elevated" className="border-muted">
          <CardContent className="p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mx-auto mb-4">
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">No diary entries found</h3>
            <p className="text-muted-foreground">
              No entries exist for the selected timeframe ({timeRangeLabel}). Try adjusting the date range.
            </p>
          </CardContent>
        </Card>
      )}

      {filteredEntries.length > 0 && (
        <>
          {/* Voids highlight */}
          <Card variant="highlight" className="border-primary/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Droplets className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Voids in selected period</p>
                    <p className="text-3xl font-bold text-foreground">{stats.totalVoids}</p>
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
              title="Total Voids"
              value={stats.totalVoids}
              subtitle={`~${stats.avgVoidsPerDay}/day`}
              icon={Droplets}
              variant="primary"
            />
            <StatCard
              title="Total Intake"
              value={`${(stats.totalIntake / 1000).toFixed(1)}L`}
              subtitle="Selected period"
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
              subtitle={stats.totalLeakages > 0 ? `~${stats.totalLeakages}/day` : 'None recorded'}
              icon={AlertCircle}
              variant={stats.totalLeakages > 0 ? 'warning' : 'default'}
            />
            {stats.totalLeakageWeight > 0 && (
            <StatCard
              title="Total leakage weight"
              value={stats.totalLeakageWeight}
              subtitle={stats.totalLeakageWeight > 0 ? `${stats.totalLeakages} events` : 'None recorded'}
              icon={Scale}
              variant={stats.totalLeakageWeight > 100 ? 'warning' : 'success'}
            />
            )}
          </div>

          {/* Charts section */}
          {hourlyData.length > 0 && (
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Hourly voids chart */}
              <Card variant="elevated" className="animate-fade-in">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Hourly Voiding Pattern
                  </CardTitle>
                  <CardDescription>
                    Number of bathroom trips per hour
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={hourlyData}>
                        <defs>
                          <linearGradient id="voidGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis 
                          dataKey="hour" 
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
                    Hourly fluid consumption in liters
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={hourlyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis 
                          dataKey="hour" 
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
          )}

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
              {stats.nightVoids > stats.totalVoids * 0.3 && stats.totalVoids > 0 && (
                <div className="mt-4 p-4 rounded-xl bg-info-soft border border-info/20">
                  <p className="text-sm text-info">
                    You have more nighttime voids than average. This might be worth discussing with your healthcare provider.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* CTA section - only show for patients, not doctors */}
      {!readOnly && (
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
            onClick={() => setCurrentView('insights')}
          >
            <Brain className="h-5 w-5" />
            View Insights
          </Button>
          <Button 
            variant="outline" 
            size="lg" 
            onClick={() => setCurrentView('overview')}
          >
            All Entries
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      )}
    </div>
  );
}
