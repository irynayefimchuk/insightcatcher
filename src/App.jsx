import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2, Circle, ChevronDown, ChevronRight, Play, Pause, RotateCcw, AlertTriangle, Copy, Download, Eye, EyeOff, MessageSquare, Lightbulb, Target, CheckSquare, Square, Timer, FileText, Users, Mic, FolderOpen, Trash2, Save, Loader2, RefreshCw } from 'lucide-react';

// LocalStorage keys
const STORAGE_KEYS = {
  CURRENT_SESSION: 'usability-test-current-session',
  SAVED_SESSIONS: 'usability-test-saved-sessions',
  LAST_PROJECT: 'usability-test-last-project',
};

export default function UsabilityTestRunner() {
  // Config and script loading
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Selection state
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedScriptId, setSelectedScriptId] = useState(null);
  const [script, setScript] = useState(null);
  
  // Session state
  const [currentPhase, setCurrentPhase] = useState('select'); // select, setup, warmup, tasks, wrapup, complete
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [expandedSections, setExpandedSections] = useState({});
  const [taskStatus, setTaskStatus] = useState({});
  const [warmupStatus, setWarmupStatus] = useState({});
  const [wrapupStatus, setWrapupStatus] = useState({});
  const [sessionNotes, setSessionNotes] = useState('');
  const [participantId, setParticipantId] = useState('');
  const [sessionStartTime, setSessionStartTime] = useState(null);
  
  // Timer
  const [timer, setTimer] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerTarget, setTimerTarget] = useState(0);
  
  // UI state
  const [showScript, setShowScript] = useState(true);
  const [savedSessions, setSavedSessions] = useState([]);
  const [showSavedSessions, setShowSavedSessions] = useState(false);

  // Load config on mount
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch('./scripts/config.json');
      if (!response.ok) throw new Error('Failed to load config');
      const data = await response.json();
      setConfig(data);
      
      // Restore last project selection
      const lastProject = localStorage.getItem(STORAGE_KEYS.LAST_PROJECT);
      if (lastProject && data.projects.find(p => p.id === lastProject)) {
        setSelectedProject(lastProject);
      }
      
      // Load saved sessions
      const saved = localStorage.getItem(STORAGE_KEYS.SAVED_SESSIONS);
      if (saved) setSavedSessions(JSON.parse(saved));
      
      // Check for in-progress session
      const currentSession = localStorage.getItem(STORAGE_KEYS.CURRENT_SESSION);
      if (currentSession) {
        const session = JSON.parse(currentSession);
        if (confirm(`Resume in-progress session for "${session.participantId || 'Unknown'}"?`)) {
          await loadSessionFromStorage(session, data);
        } else {
          localStorage.removeItem(STORAGE_KEYS.CURRENT_SESSION);
        }
      }
      
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const loadSessionFromStorage = async (session, configData) => {
    const project = (configData || config).projects.find(p => p.id === session.projectId);
    if (project) {
      setSelectedProject(session.projectId);
      const scriptInfo = project.scripts.find(s => s.id === session.scriptId);
      if (scriptInfo) {
        const scriptData = await loadScript(session.projectId, scriptInfo.file);
        if (scriptData) {
          setScript(scriptData);
          setSelectedScriptId(session.scriptId);
          setParticipantId(session.participantId || '');
          setSessionStartTime(session.sessionStartTime ? new Date(session.sessionStartTime) : null);
          setCurrentPhase(session.currentPhase || 'setup');
          setCurrentTaskIndex(session.currentTaskIndex || 0);
          setTaskStatus(session.taskStatus || {});
          setWarmupStatus(session.warmupStatus || {});
          setWrapupStatus(session.wrapupStatus || {});
          setSessionNotes(session.sessionNotes || '');
        }
      }
    }
  };

  const loadScript = async (projectId, filename) => {
    try {
      const response = await fetch(`./scripts/${projectId}/${filename}`);
      if (!response.ok) throw new Error('Failed to load script');
      return await response.json();
    } catch (err) {
      setError(`Failed to load script: ${err.message}`);
      return null;
    }
  };

  const selectScript = async (projectId, scriptInfo) => {
    setLoading(true);
    const scriptData = await loadScript(projectId, scriptInfo.file);
    if (scriptData) {
      setScript(scriptData);
      setSelectedScriptId(scriptInfo.id);
      setSelectedProject(projectId);
      localStorage.setItem(STORAGE_KEYS.LAST_PROJECT, projectId);
      resetSession();
      setCurrentPhase('setup');
    }
    setLoading(false);
  };

  const resetSession = () => {
    setCurrentTaskIndex(0);
    setTaskStatus({});
    setWarmupStatus({});
    setWrapupStatus({});
    setSessionNotes('');
    setParticipantId('');
    setSessionStartTime(null);
    setTimer(0);
    setTimerRunning(false);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_SESSION);
  };

  // Auto-save current session
  useEffect(() => {
    if (script && currentPhase !== 'select' && currentPhase !== 'complete') {
      const sessionData = {
        projectId: selectedProject,
        scriptId: selectedScriptId,
        participantId,
        sessionStartTime,
        currentPhase,
        currentTaskIndex,
        taskStatus,
        warmupStatus,
        wrapupStatus,
        sessionNotes,
        lastSaved: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEYS.CURRENT_SESSION, JSON.stringify(sessionData));
    }
  }, [currentPhase, currentTaskIndex, taskStatus, warmupStatus, wrapupStatus, sessionNotes, participantId]);

  // Timer logic
  useEffect(() => {
    let interval;
    if (timerRunning) {
      interval = setInterval(() => setTimer(t => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startTimer = (minutes) => {
    setTimer(0);
    setTimerTarget(minutes * 60);
    setTimerRunning(true);
  };

  const toggleSection = (id) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const updateTaskStatus = (taskId, field, value) => {
    setTaskStatus(prev => ({
      ...prev,
      [taskId]: { ...prev[taskId], [field]: value }
    }));
  };

  const startSession = () => {
    setSessionStartTime(new Date());
    setCurrentPhase('warmup');
  };

  const nextPhase = () => {
    if (currentPhase === 'warmup') {
      setCurrentPhase('tasks');
      setCurrentTaskIndex(0);
    } else if (currentPhase === 'tasks') {
      setCurrentPhase('wrapup');
    } else if (currentPhase === 'wrapup') {
      setCurrentPhase('complete');
      localStorage.removeItem(STORAGE_KEYS.CURRENT_SESSION);
      saveCompletedSession();
    }
  };

  const saveCompletedSession = () => {
    const sessionData = {
      id: `${participantId || 'unknown'}-${Date.now()}`,
      projectId: selectedProject,
      projectName: config?.projects.find(p => p.id === selectedProject)?.name,
      scriptId: selectedScriptId,
      scriptTitle: script.title,
      participantId,
      sessionStartTime,
      sessionEndTime: new Date().toISOString(),
      taskStatus,
      warmupStatus,
      wrapupStatus,
      sessionNotes,
    };
    
    const updated = [...savedSessions, sessionData];
    setSavedSessions(updated);
    localStorage.setItem(STORAGE_KEYS.SAVED_SESSIONS, JSON.stringify(updated));
  };

  const deleteSession = (sessionId) => {
    const updated = savedSessions.filter(s => s.id !== sessionId);
    setSavedSessions(updated);
    localStorage.setItem(STORAGE_KEYS.SAVED_SESSIONS, JSON.stringify(updated));
  };

  const nextTask = () => {
    if (currentTaskIndex < script.tasks.length - 1) {
      setCurrentTaskIndex(i => i + 1);
      setTimer(0);
      setTimerRunning(false);
    } else {
      nextPhase();
    }
  };

  const prevTask = () => {
    if (currentTaskIndex > 0) {
      setCurrentTaskIndex(i => i - 1);
      setTimer(0);
      setTimerRunning(false);
    }
  };

  const exportSession = () => {
    const data = {
      projectId: selectedProject,
      scriptId: script.id,
      scriptVersion: script.version,
      participantId,
      sessionStartTime,
      sessionEndTime: new Date(),
      warmupNotes: warmupStatus,
      taskResults: taskStatus,
      wrapupNotes: wrapupStatus,
      generalNotes: sessionNotes
    };
    downloadJson(data, `session-${participantId || 'unknown'}-${new Date().toISOString().split('T')[0]}.json`);
  };

  const exportAllSessions = () => {
    downloadJson(savedSessions, `all-sessions-${new Date().toISOString().split('T')[0]}.json`);
  };

  const downloadJson = (data, filename) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  const copySessionSummary = () => {
    const tasks = script.tasks.map(t => {
      const status = taskStatus[t.id] || {};
      return `${t.id}. ${t.name}: ${status.done ? (status.success ? '✓ Pass' : status.success === false ? '✗ Struggled' : '— Done') : '○ Not done'}${status.notes ? `\n   Notes: ${status.notes}` : ''}`;
    }).join('\n');
    
    const summary = `# Session Summary
Participant: ${participantId || 'Unknown'}
Date: ${sessionStartTime?.toLocaleDateString() || 'N/A'}
Script: ${script.title} v${script.version}

## Task Results
${tasks}

## General Notes
${sessionNotes || 'None'}
`;
    navigator.clipboard.writeText(summary);
  };

  // Loading state
  if (loading && !config) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-blue-400 mx-auto mb-4" size={32} />
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-red-950/50 border border-red-900 rounded-xl p-6 max-w-md text-center">
          <AlertTriangle className="text-red-400 mx-auto mb-4" size={32} />
          <h2 className="text-red-300 font-semibold mb-2">Error Loading</h2>
          <p className="text-slate-400 mb-4">{error}</p>
          <button onClick={loadConfig} className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg flex items-center gap-2 mx-auto">
            <RefreshCw size={16} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Calculate progress
  const completedTasks = script ? Object.values(taskStatus).filter(t => t?.done).length : 0;
  const totalTasks = script?.tasks?.length || 0;
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              {script ? (
                <div>
                  <button 
                    onClick={() => setCurrentPhase('select')}
                    className="text-sm text-slate-500 hover:text-slate-300 mb-1"
                  >
                    ← Change test
                  </button>
                  <h1 className="text-lg font-semibold text-white">{script.title}</h1>
                  <p className="text-sm text-slate-400">{script.subtitle} • v{script.version}</p>
                </div>
              ) : (
                <div>
                  <h1 className="text-lg font-semibold text-white">InsightCatcher</h1>
                  <p className="text-sm text-slate-400">Select a project and test to begin</p>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              {script && currentPhase !== 'select' && (
                <>
                  {/* Timer */}
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono text-lg ${
                    timerTarget && timer > timerTarget ? 'bg-red-500/20 text-red-400' : 'bg-slate-800 text-slate-200'
                  }`}>
                    <Timer size={18} />
                    <span>{formatTime(timer)}</span>
                    {timerTarget > 0 && <span className="text-slate-500">/ {formatTime(timerTarget)}</span>}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setTimerRunning(!timerRunning)} className="p-2 hover:bg-slate-800 rounded-lg">
                      {timerRunning ? <Pause size={18} /> : <Play size={18} />}
                    </button>
                    <button onClick={() => { setTimer(0); setTimerRunning(false); }} className="p-2 hover:bg-slate-800 rounded-lg">
                      <RotateCcw size={18} />
                    </button>
                  </div>
                  
                  {/* Progress */}
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${progress}%` }} />
                    </div>
                    <span className="text-sm text-slate-400">{completedTasks}/{totalTasks}</span>
                  </div>
                </>
              )}
              
              {/* Saved sessions button */}
              <button 
                onClick={() => setShowSavedSessions(true)}
                className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white relative"
              >
                <FolderOpen size={20} />
                {savedSessions.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">
                    {savedSessions.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Project/Script Selection */}
        {currentPhase === 'select' && (
          <SelectPhase 
            config={config}
            selectedProject={selectedProject}
            setSelectedProject={setSelectedProject}
            onSelectScript={selectScript}
            loading={loading}
          />
        )}

        {/* Setup Phase */}
        {currentPhase === 'setup' && script && (
          <SetupPhase 
            script={script} 
            participantId={participantId}
            setParticipantId={setParticipantId}
            onStart={startSession}
          />
        )}

        {/* Warmup Phase */}
        {currentPhase === 'warmup' && script && (
          <WarmupPhase 
            warmup={script.warmup}
            status={warmupStatus}
            setStatus={setWarmupStatus}
            onNext={nextPhase}
            startTimer={startTimer}
          />
        )}

        {/* Tasks Phase */}
        {currentPhase === 'tasks' && script && (
          <TasksPhase
            tasks={script.tasks}
            currentIndex={currentTaskIndex}
            setCurrentIndex={setCurrentTaskIndex}
            status={taskStatus}
            updateStatus={updateTaskStatus}
            showScript={showScript}
            setShowScript={setShowScript}
            onNext={nextTask}
            onPrev={prevTask}
            startTimer={startTimer}
            expandedSections={expandedSections}
            toggleSection={toggleSection}
          />
        )}

        {/* Wrapup Phase */}
        {currentPhase === 'wrapup' && script && (
          <WrapupPhase
            wrapup={script.wrapup}
            observerNotes={script.observerNotes}
            status={wrapupStatus}
            setStatus={setWrapupStatus}
            sessionNotes={sessionNotes}
            setSessionNotes={setSessionNotes}
            onFinish={nextPhase}
          />
        )}

        {/* Complete Phase */}
        {currentPhase === 'complete' && script && (
          <CompletePhase
            script={script}
            taskStatus={taskStatus}
            participantId={participantId}
            sessionStartTime={sessionStartTime}
            onExport={exportSession}
            onCopy={copySessionSummary}
            onNewSession={() => {
              resetSession();
              setCurrentPhase('setup');
            }}
            onChangeTest={() => setCurrentPhase('select')}
          />
        )}
      </main>

      {/* Phase Navigation (only show during active session) */}
      {script && currentPhase !== 'select' && (
        <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur border-t border-slate-800">
          <div className="max-w-5xl mx-auto px-4 py-2">
            <div className="flex justify-center gap-2">
              {['setup', 'warmup', 'tasks', 'wrapup', 'complete'].map((phase) => (
                <button
                  key={phase}
                  onClick={() => setCurrentPhase(phase)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentPhase === phase 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {phase.charAt(0).toUpperCase() + phase.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </nav>
      )}

      {/* Saved Sessions Modal */}
      {showSavedSessions && (
        <SavedSessionsModal
          sessions={savedSessions}
          onClose={() => setShowSavedSessions(false)}
          onDelete={deleteSession}
          onExportAll={exportAllSessions}
        />
      )}
    </div>
  );
}

// Select Phase Component
function SelectPhase({ config, selectedProject, setSelectedProject, onSelectScript, loading }) {
  return (
    <div className="space-y-6 pb-20">
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold text-white mb-2">Select a Test</h2>
        <p className="text-slate-400">Choose a project, then select a test script to run</p>
      </div>

      {/* Project tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {config?.projects.map(project => (
          <button
            key={project.id}
            onClick={() => setSelectedProject(project.id)}
            className={`shrink-0 px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedProject === project.id
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {project.name}
          </button>
        ))}
      </div>

      {/* Scripts for selected project */}
      {selectedProject && (
        <div className="grid gap-4">
          {config?.projects.find(p => p.id === selectedProject)?.scripts.map(scriptInfo => (
            <button
              key={scriptInfo.id}
              onClick={() => onSelectScript(selectedProject, scriptInfo)}
              disabled={loading}
              className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-left hover:border-blue-600 hover:bg-slate-800/50 transition-colors disabled:opacity-50"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">{scriptInfo.name}</h3>
                  <p className="text-sm text-slate-500">{scriptInfo.file}</p>
                </div>
                <ChevronRight className="text-slate-600" size={24} />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Help text */}
      <div className="bg-slate-900/50 rounded-xl p-6 border border-slate-800">
        <h3 className="font-medium text-slate-300 mb-2">How to add a new test</h3>
        <ol className="text-sm text-slate-500 space-y-2">
          <li>1. Create a JSON file in <code className="bg-slate-800 px-1 rounded">public/scripts/[project]/</code></li>
          <li>2. Add it to <code className="bg-slate-800 px-1 rounded">public/scripts/config.json</code></li>
          <li>3. Refresh the page</li>
        </ol>
      </div>
    </div>
  );
}

// Setup Phase Component
function SetupPhase({ script, participantId, setParticipantId, onStart }) {
  return (
    <div className="space-y-6 pb-20">
      <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
        <label className="block text-sm font-medium text-slate-300 mb-2">Participant ID</label>
        <input
          type="text"
          value={participantId}
          onChange={(e) => setParticipantId(e.target.value)}
          placeholder="e.g., P01, SLL-Jane, etc."
          className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
{script.description && (
  <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
    <h2 className="text-lg font-semibold text-white mb-3">About this test</h2>
    <p className="text-slate-300 leading-relaxed">{script.description}</p>
  </div>
)}
      <div className="bg-blue-950/50 rounded-xl p-6 border border-blue-900">
        <div className="flex items-center gap-2 mb-4">
          <Mic className="text-blue-400" size={20} />
          <h2 className="text-lg font-semibold text-blue-300">Say this at the start</h2>
        </div>
        <ul className="space-y-3">
          {script.setup.rules.map((rule, i) => (
            <li key={i} className="flex gap-3">
              <span className="text-blue-400 mt-0.5">→</span>
              <span className="text-slate-200 italic">"{rule}"</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-red-950/30 rounded-xl p-6 border border-red-900/50">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="text-red-400" size={20} />
          <h2 className="text-lg font-semibold text-red-300">No-help policy</h2>
        </div>
        <p className="text-slate-300">{script.setup.noHelpPolicy}</p>
      </div>

      <button
        onClick={onStart}
        className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        <Play size={20} />
        Start Session
      </button>
    </div>
  );
}

// Warmup Phase Component
function WarmupPhase({ warmup, status, setStatus, onNext, startTimer }) {
  useEffect(() => {
    startTimer(warmup.timeMinutes);
  }, []);

  return (
    <div className="space-y-6 pb-20">
      <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="text-amber-400" size={20} />
            <h2 className="text-lg font-semibold">Warm-up Questions</h2>
          </div>
          <span className="text-sm text-slate-400">{warmup.timeMinutes} min</span>
        </div>
        <p className="text-slate-400 mb-2">{warmup.intro}</p>
        <div className="bg-purple-950/30 rounded-lg p-3 border border-purple-900/50">
          <p className="text-sm text-purple-300"><Lightbulb className="inline mr-2" size={14} />{warmup.why}</p>
        </div>
      </div>

      {warmup.questions.map((q, i) => (
        <div key={q.id} className="bg-slate-900 rounded-xl p-6 border border-slate-800">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-semibold text-sm shrink-0">
              {i + 1}
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-amber-300 mb-2">{q.label}</h3>
              <p className="text-slate-200 italic mb-4">"{q.question}"</p>
              <p className="text-sm text-slate-500 mb-3">Listen for: {q.listenFor}</p>
              <textarea
                value={status[q.id]?.notes || ''}
                onChange={(e) => setStatus(prev => ({ ...prev, [q.id]: { notes: e.target.value } }))}
                placeholder="Notes..."
                rows={3}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
              />
            </div>
          </div>
        </div>
      ))}

      <button
        onClick={onNext}
        className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors"
      >
        Continue to Tasks →
      </button>
    </div>
  );
}

// Tasks Phase Component
function TasksPhase({ tasks, currentIndex, setCurrentIndex, status, updateStatus, showScript, setShowScript, onNext, onPrev, startTimer, expandedSections, toggleSection }) {
  const task = tasks[currentIndex];
  const taskStat = status[task.id] || { done: false, success: null, notes: '' };

  useEffect(() => {
    startTimer(task.timeMinutes);
  }, [currentIndex]);

  return (
    <div className="space-y-4 pb-20">
      {/* Task selector */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tasks.map((t, i) => {
          const s = status[t.id] || {};
          return (
            <button
              key={t.id}
              onClick={() => setCurrentIndex(i)}
              className={`shrink-0 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                i === currentIndex 
                  ? 'bg-blue-600 text-white' 
                  : s.done 
                    ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-800' 
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {s.done ? <CheckCircle2 size={14} /> : <Circle size={14} />}
              {t.id}
            </button>
          );
        })}
      </div>

      {/* Current task card */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <div className="bg-blue-950/50 px-6 py-4 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-blue-400 font-mono font-bold">TASK {task.id}</span>
                {task.optional && <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full">Optional</span>}
              </div>
              <h2 className="text-xl font-semibold text-white mt-1">{task.name}</h2>
              <p className="text-slate-400 text-sm">{task.subtitle}</p>
            </div>
            <span className="text-2xl font-mono text-slate-300">{task.timeMinutes}m</span>
          </div>
        </div>

        {/* Script */}
        <div className="px-6 py-4 border-b border-slate-800">
          <button 
            onClick={() => setShowScript(!showScript)}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 mb-3"
          >
            {showScript ? <EyeOff size={14} /> : <Eye size={14} />}
            {showScript ? 'Hide' : 'Show'} script
          </button>
          {showScript && (
            <div className="bg-slate-800 rounded-lg p-4">
              <p className="text-lg text-slate-200 italic leading-relaxed">"{task.script}"</p>
            </div>
          )}
        </div>

        {/* Success */}
        <div className="px-6 py-4 border-b border-slate-800 bg-emerald-950/20">
          <div className="flex items-start gap-3">
            <Target className="text-emerald-400 mt-0.5 shrink-0" size={18} />
            <div>
              <h3 className="font-medium text-emerald-300 mb-1">Success looks like</h3>
              <p className="text-slate-300">{task.success}</p>
            </div>
          </div>
        </div>

        {/* Watch for */}
        <div className="px-6 py-4 border-b border-slate-800">
          <button onClick={() => toggleSection(`watch-${task.id}`)} className="flex items-center justify-between w-full text-left">
            <div className="flex items-center gap-2">
              <Eye className="text-slate-400" size={18} />
              <h3 className="font-medium text-slate-300">Watch for</h3>
            </div>
            {expandedSections[`watch-${task.id}`] ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </button>
          {expandedSections[`watch-${task.id}`] && (
            <ul className="mt-3 space-y-2 pl-6">
              {task.watchFor.map((item, i) => (
                <li key={i} className="text-slate-400 flex gap-2">
                  <span className="text-slate-600">•</span>{item}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Why */}
        <div className="px-6 py-4 border-b border-slate-800 bg-purple-950/20">
          <div className="flex items-start gap-3">
            <Lightbulb className="text-purple-400 mt-0.5 shrink-0" size={18} />
            <div>
              <h3 className="font-medium text-purple-300 mb-1">Why we're asking this</h3>
              <p className="text-slate-400 text-sm">{task.learnWhy}</p>
            </div>
          </div>
        </div>

        {/* Note */}
        {task.note && (
          <div className={`px-6 py-4 border-b border-slate-800 ${task.note.type === 'warning' ? 'bg-amber-950/30' : 'bg-slate-800'}`}>
            <div className="flex items-start gap-3">
              <AlertTriangle className={task.note.type === 'warning' ? 'text-amber-400' : 'text-slate-400'} size={18} />
              <div>
                <h3 className={`font-medium mb-1 ${task.note.type === 'warning' ? 'text-amber-300' : 'text-slate-300'}`}>{task.note.title}</h3>
                <p className="text-slate-400 text-sm">{task.note.content}</p>
              </div>
            </div>
          </div>
        )}

        {/* Notes + actions */}
        <div className="px-6 py-4">
          <textarea
            value={taskStat.notes}
            onChange={(e) => updateStatus(task.id, 'notes', e.target.value)}
            placeholder="Your observations..."
            rows={3}
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none mb-4"
          />
          
          <div className="flex items-center justify-between">
            <div className="flex gap-3">
              <button
                onClick={() => updateStatus(task.id, 'success', taskStat.success === true ? null : true)}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                  taskStat.success === true ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                <CheckCircle2 size={16} />Pass
              </button>
              <button
                onClick={() => updateStatus(task.id, 'success', taskStat.success === false ? null : false)}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                  taskStat.success === false ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                <AlertTriangle size={16} />Struggled
              </button>
            </div>
            <button
              onClick={() => { updateStatus(task.id, 'done', true); onNext(); }}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors"
            >
              {currentIndex < tasks.length - 1 ? 'Next Task →' : 'Finish Tasks →'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <button onClick={onPrev} disabled={currentIndex === 0} className="px-4 py-2 text-slate-400 hover:text-white disabled:opacity-30">
          ← Previous
        </button>
        <button onClick={() => updateStatus(task.id, 'done', !taskStat.done)} className={`px-4 py-2 rounded-lg flex items-center gap-2 ${taskStat.done ? 'text-emerald-400' : 'text-slate-400'}`}>
          {taskStat.done ? <CheckSquare size={16} /> : <Square size={16} />}Mark as done
        </button>
      </div>
    </div>
  );
}

// Wrapup Phase Component
function WrapupPhase({ wrapup, observerNotes, status, setStatus, sessionNotes, setSessionNotes, onFinish }) {
  return (
    <div className="space-y-6 pb-20">
      <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="text-emerald-400" size={20} />
          <h2 className="text-lg font-semibold">Wrap-up Questions</h2>
        </div>
        <p className="text-slate-400">{wrapup.intro}</p>
      </div>

      {wrapup.questions.map((q) => (
        <div key={q.id} className="bg-slate-900 rounded-xl p-6 border border-slate-800">
          <h3 className="font-medium text-emerald-300 mb-2">{q.label}</h3>
          <p className="text-slate-200 italic mb-4">"{q.question}"</p>
          <textarea
            value={status[q.id]?.notes || ''}
            onChange={(e) => setStatus(prev => ({ ...prev, [q.id]: { notes: e.target.value } }))}
            placeholder="Their response..."
            rows={3}
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
          />
        </div>
      ))}

      <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
        <div className="flex items-center gap-2 mb-4">
          <Users className="text-slate-400" size={20} />
          <h2 className="text-lg font-semibold">Observer Reference</h2>
        </div>
        <div className="space-y-3">
          {observerNotes?.map((note, i) => (
            <div key={i} className="flex gap-4 text-sm">
              <span className="text-slate-300 w-1/2">{note.behavior}</span>
              <span className="text-slate-500 w-1/2">→ {note.meaning}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="text-slate-400" size={20} />
          <h2 className="text-lg font-semibold">General Session Notes</h2>
        </div>
        <textarea
          value={sessionNotes}
          onChange={(e) => setSessionNotes(e.target.value)}
          placeholder="Overall impressions, notable quotes..."
          rows={5}
          className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      <button onClick={onFinish} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-colors">
        Complete Session →
      </button>
    </div>
  );
}

// Complete Phase Component
function CompletePhase({ script, taskStatus, participantId, sessionStartTime, onExport, onCopy, onNewSession, onChangeTest }) {
  const passed = Object.values(taskStatus).filter(t => t?.success === true).length;
  const struggled = Object.values(taskStatus).filter(t => t?.success === false).length;
  const done = Object.values(taskStatus).filter(t => t?.done).length;

  return (
    <div className="space-y-6 pb-20">
      <div className="bg-emerald-950/30 rounded-xl p-8 border border-emerald-900 text-center">
        <CheckCircle2 className="mx-auto text-emerald-400 mb-4" size={48} />
        <h2 className="text-2xl font-bold text-emerald-300 mb-2">Session Complete</h2>
        <p className="text-slate-400">Participant: {participantId || 'Unknown'}</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-900 rounded-xl p-6 border border-slate-800 text-center">
          <div className="text-3xl font-bold text-white mb-1">{done}</div>
          <div className="text-sm text-slate-400">Completed</div>
        </div>
        <div className="bg-slate-900 rounded-xl p-6 border border-slate-800 text-center">
          <div className="text-3xl font-bold text-emerald-400 mb-1">{passed}</div>
          <div className="text-sm text-slate-400">Passed</div>
        </div>
        <div className="bg-slate-900 rounded-xl p-6 border border-slate-800 text-center">
          <div className="text-3xl font-bold text-red-400 mb-1">{struggled}</div>
          <div className="text-sm text-slate-400">Struggled</div>
        </div>
      </div>

      <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
        <h3 className="font-semibold mb-4">Task Results</h3>
        <div className="space-y-2">
          {script.tasks.map(t => {
            const s = taskStatus[t.id] || {};
            return (
              <div key={t.id} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
                <div className="flex items-center gap-3">
                  {s.success === true ? <CheckCircle2 className="text-emerald-400" size={16} /> : 
                   s.success === false ? <AlertTriangle className="text-red-400" size={16} /> : 
                   <Circle className="text-slate-600" size={16} />}
                  <span className="text-slate-300">{t.id}. {t.name}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex gap-4">
        <button onClick={onCopy} className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl flex items-center justify-center gap-2">
          <Copy size={18} />Copy Summary
        </button>
        <button onClick={onExport} className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl flex items-center justify-center gap-2">
          <Download size={18} />Export JSON
        </button>
      </div>

      <div className="flex gap-4">
        <button onClick={onNewSession} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl">
          New Session (same test)
        </button>
        <button onClick={onChangeTest} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl">
          Choose Different Test
        </button>
      </div>
    </div>
  );
}

// Saved Sessions Modal
function SavedSessionsModal({ sessions, onClose, onDelete, onExportAll }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-xl border border-slate-700 w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold">Saved Sessions ({sessions.length})</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">×</button>
        </div>
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {sessions.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No saved sessions yet</p>
          ) : (
            <div className="space-y-3">
              {sessions.map(session => (
                <div key={session.id} className="bg-slate-800 rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-white">{session.participantId || 'Unknown'}</p>
                    <p className="text-sm text-slate-400">{session.scriptTitle}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(session.sessionStartTime).toLocaleDateString()} • {session.projectName}
                    </p>
                  </div>
                  <button onClick={() => onDelete(session.id)} className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        {sessions.length > 0 && (
          <div className="p-4 border-t border-slate-700">
            <button onClick={onExportAll} className="w-full py-2 bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center justify-center gap-2">
              <Download size={16} />Export All Sessions
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
