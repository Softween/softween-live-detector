import { useState, useEffect } from 'react';
import type { MonitorGroup } from 'shared';
import { api } from '../api/client';

interface Props {
  value: string | null;
  onChange: (groupId: string | null) => void;
}

export default function GroupSelector({ value, onChange }: Props) {
  const [groups, setGroups] = useState<MonitorGroup[]>([]);

  useEffect(() => {
    api.groups.list().then(setGroups).catch(() => {});
  }, []);

  return (
    <div>
      <label className="label">Grup</label>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        className="input"
      >
        <option value="">Grupsuz</option>
        {groups.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
      </select>
    </div>
  );
}
