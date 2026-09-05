import React from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { CandidateInfo } from '../types/candidate';

interface PropertyChartProps {
  candidates: CandidateInfo[];
  selectedCandidateId: string | null;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6'];

const PropertyChart: React.FC<PropertyChartProps> = ({ candidates, selectedCandidateId }) => {
  if (candidates.length === 0) {
    return (
      <div className="glass-card p-4 h-[280px] flex items-center justify-center">
        <p className="text-mol-subtle text-sm">No candidates to compare</p>
      </div>
    );
  }

  // Build radar data
  const properties = ['activity', 'absorption', 'solubility', 'toxicity'];
  const radarData = properties.map(prop => {
    const entry: Record<string, unknown> = { property: prop.charAt(0).toUpperCase() + prop.slice(1) };
    candidates.slice(0, 5).forEach((cand, i) => {
      const pred = cand.predictions.find(p => p.property_name === prop);
      let val = 0;
      if (pred?.value != null) {
        if (prop === 'absorption') val = pred.value / 100;
        else if (prop === 'solubility') val = Math.max(0, (pred.value + 6) / 6);
        else if (prop === 'toxicity') val = 1 - pred.value; // Invert
        else val = pred.value;
      }
      entry[cand.name || `C${i + 1}`] = Math.max(0, Math.min(1, val));
    });
    return entry;
  });

  // Build bar data for ranking
  const barData = candidates.slice(0, 6).map((cand, i) => ({
    name: cand.name?.length > 15 ? cand.name.slice(0, 15) + '…' : (cand.name || `C${i + 1}`),
    score: cand.ranking_score ?? 0,
    fill: cand.id === selectedCandidateId ? '#3b82f6' :
      cand.evidence_status === 'EXPERIMENTALLY_REPORTED' ? '#10b981' : '#f59e0b',
  }));

  const candidateNames = candidates.slice(0, 5).map((c, i) => c.name || `C${i + 1}`);

  return (
    <div className="glass-card p-4">
      <h3 className="text-xs font-semibold text-mol-text uppercase tracking-wider mb-3 flex items-center gap-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-mol-accent">
          <path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/>
        </svg>
        Property Comparison
      </h3>

      <div className="disclaimer-banner text-[10px] mb-3">
        ⚠ All values are computational predictions from a demonstration model — not experimentally validated.
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Radar Chart */}
        <div>
          <p className="text-[10px] text-mol-muted mb-1 text-center">Normalized Properties (0–1 scale)</p>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#1e293b" />
              <PolarAngleAxis dataKey="property" tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <PolarRadiusAxis angle={30} domain={[0, 1]} tick={{ fill: '#64748b', fontSize: 8 }} />
              {candidateNames.map((name, i) => (
                <Radar
                  key={name}
                  name={name}
                  dataKey={name}
                  stroke={COLORS[i % COLORS.length]}
                  fill={COLORS[i % COLORS.length]}
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
              ))}
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1e293b', borderRadius: 8, fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Bar Chart */}
        <div>
          <p className="text-[10px] text-mol-muted mb-1 text-center">Overall Ranking Score</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis type="number" domain={[0, 1]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <YAxis type="category" dataKey="name" width={100} tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1e293b', borderRadius: 8, fontSize: 11 }} />
              <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                {barData.map((entry, index) => (
                  <rect key={index} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default PropertyChart;
