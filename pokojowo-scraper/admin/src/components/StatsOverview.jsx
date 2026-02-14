import { useState, useEffect } from 'react';
import { Database, Clock, CheckCircle, XCircle, Loader2, TrendingUp } from 'lucide-react';
import { scraperApi } from '../services/api';
import { formatNumber } from '../lib/utils';

export default function StatsOverview() {
  const [stats, setStats] = useState(null);
  const [siteStats, setSiteStats] = useState([]);
  const [quality, setQuality] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [overviewData, siteData, qualityData] = await Promise.all([
        scraperApi.getOverviewStats(),
        scraperApi.getStatsBySite(),
        scraperApi.getQualityMetrics(),
      ]);
      // Flatten the nested listings object for easier access
      setStats(overviewData?.listings || {});
      // Convert site stats object to array
      const sitesArray = Object.entries(siteData || {}).map(([site, data]) => ({
        site,
        ...data,
      }));
      setSiteStats(sitesArray);
      setQuality(qualityData);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        Failed to load stats: {error}
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Scraped',
      value: formatNumber(stats?.total_scraped || 0),
      icon: Database,
      color: 'blue',
    },
    {
      label: 'Pending Review',
      value: formatNumber(stats?.pending_approval || 0),
      icon: Clock,
      color: 'yellow',
    },
    {
      label: 'Approved',
      value: formatNumber(stats?.approved || 0),
      icon: CheckCircle,
      color: 'green',
    },
    {
      label: 'Rejected',
      value: formatNumber(stats?.rejected || 0),
      icon: XCircle,
      color: 'red',
    },
  ];

  const colorMap = {
    blue: 'bg-blue-100 text-blue-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    green: 'bg-green-100 text-green-600',
    red: 'bg-red-100 text-red-600',
  };

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-white rounded-lg border border-gray-200 p-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-full ${colorMap[stat.color]}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Site Stats */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Stats by Site</h3>
        {siteStats.length > 0 ? (
          <div className="space-y-3">
            {siteStats.map((site) => (
              <div key={site.site} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{site.site}</p>
                    <p className="text-sm text-gray-500">{formatNumber(site.total)} listings</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-green-600">{formatNumber(site.approved || 0)} approved</p>
                  <p className="text-sm text-yellow-600">{formatNumber(site.pending || 0)} pending</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No site data available</p>
        )}
      </div>

      {/* Quality Metrics */}
      {quality && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Quality</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">
                {quality.averages?.completeness_score?.toFixed(1) || 0}%
              </p>
              <p className="text-sm text-gray-500">Avg Completeness</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">
                {quality.averages?.confidence_score?.toFixed(1) || 0}%
              </p>
              <p className="text-sm text-gray-500">Avg Confidence</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">
                {quality.completeness?.with_images?.toFixed(1) || 0}%
              </p>
              <p className="text-sm text-gray-500">With Images</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-orange-600">
                {quality.completeness?.with_price?.toFixed(1) || 0}%
              </p>
              <p className="text-sm text-gray-500">With Price</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
