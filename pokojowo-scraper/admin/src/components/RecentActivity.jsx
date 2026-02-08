import { useState, useEffect } from 'react';
import { Activity, Loader2, RefreshCw, CheckCircle, XCircle, Database, Clock } from 'lucide-react';
import { scraperApi } from '../services/api';
import { formatDate, cn } from '../lib/utils';

export default function RecentActivity() {
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchActivity();
  }, []);

  const fetchActivity = async () => {
    setIsLoading(true);
    try {
      const data = await scraperApi.getRecentActivity(30);
      setActivities(data.activities || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'scraped':
        return <Database className="w-4 h-4 text-blue-600" />;
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case 'scraped':
        return 'bg-blue-50 border-blue-200';
      case 'approved':
        return 'bg-green-50 border-green-200';
      case 'rejected':
        return 'bg-red-50 border-red-200';
      case 'pending':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
        <button
          onClick={fetchActivity}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Activity List */}
      <div className="bg-white rounded-lg border border-gray-200">
        {activities.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {activities.map((activity, index) => (
              <div
                key={index}
                className={cn('p-4 flex items-start gap-3', getActivityColor(activity.type))}
              >
                <div className="flex-shrink-0 mt-1">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    <span className="font-medium capitalize">{activity.type}</span>
                    {activity.address && (
                      <span className="text-gray-600"> - {activity.address}</span>
                    )}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                    <span>{formatDate(activity.timestamp)}</span>
                    {activity.site && (
                      <>
                        <span>•</span>
                        <span>{activity.site}</span>
                      </>
                    )}
                    {activity.reviewer && (
                      <>
                        <span>•</span>
                        <span>by {activity.reviewer}</span>
                      </>
                    )}
                  </div>
                </div>
                {activity.price && (
                  <div className="text-sm font-medium text-gray-900">
                    {activity.price} zł
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No recent activity</p>
          </div>
        )}
      </div>
    </div>
  );
}
