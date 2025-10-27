import { useEffect, useMemo, useState } from 'react';
import HeroCover from './components/HeroCover';
import Sidebar from './components/Sidebar';
import Editor from './components/Editor';
import { initUser, ensureSeedDocuments, subscribeDocsIndex, listDocuments, getDocumentById } from './lib/store';

export default function App() {
  const [user, setUser] = useState(null);
  const [docs, setDocs] = useState([]);
  const [activeDocId, setActiveDocId] = useState(null);

  useEffect(() => {
    const u = initUser();
    setUser(u);
    ensureSeedDocuments(u.id);
    setDocs(listDocuments());
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeDocsIndex(() => {
      setDocs(listDocuments());
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!activeDocId) {
      const first = docs[0];
      if (first) setActiveDocId(first.id);
    } else {
      // ensure active doc still exists; otherwise fallback
      const exists = getDocumentById(activeDocId);
      if (!exists) {
        const first = docs[0];
        setActiveDocId(first ? first.id : null);
      }
    }
  }, [docs, activeDocId]);

  const activeDoc = useMemo(() => (activeDocId ? getDocumentById(activeDocId) : null), [activeDocId, docs]);

  return (
    <div className="min-h-screen flex flex-col bg-white text-gray-900">
      <HeroCover />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          user={user}
          docs={docs}
          activeId={activeDocId}
          onSelect={setActiveDocId}
        />
        <main className="flex-1 h-[calc(100vh-300px)] md:h-[calc(100vh-360px)] overflow-hidden">
          {activeDoc ? (
            <Editor user={user} docId={activeDoc.id} />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-gray-500">
              No documents yet. Create one from the sidebar.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
