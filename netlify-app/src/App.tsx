// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, collection, onSnapshot } from 'firebase/firestore';

/**
 * @typedef {Object} CompletedModule
 * @property {string} domainId
 * @property {string} distortion
 * @property {string} mirrorReflection
 * @property {string} actionCommitment
 * @property {string} timestamp
 * @property {boolean} completed
 * @property {string} appVersion
 */

/**
 * @typedef {Object} ReflectionEntry
 * @property {string} distortion
 * @property {string} reflectionText
 * @property {string} timestamp
 * @property {string} appVersion
 */

/**
 * @typedef {Object} DomainSchema
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {string[]} schemaTags
 */

const APP_VERSION = '1.0.0-alpha.3';

const masculineDistortions = [
  {
    distortion: "Emotions = Weakness",
    surfaceSymptom: "Men don't cry; Anger, irritability, substance abuse, reckless behavior",
    rootMechanism: "Emotional shame conditioned by father avoidance + schoolyard ridicule; Societal demand to suppress emotions; Repressed aspects of the masculine psyche",
    schemaTag: "Emotional Suppression Schema, Shame Schema",
    emotionalFunction: "suppression",
    barrierType: "Intergenerational, Cultural",
    breakingTechnique: "Reframe, Ritualize, Reconnect",
    contentPrompt: "POV: You finally let yourself cry after years of 'man up.' What did it feel like? Share your first 'ugly cry' moment & how it changed you. #MenCanCry #EmotionalRelease #HealingMasculinity",
    miniScript: "You mentioned feeling a tightness in your chest when emotions come up. Can you describe that sensation? It's like your body is trying to tell you something, but a part of you learned to silence it. Let's listen to that part. What message does it hold about vulnerability?",
    challengeCallout: "Tell one man something real today.",
    feelItScene: "You’re 9. Dad just called you soft. Your throat closes. You stare at the floor."
  },
  // truncated: other distortions
];

const domains = [
  { id: 'identity', name: 'Identity', description: 'Internalized distortions shaping self-perception.', schemaTags: ['Emotional Suppression Schema', 'Worth-Based-on-Achievement Schema', 'Autonomy/Self-Sufficiency Schema', 'Avoidance Schema', 'Power/Control Schema', 'Gender Role Rigidity Schema', 'Self-Sacrifice Schema'] },
  { id: 'communication', name: 'Communication', description: 'Constraints on emotional expression and help-seeking.', schemaTags: ['Shame Loop', 'Emotional Illiteracy', 'Father Wound', 'Attachment Insecurity Schema', 'Aggression = Power/Control Schema'] },
  { id: 'culture', name: 'Cultural Pressure', description: 'Societal reinforcement of masculine archetypes.', schemaTags: ['Stoic Provider', 'Lone Wolf', 'Hypersexual Alpha', 'Endurance Imperative', 'Emotional restraint'] },
  { id: 'family', name: 'Family Dynamics', description: 'Early interactions shaping masculine identity.', schemaTags: ['Father Wound', 'Attachment Insecurity Schema', 'Competitive-value trap', 'Aggression = Power/Control Schema'] },
  { id: 'economy', name: 'Economic Factors', description: 'Systemic barriers to mental health access.', schemaTags: ['Systemic access trap', 'Provider-value trap', 'Policy trust deficit', 'Intersectional disadvantage trap'] },
];

const getDomainSchemas = (domainId) => {
  const domain = domains.find(d => d.id === domainId);
  if (!domain) return [];

  return masculineDistortions.filter(distortion =>
    domain.schemaTags.some(tag => distortion.schemaTag.includes(tag))
  );
};

const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;

let app, db, auth;
if (firebaseConfig && appId !== 'default-app-id') {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
} else {
  console.error("Firebase configuration or app ID is missing. Application will run in a limited, non-persistent mode.");
}

const saveToLocalStorage = (key, data) => {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) { console.error("Error saving to local storage:", e); }
};

const loadFromLocalStorage = (key) => {
  try { const data = localStorage.getItem(key); return data ? JSON.parse(data) : null; } catch (e) { console.error("Error loading from local storage:", e); return null; }
};

// Placeholder components (full implementation omitted for brevity)
const CageMapHub = () => <div className="p-4">Map Hub</div>;
const InitiationTrack = () => <div className="p-4">Track</div>;
const TranslatorSeries = () => <div className="p-4">Translator</div>;
const InnerArchive = () => <div className="p-4">Archive</div>;

function App() {
  const [currentPage, setCurrentPage] = useState('hub');
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [userId, setUserId] = useState(null);
  const [completedModules, setCompletedModules] = useState([]);
  const [savedReflections, setSavedReflections] = useState([]);

  useEffect(() => {
    if (!firebaseConfig || appId === 'default-app-id') {
      setIsAuthReady(true);
      const localModules = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('completedModule_')) {
          const moduleData = loadFromLocalStorage(key);
          if (moduleData) localModules.push(moduleData);
        }
      }
      setCompletedModules(localModules);
      setSavedReflections(localModules);
      return;
    }

    const signIn = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined') {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Firebase authentication error:", error);
      }
    };

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const currentUserId = user.uid;
        setUserId(currentUserId);
        setIsAuthReady(true);

        const completedModulesColRef = collection(db, `artifacts/${appId}/users/${currentUserId}/completedModules`);
        const unsubscribeModules = onSnapshot(completedModulesColRef, (snapshot) => {
          const modules = snapshot.docs.map(doc => doc.data());
          setCompletedModules(modules);
          setSavedReflections(modules);
        });
        return () => unsubscribeModules();
      } else {
        setUserId(null);
        setIsAuthReady(true);
        setCompletedModules([]);
        setSavedReflections([]);
      }
    });

    signIn();
    return () => unsubscribeAuth();
  }, []);

  if (!isAuthReady) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen">
      {currentPage === 'hub' && <CageMapHub />}
      {currentPage === 'track' && <InitiationTrack />}
      {currentPage === 'translator' && <TranslatorSeries />}
      {currentPage === 'archive' && <InnerArchive />}
    </div>
  );
}

export default App;
