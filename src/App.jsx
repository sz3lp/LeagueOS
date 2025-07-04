import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, collection, onSnapshot } from 'firebase/firestore';

/**
 * @typedef {Object} CompletedModule
 * @property {string} domainId - The ID of the domain this module belongs to (e.g., 'identity').
 * @property {string} distortion - The name of the masculine distortion addressed (e.g., "Emotions = Weakness").
 * @property {string} mirrorReflection - The user's reflection from the Mirror Layer.
 * @property {string} actionCommitment - The user's commitment from the Action Layer.
 * @property {string} timestamp - ISO string of when the module was completed.
 * @property {boolean} completed - True if the module is marked as completed.
 * @property {string} appVersion - The version of the application when the module was saved.
 */

/**
 * @typedef {Object} ReflectionEntry
 * @property {string} distortion - The distortion associated with the reflection.
 * @property {string} reflectionText - The actual text of the reflection.
 * @property {string} timestamp - ISO string of when the reflection was made.
 * @property {string} appVersion - The version of the application when the reflection was saved.
 */

/**
 * @typedef {Object} DomainSchema
 * @property {string} id - Unique ID for the domain.
 * @property {string} name - Display name of the domain.
 * @property {string} description - Short description of the domain.
 * @property {string[]} schemaTags - Array of schema tags relevant to this domain.
 */

// Define the current application version
const APP_VERSION = '1.0.0-alpha.3'; // Updated app version

