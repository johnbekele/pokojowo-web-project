import { useState } from 'react';
import { BarChart3, ListTodo, CheckSquare, Activity } from 'lucide-react';
import { cn } from '../lib/utils';
import StatsOverview from './StatsOverview';
import JobsPanel from './JobsPanel';
import ApprovalQueue from './ApprovalQueue';
import RecentActivity from './RecentActivity';

const tabs = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'jobs', label: 'Scrape Jobs', icon: ListTodo },
  { id: 'approval', label: 'Approval Queue', icon: CheckSquare },
  { id: 'activity', label: 'Activity', icon: Activity },
];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="bg-white rounded-lg border border-gray-200 p-1 inline-flex gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && <StatsOverview />}
        {activeTab === 'jobs' && <JobsPanel />}
        {activeTab === 'approval' && <ApprovalQueue />}
        {activeTab === 'activity' && <RecentActivity />}
      </div>
    </div>
  );
}
