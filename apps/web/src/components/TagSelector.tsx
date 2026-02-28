import { useState, useEffect } from 'react';
import type { Tag } from 'shared';
import { api } from '../api/client';

interface Props {
  value: string[];
  onChange: (tagIds: string[]) => void;
}

export default function TagSelector({ value, onChange }: Props) {
  const [tags, setTags] = useState<Tag[]>([]);

  useEffect(() => {
    api.tags.list().then(setTags).catch(() => {});
  }, []);

  function toggle(tagId: string) {
    if (value.includes(tagId)) {
      onChange(value.filter((id) => id !== tagId));
    } else if (value.length < 10) {
      onChange([...value, tagId]);
    }
  }

  if (tags.length === 0) return null;

  return (
    <div>
      <label className="label">Etiketler</label>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => {
          const selected = value.includes(tag.id);
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggle(tag.id)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all"
              style={{
                backgroundColor: selected ? tag.color + '30' : 'transparent',
                color: selected ? tag.color : '#71717a',
                border: `1px solid ${selected ? tag.color + '50' : 'rgba(255,255,255,0.06)'}`,
              }}
            >
              {tag.name}
              {selected && (
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