// Data derived from the provided markdown document
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
  {
    distortion: "Self-Worth = Utility/Performance",
    surfaceSymptom: "Not making enough money; Unemployment; Inability to perform sexually; Pressure to provide",
    rootMechanism: "Provider-value traps; Hegemonic masculinity's emphasis on bread-winning; Economic growth as a high priority",
    schemaTag: "Performance Anxiety Schema, Worth-Based-on-Achievement Schema",
    emotionalFunction: "inflation",
    barrierType: "Economic, Cultural",
    breakingTechnique: "Reframe",
    contentPrompt: "Is your self-worth tied to your paycheck? 💸 Let's talk about the 'provider trap.' What's one non-financial way you find value in yourself? #BeyondTheGrind #MensMentalHealth #RedefineSuccess",
    miniScript: "When you talk about your job loss, there's a deep sense of shame, not just financial worry. It sounds like a part of you believes your worth is your income. Where did that belief start? Can we explore other sources of your value, beyond what you produce?",
    challengeCallout: "Identify one non-financial way you find value in yourself.",
    feelItScene: "You're 28. The layoff email just landed. Your phone feels heavy. You can't meet her eyes."
  },
  {
    distortion: "Asking for Help = Weakness",
    surfaceSymptom: "Reluctance to seek help; Suffering in silence; Avoidant behaviors; Problem minimization",
    rootMechanism: "Traditional norms emphasizing toughness and self-reliance; Stigma about being seen as weak; Discomfort with emotional disclosure",
    schemaTag: "Autonomy/Self-Sufficiency Schema, Stigma Internalization Schema",
    emotionalFunction: "avoidance",
    barrierType: "Cultural, Intergenerational",
    breakingTechnique: "Ritualize, Reconnect",
    contentPrompt: "The 'I got this' myth. 💪 When was the last time you actually *didn't* 'got this' and asked for help? Share a moment where vulnerability was your strength. #AskForHelp #MentalHealthMatters #MenSupportingMen",
    miniScript: "You've been carrying this alone for so long. There's a part of you that sees asking for help as a failure of your independence. What would it mean for that part if you allowed someone else to share the load, even a little?",
    challengeCallout: "Ask for help with one small thing today.",
    feelItScene: "You're 45. The weight is crushing. You see a therapist's number. Your finger hovers, then drops."
  },
  {
    distortion: "Vulnerability = Betrayal/Risk",
    surfaceSymptom: "Shutting off emotional expression; Difficulty accessing/expressing emotions; Cold, detached behaviors; Retreating when emotional intensity rises",
    rootMechanism: "Trauma-related disorders; Unacknowledged pain and fear; Early attachment patterns; Shame blanket applied by society",
    schemaTag: "Avoidance Schema, Attachment Insecurity Schema, Shame/Humiliation Schema",
    emotionalFunction: "avoidance",
    barrierType: "Intergenerational, Cultural",
    breakingTechnique: "Reconnect",
    contentPrompt: "The 'vulnerability hangover' is real. But what if the connection on the other side is worth it? Share a time you risked being vulnerable & it paid off. #RealTalk #DeepConnections #EmotionalCourage",
    miniScript: "That feeling of wanting to retreat when things get emotionally intense... it sounds like a part of you is trying to protect you from potential hurt. What's the worst thing that part fears would happen if you stayed present and open?",
    challengeCallout: "Share one small fear with someone you trust.",
    feelItScene: "You're 32. She asks, 'What are you really feeling?' Your mind goes blank. You change the subject."
  },
  {
    distortion: "Aggression = Power/Control",
    surfaceSymptom: "Aggression, violence, dominance; Anger, irritability, substance abuse, reckless behavior",
    rootMechanism: "Unintegrated shadow aspects; Toxic masculinity enforcing power structures; Societal valorization of brute force and toughness",
    schemaTag: "Power/Control Schema, Unintegrated Shadow Schema",
    emotionalFunction: "inflation",
    barrierType: "Cultural, Intergenerational",
    breakingTechnique: "Reframe",
    contentPrompt: "Beyond the rage: Is anger your only emotion? 😠 Let's unpack what's really underneath. Share a moment you chose calm over chaos. #AngerManagement #EmotionalIntelligence #InnerWork",
    miniScript: "When you feel that surge of anger, what's the very first, subtle feeling that precedes it? Is it frustration? Fear? A sense of powerlessness? The anger is often a protector, shielding something else.",
    challengeCallout: "Identify one trigger for your anger today.",
    feelItScene: "You're 16. Your friend mocks you. Your fists clench. The urge to lash out burns."
  },
  {
    distortion: "Femininity = Inferiority",
    surfaceSymptom: "Being perceived as 'gay' or having feminine traits; Devaluation of women and feminine attributes; Homophobia",
    rootMechanism: "Stigmatization of homosexuality; Rigid, distinct social gender roles; 'Boy Code' dictating one route to masculinity",
    schemaTag: "Gender Role Rigidity Schema, Internalized Homophobia Schema",
    emotionalFunction: "suppression",
    barrierType: "Cultural",
    breakingTechnique: "Reframe",
    contentPrompt: "Breaking the 'boy code': What's one 'feminine' trait you've embraced that made you a better man? (e.g., empathy, nurturing, creativity). #BeyondStereotypes #FluidMasculinity #AuthenticSelf",
    miniScript: "There's a part of you that feels uncomfortable with anything perceived as 'feminine.' Where did that message come from? What would it mean for your identity if you explored qualities like gentleness or compassion?",
    challengeCallout: "Embrace one 'non-masculine' trait today.",
    feelItScene: "You’re 12. You want to draw, but your friends are playing football. You hide your sketchbook."
  },
  {
    distortion: "Pain/Suffering = Normal/Necessary",
    surfaceSymptom: "Prioritizing duty over emotional expression; Enduring suffering silently; Presenting with physical rather than emotional symptoms",
    rootMechanism: "Stoicism, courage, toughness; Archetypal 'Lonely Pillar' or 'Noble Protector'; Lack of appreciation unless sacrificing",
    schemaTag: "Self-Sacrifice Schema, Endurance Imperative Schema",
    emotionalFunction: "suppression",
    barrierType: "Intergenerational, Cultural",
    breakingTechnique: "Reframe",
    contentPrompt: "The 'suffering in silence' badge of honor. Is it really serving you? What's one small act of self-care you'll commit to this week, even if it feels 'unmanly'? #SelfCareForMen #BreakTheCycle #PrioritizeWellbeing",
    miniScript: "You've been taught to push through pain, to be the 'lonely pillar.' What's the cost of carrying that weight alone? What would it feel like to allow yourself to *not* be okay, just for a moment?",
    challengeCallout: "Allow yourself to feel one discomfort today.",
    feelItScene: "You're 50. Your back aches, your mind is tired. You tell everyone, 'I'm fine,' and keep working."
  }
];

/** @type {DomainSchema[]} */
const domains = [
  { id: 'identity', name: 'Identity', description: 'Internalized distortions shaping self-perception.', schemaTags: ['Emotional Suppression Schema', 'Worth-Based-on-Achievement Schema', 'Autonomy/Self-Sufficiency Schema', 'Avoidance Schema', 'Power/Control Schema', 'Gender Role Rigidity Schema', 'Self-Sacrifice Schema'] },
  { id: 'communication', name: 'Communication', description: 'Constraints on emotional expression and help-seeking.', schemaTags: ['Shame Loop', 'Emotional Illiteracy', 'Father Wound', 'Attachment Insecurity Schema', 'Aggression = Power/Control Schema'] },
  { id: 'culture', name: 'Cultural Pressure', description: 'Societal reinforcement of masculine archetypes.', schemaTags: ['Stoic Provider', 'Lone Wolf', 'Hypersexual Alpha', 'Endurance Imperative', 'Emotional restraint'] },
  { id: 'family', name: 'Family Dynamics', description: 'Early interactions shaping masculine identity.', schemaTags: ['Father Wound', 'Attachment Insecurity Schema', 'Competitive-value trap', 'Aggression = Power/Control Schema'] },
  { id: 'economy', name: 'Economic Factors', description: 'Systemic barriers to mental health access.', schemaTags: ['Systemic access trap', 'Provider-value trap', 'Policy trust deficit', 'Intersectional disadvantage trap'] },
];

