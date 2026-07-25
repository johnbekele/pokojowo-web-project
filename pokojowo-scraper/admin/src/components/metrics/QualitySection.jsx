import { Loader2 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// Validated categorical palette (dataviz reference instance, slots 1-3).
// Light-slot contrast <3:1 for aqua/yellow — relief provided by legend + table below.
const STATUS_SERIES = [
  { key: 'published', color: '#2a78d6' },
  { key: 'pending', color: '#1baf7a' },
  { key: 'held', color: '#eda100' },
];

const pct = (v) => (v == null ? '—' : `${Math.round(v * 100)}%`);

export default function QualitySection({ data, isLoading }) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex justify-center text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading quality metrics...
      </div>
    );
  }

  const bySite = data?.by_site || {};
  const sites = Object.keys(bySite);
  const chartData = sites.map((site) => ({
    site,
    published: bySite[site]?.published?.count || 0,
    pending: bySite[site]?.pending?.count || 0,
    held: bySite[site]?.held?.count || 0,
  }));

  return (
    <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 space-y-4">
      <h3 className="text-base font-semibold text-gray-900">Quality by site</h3>
      {sites.length === 0 ? (
        <p className="text-sm text-gray-500 py-8 text-center">No quality data for this period.</p>
      ) : (
        <>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#e1e0d9" strokeWidth={1} />
                <XAxis dataKey="site" tickLine={false} axisLine={{ stroke: '#c3c2b7' }} tick={{ fill: '#898781', fontSize: 12 }} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: '#898781', fontSize: 12 }} />
                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {STATUS_SERIES.map(({ key, color }) => (
                  <Bar key={key} dataKey={key} fill={color} barSize={20} radius={[4, 4, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase text-gray-500">
                <th className="py-2 pr-4 font-medium">Site</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-4 font-medium text-right">Count</th>
                <th className="py-2 pr-4 font-medium text-right">Avg confidence</th>
                <th className="py-2 font-medium text-right">Avg completeness</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {sites.flatMap((site) =>
                STATUS_SERIES.map(({ key }) => {
                  const s = bySite[site]?.[key];
                  return (
                    <tr key={`${site}-${key}`} className="border-b border-gray-100 last:border-0">
                      <td className="py-2 pr-4 uppercase text-xs font-medium text-gray-600">{site}</td>
                      <td className="py-2 pr-4 capitalize text-gray-700">{key}</td>
                      <td className="py-2 pr-4 text-right text-gray-800">{s?.count ?? 0}</td>
                      <td className="py-2 pr-4 text-right text-gray-800">{pct(s?.avg_confidence)}</td>
                      <td className="py-2 text-right text-gray-800">{pct(s?.avg_completeness)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}
