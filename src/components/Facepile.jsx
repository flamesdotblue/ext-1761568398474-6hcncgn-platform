import { useEffect, useMemo, useRef, useState } from 'react';
import { subscribePresence, sendPresence, randomColorForId } from '../lib/store';

export default function Facepile({ docId, user }) {
  const [peers, setPeers] = useState({});
  const lastSent = useRef(0);

  useEffect(() => {
    if (!docId || !user) return;
    const unsub = subscribePresence(docId, (state) => setPeers(state));

    const tick = () => {
      const now = Date.now();
      if (now - lastSent.current > 4000) {
        sendPresence(docId, user);
        lastSent.current = now;
      }
      raf.current = requestAnimationFrame(tick);
    };
    const raf = { current: 0 };
    raf.current = requestAnimationFrame(tick);

    sendPresence(docId, user);
    return () => {
      cancelAnimationFrame(raf.current);
    };
  }, [docId, user]);

  const list = useMemo(() => Object.values(peers).sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0)), [peers]);

  return (
    <div className="flex -space-x-2">
      {list.map((p) => (
        <Avatar key={p.id} name={p.name} color={randomColorForId(p.id)} />
      ))}
    </div>
  );
}

function Avatar({ name, color }) {
  const initials = (name || '?')
    .split(' ')
    .map((s) => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <div
      title={name}
      className="inline-flex items-center justify-center w-7 h-7 rounded-full ring-2 ring-white text-xs font-semibold text-white"
      style={{ backgroundColor: color }}
    >
      {initials}
    </div>
  );
}
