import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Download, Filter } from 'lucide-react';
import { usageApi } from '../../api/usage';
import type { UsageLog } from '../../types';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Table,
  Skeleton,
} from '../../components/ui';

interface UsageSummary {
  today: { requests: number; tokens: number; cost: number };
  week: { requests: number; tokens: number; cost: number };
  month: { requests: number; tokens: number; cost: number };
  total: { requests: number; tokens: number; cost: number };
}

interface ModelDistribution {
  model: string;
  requests: number;
  tokens: number;
  cost: number;
}

const COLORS = ['#00F0FF', '#7000FF', '#FF0055', '#10B981', '#F59E0B', '#EF4444'];

export const UsagePage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [modelDistribution, setModelDistribution] = useState<ModelDistribution[]>([]);
  const [recentLogs, setRecentLogs] = useState<UsageLog[]>([]);
  const [dailyStats, setDailyStats] = useState<Array<{ date: string; requests: number; cost: number }>>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [summaryRes, modelsRes, logsRes] = await Promise.all([
          usageApi.getSummary(),
          usageApi.getModelDistribution(),
          usageApi.getLogs({ page_size: 10 }),
        ]);

        setSummary(summaryRes);
        setModelDistribution(modelsRes);
        setRecentLogs(logsRes.items);

        // Generate mock daily stats for the chart
        const stats = Array.from({ length: 7 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (6 - i));
          return {
            date: date.toLocaleDateString('en-US', { weekday: 'short' }),
            requests: Math.floor(Math.random() * 1000) + 100,
            cost: Math.random() * 10,
          };
        });
        setDailyStats(stats);
      } catch (error) {
        console.error('Failed to fetch usage data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const stats = [
    {
      label: "Today's Requests",
      value: summary?.today.requests.toLocaleString() || '0',
      color: 'text-blue-400',
    },
    {
      label: "Today's Cost",
      value: `$${summary?.today.cost.toFixed(4) || '0.00'}`,
      color: 'text-emerald-400',
    },
    {
      label: 'This Week',
      value: `$${summary?.week.cost.toFixed(4) || '0.00'}`,
      color: 'text-purple-400',
    },
    {
      label: 'This Month',
      value: `$${summary?.month.cost.toFixed(4) || '0.00'}`,
      color: 'text-amber-400',
    },
  ];

  const columns = [
    {
      key: 'created_at',
      title: 'Time',
      render: (log: UsageLog) => (
        <span className="text-sm text-gray-400">
          {new Date(log.created_at).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'model',
      title: 'Model',
      render: (log: UsageLog) => (
        <Badge variant="primary" size="sm">
          {log.model}
        </Badge>
      ),
    },
    {
      key: 'tokens',
      title: 'Tokens',
      render: (log: UsageLog) => (
        <span className="text-sm text-gray-300">
          {log.input_tokens + log.output_tokens > 0
            ? `${log.input_tokens + log.output_tokens.toLocaleString()}`
            : '-'}
        </span>
      ),
    },
    {
      key: 'cost',
      title: 'Cost',
      render: (log: UsageLog) => (
        <span className="text-sm font-medium text-emerald-400">
          ${log.total_cost.toFixed(6)}
        </span>
      ),
    },
    {
      key: 'duration',
      title: 'Duration',
      render: (log: UsageLog) => (
        <span className="text-sm text-gray-400">
          {log.duration_ms ? `${log.duration_ms}ms` : '-'}
        </span>
      ),
    },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Usage</h1>
          <p className="text-gray-400">Monitor your API usage and costs</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" leftIcon={<Filter className="w-4 h-4" />}>
            Filter
          </Button>
          <Button variant="secondary" leftIcon={<Download className="w-4 h-4" />}>
            Export
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-5">
              <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
              {loading ? (
                <Skeleton width={100} height={28} />
              ) : (
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Daily Usage Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Usage (7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {loading ? (
                <Skeleton className="h-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyStats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A2A30" />
                    <XAxis dataKey="date" stroke="#6B7280" fontSize={12} />
                    <YAxis stroke="#6B7280" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#121215',
                        border: '1px solid #2A2A30',
                        borderRadius: '8px',
                      }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Bar dataKey="requests" fill="#00F0FF" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Model Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Model Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {loading ? (
                <Skeleton className="h-full" />
              ) : modelDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={modelDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="cost"
                    >
                      {modelDistribution.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#121215',
                        border: '1px solid #2A2A30',
                        borderRadius: '8px',
                      }}
                      labelStyle={{ color: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  No data available
                </div>
              )}
            </div>
            {/* Legend */}
            <div className="flex flex-wrap gap-4 mt-4">
              {modelDistribution.slice(0, 4).map((model, index) => (
                <div key={model.model} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-sm text-gray-400">{model.model}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Requests</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table
            columns={columns}
            data={recentLogs}
            loading={loading}
            emptyText="No usage data found"
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default UsagePage;
