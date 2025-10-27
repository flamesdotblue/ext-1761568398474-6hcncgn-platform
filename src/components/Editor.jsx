import { useEffect, useRef, useState } from 'react';
import { getDocumentById, saveDocument, subscribeDocChannel, sendPresence, initUser } from '../lib/store';
import Facepile from './Facepile';
import { Users, Lock, Globe } from 'lucide-react';

export default function Editor({ user, docId }) {
  const [doc, setDoc] = useState(() => (docId ? getDocumentById(docId) : null));
  const titleRef = useRef(null);
  const bodyRef = useRef(null);
  const ignoreIncoming = useRef(null);

  useEffect(() => {
    setDoc(getDocumentById(docId));
  }, [docId]);

  useEffect(() => {
    if (!docId) return;
    const unsub = subscribeDocChannel(docId, (msg) => {
      if (msg.type === 'content' && msg.userId !== user?.id) {
        // Avoid interfering while typing: if we just sent an update, skip identical echo
        if (ignoreIncoming.current && msg.clientTs === ignoreIncoming.current) return;
        setDoc((prev) => ({ ...(prev || {}), title: msg.title, content: msg.content, updatedAt: msg.updatedAt }));
        if (titleRef.current && document.activeElement !== titleRef.current) {
          titleRef.current.value = msg.title || '';
        }
        if (bodyRef.current && document.activeElement !== bodyRef.current) {
          bodyRef.current.innerHTML = msg.content || '';
        }
      }
    });
    return unsub;
  }, [docId, user]);

  useEffect(() => {
    sendPresence(docId, user || initUser());
  }, [docId, user]);

  const broadcastContent = (next) => {
    ignoreIncoming.current = Date.now();
    saveDocument(docId, next);
  };

  const onTitleInput = (e) => {
    const title = e.target.value;
    const next = { ...(doc || {}), id: docId, title };
    setDoc(next);
    broadcastContent({ title });
  };

  const onBodyInput = (e) => {
    const content = e.currentTarget.innerHTML;
    const next = { ...(doc || {}), id: docId, content };
    setDoc(next);
    broadcastContent({ content });
  };

  return (
    <div className="h-full w-full flex flex-col">
      <header className="flex items-center justify-between px-6 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          {doc?.isPublic ? <Globe size={16} className="text-gray-600" /> : <Lock size={16} className="text-gray-500" />}
          <span>{doc?.isPublic ? 'Public Document' : 'Private Document'}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Users size={16} />
          <Facepile docId={docId} user={user} />
        </div>
      </header>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <input
            ref={titleRef}
            defaultValue={doc?.title || ''}
            onInput={onTitleInput}
            placeholder="Untitled"
            className="w-full text-3xl md:text-4xl font-semibold outline-none placeholder:text-gray-400 bg-transparent"
          />
          <div
            ref={bodyRef}
            onInput={onBodyInput}
            contentEditable
            suppressContentEditableWarning
            className="mt-6 prose prose-neutral max-w-none focus:outline-none min-h-[40vh]"
            dangerouslySetInnerHTML={{ __html: doc?.content || '' }}
          />
        </div>
      </div>
    </div>
  );
}
