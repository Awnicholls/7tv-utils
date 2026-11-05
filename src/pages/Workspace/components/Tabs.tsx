import type { ReactNode } from 'react';

import type { ToolId } from '../../../types/copier';

import { TOOLS } from '../../../constants';

interface TabsProps {
  active: ToolId;
  disabled: boolean;
  onChange: (tool: ToolId) => void;
}

export const Tabs = ({ active, disabled, onChange }: TabsProps): ReactNode => (
  <div aria-label="Tools" className="tabs" role="tablist">
    {TOOLS.map((t) => (
      <button
        aria-controls={`panel-${t.id}`}
        aria-selected={t.id === active}
        className={`tab ${t.id === active ? 'active' : ''}`}
        disabled={disabled && t.id !== active}
        id={`tab-${t.id}`}
        key={t.id}
        onClick={() => {
          onChange(t.id);
        }}
        role="tab"
        type="button"
      >
        {t.label}
      </button>
    ))}
  </div>
);