// Helper to get schema details for a given domain
const getDomainSchemas = (domainId) => {
  const domain = domains.find(d => d.id === domainId);
  if (!domain) return [];

  return masculineDistortions.filter(distortion =>
    domain.schemaTags.some(tag => distortion.schemaTag.includes(tag))
  );
};

// Initialize Firebase (outside components to avoid re-initialization)
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

// Function to save data to local storage
const saveToLocalStorage = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error("Error saving to local storage:", e);
  }
};

// Function to load data from local storage
const loadFromLocalStorage = (key) => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error("Error loading from local storage:", e);
    return null;
  }
};

// Welcome Modal Component
const WelcomeModal = ({ onClose, isDarkMode }) => {
  const textColor = isDarkMode ? 'text-gray-200' : 'text-gray-800';
  const bgColor = isDarkMode ? 'bg-gray-800' : 'bg-white';
  const accentColor = isDarkMode ? 'text-teal-400' : 'text-blue-600';
  const buttonBg = isDarkMode ? 'bg-teal-600 hover:bg-teal-700' : 'bg-blue-600 hover:bg-blue-700';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className={`${bgColor} rounded-xl shadow-2xl p-8 max-w-md text-center`}>
        <h2 className={`text-3xl font-black ${accentColor} mb-4`}>Welcome to The Invisible Cage</h2>
        <p className={`text-lg ${textColor} mb-6`}>
          This journey is private, sacred, and yours alone. It's designed to help you deconstruct ingrained masculine distortions and forge your truth.
        </p>
        <button
          onClick={onClose}
          className={`px-6 py-3 rounded-lg font-semibold text-white ${buttonBg} transition-colors duration-200`}
        >
          Ready to begin?
        </button>
      </div>
    </div>
  );
};

