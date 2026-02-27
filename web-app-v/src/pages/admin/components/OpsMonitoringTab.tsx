import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Activity, Server, Wifi, Zap, RefreshCw } from 'lucide-react';
import { adminOpsApi } from '../../../api/admin/ops';
import { Card, CardContent, Badge, Button } from '../../../components/ui';

interface ConcurrencyData {
  current: number;
  limit: number;
  queued: number;
  active_requests: number;
}

interface AccountAvailabilityData {
  total: number;
  available: number;
  unavailable: number;
  by_platform: Record<string, { available: number; total: number }>;
}

interface RealtimeTrafficData {
  qps: number;
  latency_ms: number;
  error_rate: number;
  active_requests: number;
}

interface WsQpsData {
  current: number;
  peak: number;
  connections: number;
}

export const OpsMonitoringTab: React.FC = () => {
  const { t } = useTranslation('admin');
  const [loading, setLoading] = useState(true);
  const [concurrency, setConcurrency] = useState<ConcurrencyData | null>(null);
  const [availability, setAvailability] = useState<AccountAvailabilityData | null>(null);
  const [traffic, setTraffic] = useState<RealtimeTrafficData | null>(null);
  const [wsQps, setWsQps] = useState<WsQpsData | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      const [concRes, availRes, trafficRes, wsRes] = await Promise.all([
        adminOpsApi.getConcurrency().catch(() => null),
        adminOpsApi.getAccountAvailability().catch(() => null),
        adminOpsApi.getRealtimeTraffic().catch(() => null),
        adminOpsApi.getWsQps().catch(() => null),
      ]);
      setConcurrency(concRes);
      setAvailability(availRes);
      setTraffic(trafficRes);
      setWsQps(wsRes);
    } catch (error) {
      console.error('Failed to fetch monitoring metrics:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000);
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-[#00F0FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Auto-refresh indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>{t('ops.monitoring.autoRefresh')}</span>
        </div>
        <Button variant="secondary" size="sm" onClick={fetchMetrics}>
          <RefreshCw className="w-4 h-4 mr-2" />
          {t('ops.monitoring.refreshNow')}
        </Button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Concurrency Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-cyan-500/10">
                <Activity className="w-5 h-5 text-cyan-400" />
              </div>
              <h3 className="text-lg font-medium text-white">{t('ops.monitoring.concurrency')}</h3>
            </div>
            {concurrency ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-[#0A0A0C] rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">{t('ops.monitoring.current')}</p>
                  <p className="text-2xl font-bold text-cyan-400">{concurrency.current}</p>
                </div>
                <div className="p-3 bg-[#0A0A0C] rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">{t('ops.monitoring.limit')}</p>
                  <p className="text-2xl font-bold text-white">{concurrency.limit}</p>
                </div>
                <div className="p-3 bg-[#0A0A0C] rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">{t('ops.monitoring.queued')}</p>
                  <p className="text-2xl font-bold text-amber-400">{concurrency.queued}</p>
                </div>
                <div className="p-3 bg-[#0A0A0C] rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">{t('ops.monitoring.activeRequests')}</p>
                  <p className="text-2xl font-bold text-emerald-400">{concurrency.active_requests}</p>
                </div>
                {/* Usage bar */}
                <div className="col-span-2">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>{t('ops.monitoring.usage')}</span>
                    <span>{concurrency.limit > 0 ? Math.round((concurrency.current / concurrency.limit) * 100) : 0}%</span>
                  </div>
                  <div className="w-full h-2 bg-[#0A0A0C] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-400 rounded-full transition-all"
                      style={{ width: `${concurrency.limit > 0 ? Math.min(100, (concurrency.current / concurrency.limit) * 100) : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">{t('ops.monitoring.noData')}</p>
            )}
          </CardContent>
        </Card>

        {/* Account Availability Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Server className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="text-lg font-medium text-white">{t('ops.monitoring.accountAvailability')}</h3>
            </div>
            {availability ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 bg-[#0A0A0C] rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">{t('ops.monitoring.total')}</p>
                    <p className="text-2xl font-bold text-white">{availability.total}</p>
                  </div>
                  <div className="p-3 bg-[#0A0A0C] rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">{t('ops.monitoring.available')}</p>
                    <p className="text-2xl font-bold text-emerald-400">{availability.available}</p>
                  </div>
                  <div className="p-3 bg-[#0A0A0C] rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">{t('ops.monitoring.unavailable')}</p>
                    <p className="text-2xl font-bold text-red-400">{availability.unavailable}</p>
                  </div>
                </div>
                {/* Per-platform breakdown */}
                {Object.keys(availability.by_platform).length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500">{t('ops.monitoring.byPlatform')}</p>
                    {Object.entries(availability.by_platform).map(([platform, data]) => (
                      <div key={platform} className="flex items-center justify-between p-2 bg-[#0A0A0C] rounded">
                        <span className="text-sm text-gray-300 capitalize">{platform}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="success">{data.available}</Badge>
                          <span className="text-xs text-gray-500">/ {data.total}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">{t('ops.monitoring.noData')}</p>
            )}
          </CardContent>
        </Card>

        {/* Realtime Traffic Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Zap className="w-5 h-5 text-purple-400" />
              </div>
              <h3 className="text-lg font-medium text-white">{t('ops.monitoring.realtimeTraffic')}</h3>
            </div>
            {traffic ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-[#0A0A0C] rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">{t('ops.monitoring.qps')}</p>
                  <p className="text-2xl font-bold text-purple-400">{traffic.qps.toFixed(2)}</p>
                </div>
                <div className="p-3 bg-[#0A0A0C] rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">{t('ops.monitoring.latency')}</p>
                  <p className="text-2xl font-bold text-white">{traffic.latency_ms.toFixed(0)} ms</p>
                </div>
                <div className="p-3 bg-[#0A0A0C] rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">{t('ops.monitoring.errorRate')}</p>
                  <p className={`text-2xl font-bold ${traffic.error_rate > 5 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {traffic.error_rate.toFixed(2)}%
                  </p>
                </div>
                <div className="p-3 bg-[#0A0A0C] rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">{t('ops.monitoring.activeRequests')}</p>
                  <p className="text-2xl font-bold text-cyan-400">{traffic.active_requests}</p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">{t('ops.monitoring.noData')}</p>
            )}
          </CardContent>
        </Card>

        {/* WebSocket QPS Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Wifi className="w-5 h-5 text-amber-400" />
              </div>
              <h3 className="text-lg font-medium text-white">{t('ops.monitoring.wsQps')}</h3>
            </div>
            {wsQps ? (
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 bg-[#0A0A0C] rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">{t('ops.monitoring.current')}</p>
                  <p className="text-2xl font-bold text-amber-400">{wsQps.current.toFixed(2)}</p>
                </div>
                <div className="p-3 bg-[#0A0A0C] rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">{t('ops.monitoring.peak')}</p>
                  <p className="text-2xl font-bold text-white">{wsQps.peak.toFixed(2)}</p>
                </div>
                <div className="p-3 bg-[#0A0A0C] rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">{t('ops.monitoring.connections')}</p>
                  <p className="text-2xl font-bold text-cyan-400">{wsQps.connections}</p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">{t('ops.monitoring.noData')}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OpsMonitoringTab;
