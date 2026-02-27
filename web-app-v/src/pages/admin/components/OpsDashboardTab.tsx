import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw } from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { adminOpsApi } from '../../../api/admin/ops';
import { Card, CardContent, Button } from '../../../components/ui';

interface OverviewData {
  total_requests_24h: number;
  total_errors_24h: number;
  avg_latency_ms: number;
  active_accounts: number;
  qps: number;
  error_rate: number;
}

interface ThroughputPoint {
  timestamp: string;
  requests: number;
  tokens: number;
}

interface LatencyPoint {
  bucket: string;
  count: number;
}

interface ErrorTrendPoint {
  timestamp: string;
  count: number;
  type: string;
}

interface ErrorDistributionPoint {
  type: string;
  count: number;
  percentage: number;
}

const PIE_COLORS = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'];

export const OpsDashboardTab: React.FC = () => {
  const { t } = useTranslation('admin');
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [throughput, setThroughput] = useState<ThroughputPoint[]>([]);
  const [latency, setLatency] = useState<LatencyPoint[]>([]);
  const [errorTrend, setErrorTrend] = useState<ErrorTrendPoint[]>([]);
  const [errorDistribution, setErrorDistribution] = useState<ErrorDistributionPoint[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [overviewRes, throughputRes, latencyRes, errorTrendRes, errorDistRes] = await Promise.all([
        adminOpsApi.getDashboardOverview().catch(() => null),
        adminOpsApi.getThroughputTrend({ hours: 24 }).catch(() => []),
        adminOpsApi.getLatencyHistogram({ hours: 24 }).catch(() => []),
        adminOpsApi.getErrorTrend({ hours: 24 }).catch(() => []),
        adminOpsApi.getErrorDistribution({ hours: 24 }).catch(() => []),
      ]);
      setOverview(overviewRes);
      setThroughput(Array.isArray(throughputRes) ? throughputRes : []);
      setLatency(Array.isArray(latencyRes) ? latencyRes : []);
      setErrorTrend(Array.isArray(errorTrendRes) ? errorTrendRes : []);
      setErrorDistribution(Array.isArray(errorDistRes) ? errorDistRes : []);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">{t('ops.dashboard.description')}</p>
        <Button variant="secondary" size="sm" onClick={fetchData} isLoading={loading}>
          <RefreshCw className="w-4 h-4 mr-2" />
          {t('ops.dashboard.refresh')}
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 mb-1">{t('ops.dashboard.requests24h')}</p>
            <p className="text-2xl font-bold text-white">
              {overview?.total_requests_24h.toLocaleString() ?? '-'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 mb-1">{t('ops.dashboard.errors24h')}</p>
            <p className={`text-2xl font-bold ${overview && overview.total_errors_24h > 0 ? 'text-red-400' : 'text-white'}`}>
              {overview?.total_errors_24h.toLocaleString() ?? '-'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 mb-1">{t('ops.dashboard.avgLatency')}</p>
            <p className="text-2xl font-bold text-cyan-400">
              {overview ? `${overview.avg_latency_ms.toFixed(0)}ms` : '-'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 mb-1">{t('ops.dashboard.activeAccounts')}</p>
            <p className="text-2xl font-bold text-emerald-400">
              {overview?.active_accounts.toLocaleString() ?? '-'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 mb-1">{t('ops.dashboard.qps')}</p>
            <p className="text-2xl font-bold text-purple-400">
              {overview ? overview.qps.toFixed(2) : '-'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 mb-1">{t('ops.dashboard.errorRate')}</p>
            <p className={`text-2xl font-bold ${overview && overview.error_rate > 5 ? 'text-red-400' : 'text-white'}`}>
              {overview ? `${overview.error_rate.toFixed(2)}%` : '-'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Throughput Trend */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-medium text-white mb-4">{t('ops.dashboard.throughputTrend')}</h3>
            <div className="h-64">
              {throughput.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={throughput}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A2A30" />
                    <XAxis
                      dataKey="timestamp"
                      stroke="#6B7280"
                      fontSize={12}
                      tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                    />
                    <YAxis stroke="#6B7280" fontSize={12} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#121215', border: '1px solid #2A2A30', borderRadius: '8px' }}
                      labelStyle={{ color: '#fff' }}
                      labelFormatter={(value) => new Date(value).toLocaleString()}
                    />
                    <Line type="monotone" dataKey="requests" stroke="#3B82F6" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="tokens" stroke="#10B981" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                  {t('ops.dashboard.noData')}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Latency Histogram */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-medium text-white mb-4">{t('ops.dashboard.latencyHistogram')}</h3>
            <div className="h-64">
              {latency.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={latency}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A2A30" />
                    <XAxis dataKey="bucket" stroke="#6B7280" fontSize={11} />
                    <YAxis stroke="#6B7280" fontSize={12} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#121215', border: '1px solid #2A2A30', borderRadius: '8px' }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Bar dataKey="count" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                  {t('ops.dashboard.noData')}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Error Trend */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-medium text-white mb-4">{t('ops.dashboard.errorTrend')}</h3>
            <div className="h-64">
              {errorTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={errorTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A2A30" />
                    <XAxis
                      dataKey="timestamp"
                      stroke="#6B7280"
                      fontSize={12}
                      tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                    />
                    <YAxis stroke="#6B7280" fontSize={12} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#121215', border: '1px solid #2A2A30', borderRadius: '8px' }}
                      labelStyle={{ color: '#fff' }}
                      labelFormatter={(value) => new Date(value).toLocaleString()}
                    />
                    <Line type="monotone" dataKey="count" stroke="#EF4444" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                  {t('ops.dashboard.noData')}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Error Distribution */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-medium text-white mb-4">{t('ops.dashboard.errorDistribution')}</h3>
            <div className="h-64">
              {errorDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={errorDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="count"
                      nameKey="type"
                    >
                      {errorDistribution.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#121215', border: '1px solid #2A2A30', borderRadius: '8px' }}
                      labelStyle={{ color: '#fff' }}
                      formatter={(value: number, name: string, props: { payload?: { percentage?: number } }) => [
                        `${value} (${props?.payload?.percentage?.toFixed(1) ?? 0}%)`,
                        name,
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                  {t('ops.dashboard.noData')}
                </div>
              )}
            </div>
            {/* Legend */}
            {errorDistribution.length > 0 && (
              <div className="flex flex-wrap gap-3 mt-2">
                {errorDistribution.slice(0, 6).map((item, i) => (
                  <div key={item.type} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-xs text-gray-400 truncate max-w-[100px]">{item.type}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OpsDashboardTab;