// Component for the main Cage Map Hub
const CageMapHub = ({ onSelectDomain, isDarkMode, userId, completedModules }) => {
  const textColor = isDarkMode ? 'text-gray-200' : 'text-gray-800';
  const bgColor = isDarkMode ? 'bg-gray-900' : 'bg-gray-50';
  const cardBg = isDarkMode ? 'bg-gray-800' : 'bg-white';
  const cardHoverBg = isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100';
  const accentColor = isDarkMode ? 'text-teal-400' : 'text-blue-600';
  const shadow = isDarkMode ? 'shadow-lg shadow-gray-900' : 'shadow-md shadow-gray-300';
  const borderColor = isDarkMode ? 'border-gray-600' : 'border-gray-200';

  const getProgressForDomain = (domainId) => {
    const schemasInDomain = getDomainSchemas(domainId);
    const completedCount = schemasInDomain.filter(schema =>
      completedModules.some(mod => mod.distortion === schema.distortion)
    ).length;
    return `${completedCount}/${schemasInDomain.length}`;
  };

  // Placeholder for adaptive barometer stats logic
  const getBarometerStats = () => {
    const totalModules = masculineDistortions.length;
    const completedCount = completedModules.length;
    const progressRatio = completedCount / totalModules;

    let emotionalLiteracy = "Low";
    let shameLoopPressure = "High";
    let vulnerabilityIndex = "Guarded";

    // Example logic for barometer shifts based on progress
    if (progressRatio > 0.3) {
      emotionalLiteracy = "Developing";
      shameLoopPressure = "Moderate";
    }
    if (progressRatio > 0.6) {
      emotionalLiteracy = "Growing";
      shameLoopPressure = "Lowering";
      vulnerabilityIndex = "Opening";
    }
    if (progressRatio > 0.8) {
      emotionalLiteracy = "High";
      shameLoopPressure = "Minimal";
      vulnerabilityIndex = "Open";
    }

    return { emotionalLiteracy, shameLoopPressure, vulnerabilityIndex };
  };

  const { emotionalLiteracy, shameLoopPressure, vulnerabilityIndex } = getBarometerStats();

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-4 ${bgColor} ${textColor}`}>
      <h1 className={`text-4xl md:text-5xl font-black ${accentColor} mb-8 text-center`}>The Invisible Cage Map</h1>
      <p className={`text-lg text-center mb-12 max-w-2xl ${textColor}`}>
        Navigate the interconnected forces shaping men's mental well-being. Each node represents a domain of influence. Click to begin your Initiation Track.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl">
        {domains.map(domain => (
          <div
            key={domain.id}
            onClick={() => onSelectDomain(domain.id)}
            className={`
              ${cardBg} ${cardHoverBg} ${shadow} rounded-xl p-6 flex flex-col items-center
              cursor-pointer transform transition-transform duration-300 hover:scale-105
              border ${borderColor}
            `}
          >
            <h2 className={`text-2xl font-bold ${accentColor} mb-2 text-center`}>{domain.name}</h2>
            <p className={`text-sm text-center mb-4 ${textColor}`}>{domain.description}</p>
            <div className="w-full text-left mt-auto">
              <h3 className={`text-md font-semibold ${accentColor} mb-2`}>Forged Insights: <span className="font-bold text-yellow-400">{getProgressForDomain(domain.id)}</span></h3>
              <h3 className={`text-md font-semibold ${accentColor} mb-2`}>Barometer Stats:</h3>
              <ul className={`text-sm ${textColor}`}>
                <li>Emotional Literacy: <span className="font-bold text-green-400">{emotionalLiteracy}</span></li>
                <li>Shame Loop Pressure: <span className="font-bold text-red-400">{shameLoopPressure}</span></li>
                <li>Vulnerability Index: <span className="font-bold text-yellow-400">{vulnerabilityIndex}</span></li>
              </ul>
            </div>
          </div>
        ))}
      </div>
      {userId && (
        <p className={`mt-8 text-sm ${textColor}`}>Your User ID: <span className="font-mono">{userId}</span></p>
      )}
    </div>
  );
};

// Component for an Initiation Track (e.g., Identity, Communication)
const InitiationTrack = ({ domainId, onBackToHub, isDarkMode, userId, onModuleComplete, savedReflections }) => {
  const [currentModuleIndex, setCurrentModuleIndex] = useState(0);
  const [interactivePromptResponse, setInteractivePromptResponse] = useState('');
  const [challengeConfirmed, setChallengeConfirmed] = useState(false);
  const [sendToDiscord, setSendToDiscord] = useState(false);
  const domainSchemas = getDomainSchemas(domainId);
  const domain = domains.find(d => d.id === domainId);

  const textColor = isDarkMode ? 'text-gray-200' : 'text-gray-800';
  const bgColor = isDarkMode ? 'bg-gray-900' : 'bg-gray-50';
  const cardBg = isDarkMode ? 'bg-gray-800' : 'bg-white';
  const accentColor = isDarkMode ? 'text-teal-400' : 'text-blue-600';
  const shadow = isDarkMode ? 'shadow-lg shadow-gray-900' : 'shadow-md shadow-gray-300';
  const buttonBg = isDarkMode ? 'bg-teal-600 hover:bg-teal-700' : 'bg-blue-600 hover:bg-blue-700';

  const currentModule = domainSchemas[currentModuleIndex];

  useEffect(() => {
    if (currentModule) {
      const saved = savedReflections.find(
        (r) => r.distortion === currentModule.distortion && r.domainId === domainId
      );
      if (saved) {
        setInteractivePromptResponse(saved.mirrorReflection || '');
        setChallengeConfirmed(!!saved.actionCommitment);
      } else {
        setInteractivePromptResponse('');
        setChallengeConfirmed(false);
      }
    }
  }, [currentModuleIndex, domainId, savedReflections, currentModule]);

  if (!domain) {
    return <div className={`${bgColor} ${textColor} p-8`}>Domain not found.</div>;
  }

  const handleNextModule = async () => {
    const moduleData = {
      domainId: domainId,
      distortion: currentModule.distortion,
      mirrorReflection: interactivePromptResponse,
      actionCommitment: challengeConfirmed ? currentModule.challengeCallout : 'Skipped',
      timestamp: new Date().toISOString(),
      completed: true,
      appVersion: APP_VERSION,
    };

    const localKey = `completedModule_${userId || 'anonymous'}_${moduleData.distortion.replace(/[^a-zA-Z0-9]/g, '_')}`;
    saveToLocalStorage(localKey, moduleData);

    if (userId && db) {
      try {
        const userDocRef = doc(db, `artifacts/${appId}/users/${userId}/completedModules`, moduleData.distortion.replace(/[^a-zA-Z0-9]/g, '_'));
        await setDoc(userDocRef, moduleData, { merge: true });
        onModuleComplete(moduleData);
        console.log('Sound cue: Insight unlocked!');
      } catch (error) {
        console.error("Error saving module data to Firestore:", error);
        alert("Failed to sync progress to cloud. Your progress is saved locally.");
      }
    } else {
      onModuleComplete(moduleData);
      console.log('Sound cue: Insight unlocked! (Local save only)');
    }

    if (sendToDiscord) {
      console.log(`Discord Relay: Sending anonymous insight for "${currentModule.distortion}". Reflection: "${interactivePromptResponse.substring(0, 100)}..."`);
      alert("Insight sent anonymously to the Brotherhood!");
    }

    if (currentModuleIndex < domainSchemas.length - 1) {
      setCurrentModuleIndex(currentModuleIndex + 1);
    } else {
      alert('Track Completed! Unlocking Forged Insight...');
      onBackToHub();
    }
  };

  if (!currentModule) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-8 ${bgColor} ${textColor}`}>
        <h2 className={`text-3xl font-bold ${accentColor} mb-4`}>Initiation Track: {domain.name}</h2>
        <p className={`text-xl text-center ${textColor}`}>All modules completed for this track!</p>
        <button
          onClick={onBackToHub}
          className={`mt-8 px-6 py-3 rounded-lg font-semibold text-white ${buttonBg} transition-colors duration-200`}
        >
          Back to Cage Map
        </button>
      </div>
    );
  }

  const emotionalImpactClass = currentModule.distortion.includes('Emotions = Weakness') ? 'border-red-500 border-2' : '';

  return (
    <div className={`min-h-screen flex flex-col items-center p-8 ${bgColor} ${textColor}`}>
      <button
        onClick={onBackToHub}
        className={`self-start px-4 py-2 rounded-lg font-semibold text-white ${buttonBg} transition-colors duration-200 mb-8`}
      >
        ← Back to Map
      </button>

      <h2 className={`text-3xl md:text-4xl font-black ${accentColor} mb-6 text-center`}>
        {domain.name} Initiation Track: Module {currentModuleIndex + 1}
      </h2>
      <p className={`text-lg text-center mb-10 max-w-3xl ${textColor}`}>
        Deconstructing: <span className="font-bold">{currentModule.distortion}</span>
      </p>

      <div className={`w-full max-w-4xl ${cardBg} ${shadow} rounded-xl p-6 md:p-8 mb-8 ${emotionalImpactClass}`}>
        <h3 className={`text-2xl font-bold ${accentColor} mb-4`}>Feel It: The Scene</h3>
        <audio controls autoPlay loop className="hidden">
          Your browser does not support the audio element.
        </audio>
        <p className="text-md italic mt-4">
          {currentModule.feelItScene}
        </p>

        <h3 className={`text-2xl font-bold ${accentColor} mt-8 mb-4`}>Name It: Schema Revealed</h3>
        <p className={`text-xl font-semibold mb-6 ${textColor}`}>
          This is the <span className="font-bold">{currentModule.distortion}</span> cage.
        </p>

        <h3 className={`text-2xl font-bold ${accentColor} mt-8 mb-4`}>Break It: Your Truth</h3>
        <p className={`text-md mb-2 ${textColor}`}>
          {currentModule.miniScript}
          <br />
          <textarea
            className={`w-full p-3 mt-4 rounded-md ${isDarkMode ? 'bg-gray-700 text-gray-200 border-gray-600' : 'bg-gray-50 text-gray-800 border-gray-300'} border resize-y min-h-[80px]`}
            placeholder="Text or voice option (30s max)..."
            value={interactivePromptResponse}
            onChange={(e) => setInteractivePromptResponse(e.target.value)}
          ></textarea>
        </p>

        <h3 className={`text-2xl font-bold ${accentColor} mt-8 mb-4`}>Carry It: The Challenge</h3>
        <p className={`text-md mb-4 ${textColor}`}>
          {currentModule.challengeCallout}
        </p>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setChallengeConfirmed(true)}
            className={`px-6 py-3 rounded-lg font-semibold text-white ${challengeConfirmed ? 'bg-green-600' : buttonBg} transition-colors duration-200`}
          >
            {challengeConfirmed ? 'Confirmed' : 'Confirm Challenge'}
          </button>
          <button
            onClick={() => setChallengeConfirmed(false)}
            className={`px-6 py-3 rounded-lg font-semibold text-white ${isDarkMode ? 'bg-gray-600 hover:bg-gray-700' : 'bg-gray-300 hover:bg-gray-400'} transition-colors duration-200`}
          >
            Skip
          </button>
        </div>
        <div className="flex items-center mt-4">
          <input
            type="checkbox"
            id="discordRelay"
            className="form-checkbox h-5 w-5 text-teal-600"
            checked={sendToDiscord}
            onChange={(e) => setSendToDiscord(e.target.checked)}
          />
          <label htmlFor="discordRelay" className={`ml-2 text-sm ${textColor}`}>
            Send this insight anonymously to the Brotherhood for shared reflection.
          </label>
        </div>
      </div>

      <button
        onClick={handleNextModule}
        className={`px-8 py-4 rounded-lg font-bold text-white text-xl ${buttonBg} transition-colors duration-200`}
      >
        {currentModuleIndex < domainSchemas.length - 1 ? 'Next Module →' : 'Complete Track'}
      </button>
    </div>
  );
};

