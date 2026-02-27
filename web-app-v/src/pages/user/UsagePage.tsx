import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
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
import { Download, Filter, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { usageApi } from '../../api/usage';
import type { UsageLog, DashboardStats, DashboardModelStat, DashboardTrendPoint } from '../../types';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Table,
  Skeleton,
  Input,
  Modal,
} from '../../components/ui';

const COLORS = ['var(--accent-primary)', 'var(--accent-secondary)', '#FF0055', '#10B981', '#F59E0B', '#EF4444'];
const CHART_AXIS_COLOR = 'var(--text-muted)';
const CHART_GRID_COLOR = 'var(--grid-line)';
const CHART_TOOLTIP_STYLE = {
  backgroundColor: 'var(--bg-card)',
  border: '1px solid var(--border-color)',
  borderRadius: '8px',
};
const CHART_TOOLTIP_LABEL_STYLE = { color: 'var(--text-primary)' };

export const UsagePage: React.FC = () => {
  const { t } = useTranslation(['usage', 'common']);
  const [loading, setLoading] = useState(true);
  const [dashStats, setDashStats] = useState<DashboardStats | null>(null);
  const [modelDistribution, setModelDistribution] = useState<DashboardModelStat[]>([]);
  const [recentLogs, setRecentLogs] = useState<UsageLog[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [dailyStats, setDailyStats] = useState<Array<{ date: string; requests: number; cost: number }>>([]);

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  // Filter state
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterModel, setFilterModel] = useState('');
  const [filterApiKeyId, setFilterApiKeyId] = useState('');
  const [filterStream, setFilterStream] = useState<string>('');
  const [filterBillingType, setFilterBillingType] = useState<string>('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const trendParams: { granularity?: string; start_date?: string; end_date?: string } = { granularity: 'day' };
      const logParams: {
        page: number;
        page_size: number;
        start_date?: string;
        end_date?: string;
        model?: string;
        api_key_id?: number;
        stream?: boolean;
        billing_type?: number;
        timezone?: string;
      } = { page, page_size: pageSize, timezone };
      const modelParams: { start_date?: string; end_date?: string } = {};

      if (startDate) {
        logParams.start_date = startDate;
        modelParams.start_date = startDate;
        trendParams.start_date = startDate;
      }
      if (endDate) {
        logParams.end_date = endDate;
        modelParams.end_date = endDate;
        trendParams.end_date = endDate;
      }
      if (filterModel) {
        logParams.model = filterModel;
      }
      if (filterApiKeyId) {
        logParams.api_key_id = parseInt(filterApiKeyId);
      }
      if (filterStream !== '') {
        logParams.stream = filterStream === 'true';
      }
      if (filterBillingType !== '') {
        logParams.billing_type = parseInt(filterBillingType);
      }

      const [statsRes, modelsRes, logsRes, trendRes] = await Promise.all([
        usageApi.getDashboardStats().catch(() => null),
        usageApi.getDashboardModels(modelParams).catch(() => [] as DashboardModelStat[]),
        usageApi.getLogs(logParams).catch(() => ({ items: [] as UsageLog[], total: 0, page: 1, page_size: pageSize })),
        usageApi.getDashboardTrend(trendParams).catch(() => [] as DashboardTrendPoint[]),
      ]);

      setDashStats(statsRes);
      setModelDistribution(Array.isArray(modelsRes) ? modelsRes : []);
      setRecentLogs(logsRes.items || []);
      setTotalLogs(logsRes.total || 0);

      // Transform trend data for the chart
      const trendData = Array.isArray(trendRes) ? trendRes : [];
      const chartData = trendData.map((point: DashboardTrendPoint) => {
        const d = new Date(point.timestamp);
        return {
          date: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
          requests: point.requests,
          cost: point.cost,
        };
      });
      setDailyStats(chartData.length > 0 ? chartData : []);
    } catch (error) {
      console.error('Failed to fetch usage data:', error);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, filterModel, filterApiKeyId, filterStream, filterBillingType, page, pageSize]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleApplyFilter = () => {
    setPage(1);
    setIsFilterOpen(false);
  };

  const handleClearFilter = () => {
    setStartDate('');
    setEndDate('');
    setFilterModel('');
    setFilterApiKeyId('');
    setFilterStream('');
    setFilterBillingType('');
    setPage(1);
    setIsFilterOpen(false);
  };

  const hasActiveFilters = startDate || endDate || filterModel || filterApiKeyId || filterStream !== '' || filterBillingType !== '';

  const stats = [
    {
      label: t('usage:stats.todayRequests'),
      value: dashStats?.today_requests?.toLocaleString() || '0',
      color: 'text-blue-400',
    },
    {
      label: t('usage:stats.todayCost'),
      value: `$${dashStats?.today_cost?.toFixed(4) || '0.00'}`,
      color: 'text-emerald-400',
    },
    {
      label: t('usage:stats.totalRequests'),
      value: dashStats?.total_requests?.toLocaleString() || '0',
      color: 'text-purple-400',
    },
    {
      label: t('usage:stats.totalCost'),
      value: `$${dashStats?.total_cost?.toFixed(4) || '0.00'}`,
      color: 'text-amber-400',
    },
  ];

  const totalPages = Math.ceil(totalLogs / pageSize);

  const columns = [
    {
      key: 'created_at',
      title: t('usage:col.time'),
      render: (log: UsageLog) => (
        <span className="text-sm text-[var(--text-secondary)]">
          {new Date(log.created_at).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'model',
      title: t('usage:col.model'),
      render: (log: UsageLog) => (
        <Badge variant="primary" size="sm">
          {log.model}
        </Badge>
      ),
    },
    {
      key: 'tokens',
      title: t('usage:col.tokens'),
      render: (log: UsageLog) => (
        <span className="text-sm text-[var(--text-secondary)]">
          {log.input_tokens + log.output_tokens > 0
            ? `${(log.input_tokens + log.output_tokens).toLocaleString()}`
            : '-'}
        </span>
      ),
    },
    {
      key: 'cost',
      title: t('usage:col.cost'),
      render: (log: UsageLog) => (
        <span className="text-sm font-medium text-emerald-400">
          ${log.total_cost.toFixed(6)}
        </span>
      ),
    },
    {
      key: 'duration',
      title: t('usage:col.duration'),
      render: (log: UsageLog) => (
        <span className="text-sm text-[var(--text-secondary)]">
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
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1">{t('usage:title')}</h1>
          <p className="text-[var(--text-secondary)]">{t('usage:subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            leftIcon={<Filter className="w-4 h-4" />}
            onClick={() => setIsFilterOpen(true)}
          >
            {t('common:btn.filter')}
            {hasActiveFilters && (
              <span className="ml-1 w-2 h-2 rounded-full bg-[var(--accent-primary)] inline-block" />
            )}
          </Button>
          <Button variant="secondary" leftIcon={<Download className="w-4 h-4" />}>
            {t('common:btn.export')}
          </Button>
        </div>
      </div>

      {/* Active Filter Indicator */}
      {hasActiveFilters && (
        <div className="mb-4 flex items-center gap-2 text-sm text-[var(--text-secondary)] flex-wrap">
          <span>{t('usage:filter.filtered')}</span>
          {startDate && <Badge variant="primary" size="sm">From: {startDate}</Badge>}
          {endDate && <Badge variant="primary" size="sm">To: {endDate}</Badge>}
          {filterModel && <Badge variant="primary" size="sm">Model: {filterModel}</Badge>}
          {filterApiKeyId && <Badge variant="primary" size="sm">Key ID: {filterApiKeyId}</Badge>}
          {filterStream !== '' && <Badge variant="primary" size="sm">Stream: {filterStream}</Badge>}
          {filterBillingType !== '' && <Badge variant="primary" size="sm">Billing: {filterBillingType}</Badge>}
          <button
            onClick={handleClearFilter}
            className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-5">
              <p className="text-sm text-[var(--text-muted)] mb-1">{stat.label}</p>
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
            <CardTitle>{t('usage:chart.dailyTrend')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {loading ? (
                <Skeleton className="h-full" />
              ) : dailyStats.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyStats}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} />
                    <XAxis dataKey="date" stroke={CHART_AXIS_COLOR} fontSize={12} />
                    <YAxis stroke={CHART_AXIS_COLOR} fontSize={12} />
                    <Tooltip
                      contentStyle={CHART_TOOLTIP_STYLE}
                      labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                    />
                    <Bar dataKey="requests" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-[var(--text-muted)]">
                  {t('usage:chart.noTrend')}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Model Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>{t('usage:chart.modelDist')}</CardTitle>
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
                      contentStyle={CHART_TOOLTIP_STYLE}
                      labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                      formatter={(value: number) => `$${value.toFixed(4)}`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-[var(--text-muted)]">
                  {t('usage:chart.noData')}
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
                  <span className="text-sm text-[var(--text-secondary)]">{model.model}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Logs */}
      <Card>
        <CardHeader>
          <CardTitle>{t('usage:logs.title')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table
            columns={columns}
            data={recentLogs}
            loading={loading}
            emptyText={t('usage:logs.empty')}
          />
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--border-color)]">
              <p className="text-sm text-[var(--text-secondary)]">
                {t('usage:logs.showing', { start: (page - 1) * pageSize + 1, end: Math.min(page * pageSize, totalLogs), total: totalLogs })}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-[var(--text-secondary)]">
                  {t('common:table.page', { current: page, total: totalPages })}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filter Modal */}
      <Modal
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        title={t('usage:filter.title')}
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={handleClearFilter}>
              {t('common:btn.clear')}
            </Button>
            <Button variant="primary" onClick={handleApplyFilter}>
              {t('common:btn.apply')}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label={t('usage:filter.startDate')}
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <Input
            label={t('usage:filter.endDate')}
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          <Input
            label={t('usage:filter.model')}
            placeholder="e.g., claude-3-opus"
            value={filterModel}
            onChange={(e) => setFilterModel(e.target.value)}
          />
          <Input
            label={t('usage:filter.apiKeyId')}
            type="number"
            placeholder="e.g., 1"
            value={filterApiKeyId}
            onChange={(e) => setFilterApiKeyId(e.target.value)}
          />
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1">{t('usage:filter.stream')}</label>
            <select
              value={filterStream}
              onChange={(e) => setFilterStream(e.target.value)}
              className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-primary)] text-sm focus:border-[var(--focus-ring)] focus:outline-none"
            >
              <option value="">{t('usage:filter.streamAll')}</option>
              <option value="true">{t('usage:filter.streamYes')}</option>
              <option value="false">{t('usage:filter.streamNo')}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1">{t('usage:filter.billingType')}</label>
            <select
              value={filterBillingType}
              onChange={(e) => setFilterBillingType(e.target.value)}
              className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-primary)] text-sm focus:border-[var(--focus-ring)] focus:outline-none"
            >
              <option value="">{t('usage:filter.streamAll')}</option>
              <option value="0">{t('usage:filter.billingBalance')}</option>
              <option value="1">{t('usage:filter.billingSubscription')}</option>
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UsagePage;
