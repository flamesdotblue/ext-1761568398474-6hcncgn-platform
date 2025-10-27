// Lightweight localStorage + BroadcastChannel store to simulate real-time collaboration across tabs

const DOCS_KEY = 'app.docs.v1';
const USER_KEY = 'app.user.v1';

const channels = new Map();

function bc(name) {
  if (!channels.has(name)) {
    channels.set(name, new BroadcastChannel(name));
  }
  return channels.get(name);
}

export function initUser() {
  let user = null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (raw) user = JSON.parse(raw);
  } catch {}
  if (!user) {
    const id = crypto.randomUUID();
    const name = randomUserName();
    user = { id, name };
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
  return user;
}

export function ensureSeedDocuments(ownerId) {
  const docs = listDocuments();
  if (docs.length > 0) return;
  const now = Date.now();
  const seed = [
    {
      id: crypto.randomUUID(),
      title: 'Welcome to Collaborative Notes',
      content: `<p>This is a minimal, Notion-inspired editor.</p><ul><li>Type to edit</li><li>Open another tab to collaborate</li><li>Use the sidebar to manage docs</li></ul>`,
      isPublic: true,
      ownerId,
      updatedAt: now,
    },
    {
      id: crypto.randomUUID(),
      title: 'My Private Draft',
      content: `<p>This document is private to you.</p>`,
      isPublic: false,
      ownerId,
      updatedAt: now,
    },
  ];
  localStorage.setItem(DOCS_KEY, JSON.stringify(seed));
  broadcastDocsIndex();
}

export function listDocuments() {
  try {
    const raw = localStorage.getItem(DOCS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeDocuments(docs) {
  localStorage.setItem(DOCS_KEY, JSON.stringify(docs));
}

export function getDocumentById(id) {
  return listDocuments().find((d) => d.id === id) || null;
}

export function createDocument({ ownerId }) {
  const docs = listDocuments();
  const doc = {
    id: crypto.randomUUID(),
    title: 'Untitled',
    content: '',
    isPublic: false,
    ownerId,
    updatedAt: Date.now(),
  };
  docs.push(doc);
  writeDocuments(docs);
  broadcastDocsIndex();
  return doc;
}

export function renameDocument(id, title) {
  const docs = listDocuments();
  const idx = docs.findIndex((d) => d.id === id);
  if (idx >= 0) {
    docs[idx] = { ...docs[idx], title, updatedAt: Date.now() };
    writeDocuments(docs);
    broadcastDocsIndex();
    broadcastDocContent(id, { title: docs[idx].title, content: docs[idx].content });
  }
}

export function removeDocument(id) {
  const docs = listDocuments().filter((d) => d.id !== id);
  writeDocuments(docs);
  broadcastDocsIndex();
  // Notify doc channel deletion
  const ch = bc(channelName(id));
  ch.postMessage({ type: 'deleted', id });
}

export function togglePublic(id) {
  const docs = listDocuments();
  const idx = docs.findIndex((d) => d.id === id);
  if (idx >= 0) {
    docs[idx] = { ...docs[idx], isPublic: !docs[idx].isPublic, updatedAt: Date.now() };
    writeDocuments(docs);
    broadcastDocsIndex();
  }
}

export function saveDocument(id, patch) {
  const docs = listDocuments();
  const idx = docs.findIndex((d) => d.id === id);
  if (idx >= 0) {
    const next = { ...docs[idx], ...patch, updatedAt: Date.now() };
    docs[idx] = next;
    writeDocuments(docs);
    broadcastDocsIndex();
    broadcastDocContent(id, { title: next.title, content: next.content });
  }
}

function channelName(id) {
  return `doc-${id}`;
}

function presenceChannelName(id) {
  return `presence-${id}`;
}

// Collaboration
export function subscribeDocChannel(id, onMessage) {
  const ch = bc(channelName(id));
  const handler = (ev) => onMessage(ev.data);
  ch.addEventListener('message', handler);
  return () => ch.removeEventListener('message', handler);
}

function broadcastDocContent(id, { title, content }) {
  const ch = bc(channelName(id));
  ch.postMessage({ type: 'content', title, content, updatedAt: Date.now(), clientTs: Date.now(), userId: initUser().id });
}

// Presence
const presenceState = new Map(); // docId -> { userId: { id, name, lastSeen } }

export function subscribePresence(docId, cb) {
  if (!presenceState.has(docId)) presenceState.set(docId, {});
  const ch = bc(presenceChannelName(docId));

  const emit = () => cb({ ...presenceState.get(docId) });

  const handler = (ev) => {
    const msg = ev.data;
    if (msg?.type === 'presence') {
      const map = presenceState.get(docId) || {};
      map[msg.user.id] = { ...msg.user, lastSeen: Date.now() };
      presenceState.set(docId, map);
      emit();
    }
  };
  ch.addEventListener('message', handler);

  const interval = setInterval(() => {
    const map = presenceState.get(docId) || {};
    const now = Date.now();
    let changed = false;
    for (const [uid, entry] of Object.entries(map)) {
      if (now - (entry.lastSeen || 0) > 10000) {
        delete map[uid];
        changed = true;
      }
    }
    if (changed) {
      presenceState.set(docId, map);
      emit();
    }
  }, 3000);

  emit();
  return () => {
    ch.removeEventListener('message', handler);
    clearInterval(interval);
  };
}

export function sendPresence(docId, user) {
  const ch = bc(presenceChannelName(docId));
  ch.postMessage({ type: 'presence', user: { id: user.id, name: user.name } });
}

// Docs index broadcast
export function subscribeDocsIndex(cb) {
  const ch = bc('docs-index');
  const handler = () => cb();
  ch.addEventListener('message', handler);
  return () => ch.removeEventListener('message', handler);
}

function broadcastDocsIndex() {
  const ch = bc('docs-index');
  ch.postMessage({ type: 'docs-updated', ts: Date.now() });
}

// Utils
function randomUserName() {
  const adjectives = ['Calm', 'Brisk', 'Bright', 'Mellow', 'Nimble', 'Quiet', 'Rapid', 'Sage', 'Sunny', 'Witty'];
  const animals = ['Otter', 'Lynx', 'Fox', 'Sparrow', 'Panda', 'Whale', 'Hawk', 'Koala', 'Tiger', 'Zebra'];
  const a = adjectives[Math.floor(Math.random() * adjectives.length)];
  const b = animals[Math.floor(Math.random() * animals.length)];
  return `${a} ${b}`;
}

export function randomColorForId(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash << 5) - hash + id.charCodeAt(i);
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 70% 50%)`;
}
