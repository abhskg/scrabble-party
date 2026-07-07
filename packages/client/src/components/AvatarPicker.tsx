export const AVATARS = ['🦊', '🐸', '🐼', '🦄', '🐙', '🦁', '🐨', '🤖', '👻', '🦖', '🍕', '🌵'];

export function AvatarPicker({ value, onChange }: { value: string; onChange: (a: string) => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
      {AVATARS.map(a => (
        <button
          key={a}
          onClick={() => onChange(a)}
          aria-label={`avatar ${a}`}
          style={{
            fontSize: '1.8rem', padding: 6, borderRadius: 12, cursor: 'pointer',
            border: a === value ? '3px solid var(--pop-pink)' : '3px solid transparent',
            background: a === value ? '#fff0f6' : 'transparent',
          }}
        >
          {a}
        </button>
      ))}
    </div>
  );
}
