import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Globe, Lock } from 'lucide-react';
import { createDocument, listDocuments, renameDocument, removeDocument, togglePublic, subscribeDocsIndex } from '../lib/store';

export default function Sidebar({ user, docs, activeId, onSelect }) {
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState('all'); // all | mine | public
  const [localDocs, setLocalDocs] = useState(docs);

  useEffect(() => setLocalDocs(docs), [docs]);

  useEffect(() => {
    const unsub = subscribeDocsIndex(() => setLocalDocs(listDocuments()));
    return unsub;
  }, []);

  const filtered = useMemo(() => {
    return localDocs
      .filter((d) => {
        if (scope === 'mine') return d.ownerId === user?.id;
        if (scope === 'public') return d.isPublic;
        return true;
      })
      .filter((d) => d.title.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }, [localDocs, scope, query, user]);

  const onCreate = () => {
    const doc = createDocument({ ownerId: user?.id });
    onSelect(doc.id);
  };

  const onRename = (id) => {
    const curr = localDocs.find((d) => d.id === id);
    const next = window.prompt('Rename document', curr?.title || 'Untitled');
    if (next && next.trim()) renameDocument(id, next.trim());
  };

  const onDelete = (id) => {
    if (window.confirm('Delete this document?')) {
      removeDocument(id);
      if (activeId === id) {
        const remaining = listDocuments();
        onSelect(remaining[0]?.id || null);
      }
    }
  };

  return (
    <aside className="w-72 shrink-0 border-r border-gray-200 bg-white/80 backdrop-blur-sm h-[calc(100vh-300px)] md:h-[calc(100vh-360px)] overflow-hidden flex flex-col">
      <div className="p-3 border-b border-gray-200">
        <div className="flex gap-2">
          <button onClick={onCreate} className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-gray-900 text-white text-sm hover:bg-gray-800 active:scale-[.99]">
            <Plus size={16} /> New
          </button>
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-2 top-2.5 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search titles..."
              className="w-full pl-8 pr-3 py-2 text-sm rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
          </div>
        </div>
        <div className="mt-3 flex gap-1 text-xs">
          <ScopeButton label="All" active={scope === 'all'} onClick={() => setScope('all')} />
          <ScopeButton label="My Docs" active={scope === 'mine'} onClick={() => setScope('mine')} />
          <ScopeButton label="Public" active={scope === 'public'} onClick={() => setScope('public')} />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-4 text-sm text-gray-500">No documents found.</div>
        ) : (
          <ul className="py-2">
            {filtered.map((d) => (
              <li key={d.id} className={`group px-3 py-2 cursor-pointer select-none ${activeId === d.id ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                  onClick={() => onSelect(d.id)}>
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {d.isPublic ? <Globe size={14} className="text-gray-500" /> : <Lock size={14} className="text-gray-400" />}
                      <span className="truncate font-medium text-gray-900">{d.title || 'Untitled'}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">{new Date(d.updatedAt || Date.now()).toLocaleString()}</div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                    <button onClick={(e) => { e.stopPropagation(); togglePublic(d.id); }} className="text-xs text-gray-600 hover:text-gray-900">
                      {d.isPublic ? 'Make Private' : 'Make Public'}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onRename(d.id); }} className="text-xs text-gray-600 hover:text-gray-900">Rename</button>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(d.id); }} className="text-xs text-red-600 hover:text-red-700">Delete</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="p-3 border-t border-gray-200 text-xs text-gray-500">
        Signed in as <span className="font-medium text-gray-800">{user?.name}</span>
      </div>
    </aside>
  );
}

function ScopeButton({ label, active, onClick }) {
  return (
    <button onClick={onClick} className={`px-2.5 py-1 rounded-md border text-gray-700 ${active ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
      {label}
    </button>
  );
}