// Component for The Translator Series
const TranslatorSeries = ({ onBackToHub, isDarkMode }) => {
  const [currentSessionIndex, setCurrentSessionIndex] = useState(0);
  const [revealedParts, setRevealedParts] = useState({});

  const textColor = isDarkMode ? 'text-gray-200' : 'text-gray-800';
  const bgColor = isDarkMode ? 'bg-gray-900' : 'bg-gray-50';
  const cardBg = isDarkMode ? 'bg-gray-800' : 'bg-white';
  const accentColor = isDarkMode ? 'text-teal-400' : 'text-blue-600';
  const shadow = isDarkMode ? 'shadow-lg shadow-gray-900' : 'shadow-md shadow-gray-300';
  const buttonBg = isDarkMode ? 'bg-teal-600 hover:bg-teal-700' : 'bg-blue-600 hover:bg-blue-700';

  const sessions = masculineDistortions.map(d => ({
    title: `Session: Deconstructing "${d.distortion}"`,
    script: d.miniScript,
    schema: d.schemaTag
  }));

  const currentSession = sessions[currentSessionIndex];

  const toggleReveal = (index) => {
    setRevealedParts(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const handleNextSession = () => {
    setRevealedParts({});
    if (currentSessionIndex < sessions.length - 1) {
      setCurrentSessionIndex(currentSessionIndex + 1);
    } else {
      alert('Translator Series Completed!');
      onBackToHub();
    }
  };

  return (
    <div className={`min-h-screen flex flex-col items-center p-8 ${bgColor} ${textColor}`}>
      <button
        onClick={onBackToHub}
        className={`self-start px-4 py-2 rounded-lg font-semibold text-white ${buttonBg} transition-colors duration-200 mb-8`}
      >
        ← Back to Map
      </button>

      <h2 className={`text-3xl md:text-4xl font-black ${accentColor} mb-6 text-center`}>
        The Translator Series
      </h2>
      <p className={`text-lg text-center mb-10 max-w-3xl ${textColor}`}>
        Session {currentSessionIndex + 1} of {sessions.length}: {currentSession.title}
      </p>

      <div className={`w-full max-w-3xl ${cardBg} ${shadow} rounded-xl p-6 md:p-8 mb-8`}>
        <p className={`text-lg mb-4 ${textColor}`}>
          <span className="font-bold">Focus Schema:</span> <span className="font-semibold">{currentSession.schema}</span>
        </p>
        <div className="space-y-4">
          {currentSession.script.split('. ').map((part, index) => (
            <div key={index} className="flex items-start">
              <span className={`mr-2 ${accentColor} font-bold text-xl`}>•</span>
              <p
                className={`text-md cursor-pointer ${textColor} ${revealedParts[index] ? '' : 'opacity-40 blur-sm'}`}
                onClick={() => toggleReveal(index)}
              >
                {part.trim()}.
              </p>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={handleNextSession}
        className={`px-8 py-4 rounded-lg font-bold text-white text-xl ${buttonBg} transition-colors duration-200`}
      >
        {currentSessionIndex < sessions.length - 1 ? 'Next Session →' : 'Complete Series'}
      </button>
    </div>
  );
};

// Component for the Inner Archive (Basic Scaffold)
const InnerArchive = ({ onBackToHub, isDarkMode, completedModules }) => {
  const textColor = isDarkMode ? 'text-gray-200' : 'text-gray-800';
  const bgColor = isDarkMode ? 'bg-gray-900' : 'bg-gray-50';
  const cardBg = isDarkMode ? 'bg-gray-800' : 'bg-white';
  const accentColor = isDarkMode ? 'text-teal-400' : 'text-blue-600';
  const shadow = isDarkMode ? 'shadow-lg shadow-gray-900' : 'shadow-md shadow-gray-300';
  const buttonBg = isDarkMode ? 'bg-teal-600 hover:bg-teal-700' : 'bg-blue-600 hover:bg-blue-700';

  const [filterDomain, setFilterDomain] = useState('all');
  const [filterSchemaTag, setFilterSchemaTag] = useState('all');
  const [aiSummary, setAiSummary] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);

  const filteredModules = completedModules.filter(module => {
    const matchesDomain = filterDomain === 'all' || module.domainId === filterDomain;
    const matchesSchema = filterSchemaTag === 'all' || module.schemaTag.includes(filterSchemaTag);
    return matchesDomain && matchesSchema;
  });

  const generateSummary = async () => {
    setIsSummarizing(true);
    setAiSummary('Synthesizing insights... this may take a moment.');

    const allReflections = completedModules.map(m => m.mirrorReflection).filter(Boolean).join('\n');

    if (!allReflections) {
      setAiSummary('No reflections recorded yet to synthesize. Complete some modules first!');
      setIsSummarizing(false);
      return;
    }

    setTimeout(() => {
      const mockSummary = `Based on your ${completedModules.length} reflections, a recurring pattern emerges around ${completedModules.length > 0 ? completedModules[0].emotionalFunction : 'emotional processing'}. You tend to navigate challenges by ${completedModules.length > 0 ? completedModules[0].breakingTechnique : 'adapting your approach'}. Consider exploring more about the 'Emotional Suppression Schema' as it appears frequently in your insights.`;
      setAiSummary(mockSummary);
      setIsSummarizing(false);
    }, 3000);
  };

  const exportData = () => {
    const dataStr = JSON.stringify(completedModules, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'invisible_cage_insights.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    alert("Your insights have been exported as a JSON file.");
  };

  return (
    <div className={`min-h-screen flex flex-col items-center p-8 ${bgColor} ${textColor}`}>
      <button
        onClick={onBackToHub}
        className={`self-start px-4 py-2 rounded-lg font-semibold text-white ${buttonBg} transition-colors duration-200 mb-8`}
      >
        ← Back to Map
      </button>

      <h2 className={`text-3xl md:text-4xl font-black ${accentColor} mb-6 text-center`}>
        Inner Archive: Forged Insights
      </h2>
      <p className={`text-lg text-center mb-10 max-w-3xl ${textColor}`}>
        Your journey of liberation. Here you'll find your saved insights and completed tasks.
      </p>

      <div className={`w-full max-w-4xl ${cardBg} ${shadow} rounded-xl p-6 md:p-8 mb-8`}>
        <h3 className={`text-2xl font-bold ${accentColor} mb-4`}>Forged Insights ({completedModules.length}/{masculineDistortions.length})</h3>

        <div className="flex flex-wrap gap-4 mb-6">
          <select
            className={`p-2 rounded-md ${isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-800'}`}
            value={filterDomain}
            onChange={(e) => setFilterDomain(e.target.value)}
          >
            <option value="all">All Domains</option>
            {domains.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <select
            className={`p-2 rounded-md ${isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-800'}`}
            value={filterSchemaTag}
            onChange={(e) => setFilterSchemaTag(e.target.value)}
          >
            <option value="all">All Schemas</option>
            {[...new Set(masculineDistortions.flatMap(d => d.schemaTag.split(', ').map(s => s.trim())))].map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
          <button
            onClick={generateSummary}
            disabled={isSummarizing}
            className={`px-4 py-2 rounded-lg font-semibold text-white ${buttonBg} transition-colors duration-200 ${isSummarizing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isSummarizing ? 'Synthesizing...' : 'Show me where I’m stuck (AI)'}
          </button>
          <button
            onClick={exportData}
            className={`px-4 py-2 rounded-lg font-semibold text-white ${buttonBg} transition-colors duration-200`}
          >
            Export Insights
          </button>
        </div>

        {aiSummary && (
          <div className={`p-4 rounded-lg mb-6 ${isDarkMode ? 'bg-gray-700' : 'bg-blue-50'} ${textColor}`}>
            <h4 className="font-bold mb-2">AI Summary:</h4>
            <p>{aiSummary}</p>
          </div>
        )}

        {filteredModules.length === 0 ? (
          <p className={`${textColor}`}>No forged insights match your filters. Start an Initiation Track!</p>
        ) : (
          <ul className="space-y-4">
            {filteredModules.map((module, index) => (
              <li key={index} className="border-b border-gray-700 pb-4 last:border-b-0">
                <p className="font-semibold text-lg text-white">{module.distortion}</p>
                <p className="text-sm text-gray-400">Domain: {domains.find(d => d.id === module.domainId)?.name}</p>
                <p className="text-sm text-gray-300 mt-2">
                  <span className="font-bold">Your Reflection:</span> {module.mirrorReflection || 'N/A'}
                </p>
                <p className="text-sm text-gray-300">
                  <span className="font-bold">Your Commitment:</span> {module.actionCommitment || 'N/A'}
                </p>
                <p className="text-xs text-gray-500 mt-1">Completed: {new Date(module.timestamp).toLocaleDateString()} (v{module.appVersion || 'N/A'})</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

function App() {
  const [currentPage, setCurrentPage] = useState('hub');
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [completedModules, setCompletedModules] = useState([]);
  const [savedReflections, setSavedReflections] = useState([]);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [firebaseError, setFirebaseError] = useState(false);

  useEffect(() => {
    if (!firebaseConfig || appId === 'default-app-id') {
      setFirebaseError(true);
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
      if (localModules.length === 0) {
        setShowWelcomeModal(true);
      }
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
        setFirebaseError(true);
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
          if (modules.length === 0) {
            setShowWelcomeModal(true);
          }
        }, (error) => {
          console.error("Error listening to completed modules:", error);
          setFirebaseError(true);
        });

        return () => unsubscribeModules();
      } else {
        setUserId(null);
        setIsAuthReady(true);
        setCompletedModules([]);
        setSavedReflections([]);
        setShowWelcomeModal(true);
      }
    });

    signIn();
    return () => unsubscribeAuth();
  }, []);

  const handleSelectDomain = (domainId) => {
    setSelectedDomain(domainId);
    setCurrentPage('track');
  };

  const handleBackToHub = () => {
    setCurrentPage('hub');
    setSelectedDomain(null);
  };

  const handleModuleComplete = (moduleData) => {
    setCompletedModules(prev => {
      const existingIndex = prev.findIndex(m => m.distortion === moduleData.distortion);
      if (existingIndex > -1) {
        const newModules = [...prev];
        newModules[existingIndex] = moduleData;
        return newModules;
      }
      return [...prev, moduleData];
    });
    setSavedReflections(prev => {
      const existingIndex = prev.findIndex(r => r.distortion === moduleData.distortion);
      if (existingIndex > -1) {
        const newReflections = [...prev];
        newReflections[existingIndex] = moduleData;
        return newReflections;
      }
      return [...prev, moduleData];
    });
  };

  const toggleDarkMode = () => {
    setIsDarkMode(prevMode => !prevMode);
  };

  const textColor = isDarkMode ? 'text-gray-200' : 'text-gray-800';
  const bgColor = isDarkMode ? 'bg-gray-900' : 'bg-gray-50';
  const buttonBg = isDarkMode ? 'bg-teal-600 hover:bg-teal-700' : 'bg-blue-600 hover:bg-blue-700';

  if (!isAuthReady) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${bgColor} ${textColor}`}>
        <p className="text-xl">Loading application...</p>
      </div>
    );
  }

  if (firebaseError && userId === null) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center ${bgColor} ${textColor} p-4 text-center`}>
        <h1 className="text-3xl font-bold text-red-500 mb-4">Application Error</h1>
        <p className="text-lg mb-4">Firebase configuration or app ID is missing, or there was an authentication error.</p>
        <p className="text-md">The application will run in a limited, non-persistent mode. Your progress might not be saved to the cloud, but local storage will be used as a fallback.</p>
        <button
          onClick={() => setFirebaseError(false)}
          className={`mt-6 px-6 py-3 rounded-lg font-semibold text-white ${buttonBg} transition-colors duration-200`}
        >
          Continue to Application
        </button>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bgColor} ${textColor} transition-colors duration-300`}>
      {showWelcomeModal && completedModules.length === 0 && (
        <WelcomeModal onClose={() => setShowWelcomeModal(false)} isDarkMode={isDarkMode} />
      )}

      <div className="absolute top-4 right-4 z-50">
        <button
          onClick={toggleDarkMode}
          className={`px-4 py-2 rounded-full text-sm font-semibold ${buttonBg} text-white shadow-md`}
        >
          {isDarkMode ? 'Light Mode' : 'Dark Mode'}
        </button>
      </div>

      {currentPage === 'hub' && (
        <CageMapHub
          onSelectDomain={handleSelectDomain}
          isDarkMode={isDarkMode}
          userId={userId}
          completedModules={completedModules}
        />
      )}
      {currentPage === 'track' && selectedDomain && (
        <InitiationTrack
          domainId={selectedDomain}
          onBackToHub={handleBackToHub}
          isDarkMode={isDarkMode}
          userId={userId}
          onModuleComplete={handleModuleComplete}
          savedReflections={savedReflections}
        />
      )}
      {currentPage === 'translator' && (
        <TranslatorSeries onBackToHub={handleBackToHub} isDarkMode={isDarkMode} />
      )}
      {currentPage === 'archive' && (
        <InnerArchive
          onBackToHub={handleBackToHub}
          isDarkMode={isDarkMode}
          completedModules={completedModules}
        />
      )}

      {currentPage === 'hub' && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-4">
          <button
            onClick={() => setCurrentPage('translator')}
            className={`px-6 py-3 rounded-lg font-semibold text-white ${buttonBg} transition-colors duration-200 shadow-lg`}
          >
            Explore The Translator Series
          </button>
          <button
            onClick={() => setCurrentPage('archive')}
            className={`px-6 py-3 rounded-lg font-semibold text-white ${buttonBg} transition-colors duration-200 shadow-lg`}
          >
            Inner Archive
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
