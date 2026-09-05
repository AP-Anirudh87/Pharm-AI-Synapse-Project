import React from 'react';
import { Priorities } from '../types/molecule';

interface GoalSelectorProps {
  goal: string;
  onGoalChange: (goal: string) => void;
  priorities: Priorities;
  onPrioritiesChange: (priorities: Priorities) => void;
}

const GOALS = [
  { value: 'Improve oral absorption', label: 'Improve Absorption', icon: '💊' },
  { value: 'Improve activity', label: 'Improve Activity', icon: '🎯' },
  { value: 'Reduce toxicity', label: 'Reduce Toxicity', icon: '🛡️' },
  { value: 'Improve solubility', label: 'Improve Solubility', icon: '💧' },
  { value: 'Custom goal', label: 'Custom Goal', icon: '⚙️' },
];

const PRIORITY_CONFIGS = [
  { key: 'activity' as const, label: 'Activity', color: '#6366f1' },
  { key: 'absorption' as const, label: 'Absorption', color: '#10b981' },
  { key: 'solubility' as const, label: 'Solubility', color: '#06b6d4' },
  { key: 'toxicity' as const, label: 'Toxicity', color: '#ef4444' },
];

const GoalSelector: React.FC<GoalSelectorProps> = ({
  goal,
  onGoalChange,
  priorities,
  onPrioritiesChange,
}) => {
  const handlePriorityChange = (key: keyof Priorities, value: number) => {
    onPrioritiesChange({ ...priorities, [key]: value });
  };

  const total = priorities.activity + priorities.absorption + priorities.solubility + priorities.toxicity;

  return (
    <div className="space-y-4">
      {/* Goal Selection */}
      <div>
        <h2 className="text-sm font-semibold text-mol-text uppercase tracking-wider flex items-center gap-2 mb-3">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-mol-green">
            <circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/>
          </svg>
          Research Goal
        </h2>
        <div className="space-y-1.5">
          {GOALS.map(g => (
            <button
              key={g.value}
              onClick={() => onGoalChange(g.value)}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2
                ${goal === g.value
                  ? 'bg-mol-accent/15 text-mol-accent border border-mol-accent/30'
                  : 'text-mol-muted hover:text-mol-text hover:bg-mol-card border border-transparent'
                }`}
            >
              <span>{g.icon}</span>
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* Priority Sliders */}
      <div>
        <h2 className="text-sm font-semibold text-mol-text uppercase tracking-wider flex items-center gap-2 mb-3">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-mol-cyan">
            <line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/>
            <line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/>
            <line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/>
          </svg>
          Priority Weights
        </h2>

        <div className="space-y-3">
          {PRIORITY_CONFIGS.map(({ key, label, color }) => {
            const pct = total > 0 ? Math.round((priorities[key] / total) * 100) : 25;
            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-mol-muted">{label}</span>
                  <span className="text-xs font-mono font-medium" style={{ color }}>
                    {priorities[key]}% <span className="text-mol-subtle">({pct}% eff.)</span>
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={priorities[key]}
                  onChange={e => handlePriorityChange(key, Number(e.target.value))}
                  className="w-full"
                  style={{
                    accentColor: color,
                    background: `linear-gradient(to right, ${color}44 0%, ${color}44 ${priorities[key]}%, #1e293b ${priorities[key]}%, #1e293b 100%)`,
                  }}
                />
              </div>
            );
          })}
        </div>

        <p className="text-[10px] text-mol-subtle mt-2 text-center">
          Weights are normalized to 100% before ranking.
        </p>
      </div>
    </div>
  );
};

export default GoalSelector;
