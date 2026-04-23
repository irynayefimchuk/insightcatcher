import React, { useState, useEffect } from 'react';
import { CheckCircle2, Play, Pause, RotateCcw, AlertTriangle, Copy, Download, Eye, EyeOff, MessageSquare, Lightbulb, Target, CheckSquare, Square, Timer, FileText, Users, Mic, FolderOpen, Trash2, Loader2, RefreshCw, Home, FlaskConical, Search, X, Info, ChevronDown, ChevronRight, LogOut } from 'lucide-react';
import { supabase, signOut, onAuthStateChange } from './supabase';
import Login from './Login';

const t = {
  canvasBg:     '#E9EEF3',
  cardBg:       '#FFFFFF',
  subtleBg:     'rgba(233,238,243,0.7)',
  hoverBg:      '#E1EDFA',
  brand:        '#005CB7',
  textMain:     '#022212',
  textSub:      '#5E676F',
  textDetail:   '#708090',
  textDisabled: '#D7DDE4',
  textHeader:   '#003D66',
  strokeDefault:'#E0E3E6',
  strokeLight:  '#E9EEF3',
  strokeStrong: '#C0C5CC',
  positive:     '#068252',
  nearPositive: '#C1E8D9',
  negative:     '#C3231D',
  nearNegative: '#FAD8D7',
  warning:      '#F9C400',
  formStroke:   '#C0C5CC',
};

const TAGS = [
  { id: 'confused',   label: '😕 Confused',       bg: '#FAD8D7', color: '#C3231D' },
  { id: 'missed',     label: '👻 Missed it',       bg: '#FEF3C7', color: '#92400E' },
  { id: 'workaround', label: '🔧 Workaround',      bg: '#FEF9C3', color: '#854D0E' },
  { id: 'surprised',  label: '😮 Surprised',       bg: '#E1EDFA', color: '#005CB7' },
  { id: 'strong',     label: '💬 Strong reaction', bg: '#EDE9FE', color: '#5B21B6' },
  { id: 'quit',       label: '🛑 Gave up',         bg: '#F1F3F5', color: '#5E676F' },
];

const MOMS_TEST_DOS = [
  '"Tell me more about that..."',
  '"Walk me through how you do that today."',
  '"When was the last time you did this?"',
  '"What did you expect to happen?"',
  'Listen — silence is okay, let them fill it',
  'Ask about the past, not the future',
];

const MOMS_TEST_DONTS = [
  '"Would you use this?" — hypothetical',
  '"Did you like it?" — approval-seeking',
  '"What if we added X?" — pitching',
  '"Don\'t you think Y would help?" — leading',
  'Explaining what things do',
  'Defending your design choices',
];

const PHASES = ['setup', 'warmup', 'tasks', 'wrapup'];
const PHASE_LABELS = { setup: 'Setup', warmup: 'Warm-up', tasks: 'Tasks', wrapup: 'Wrap-up' };

const Card = ({ children, style }) => (
  <div style={{ background: t.cardBg, border: `1px solid ${t.strokeDefault}`, borderRadius: 10, ...style }}>
    {children}
  </div>
);

const Input = ({ value, onChange, placeholder, rows }) => (
  rows
    ? <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows}
        style={{ width: '100%', background: t.cardBg, border: `1px solid ${t.formStroke}`, borderRadius: 6,
          padding: '10px 14px', fontSize: 14, color: t.textMain, outline: 'none', fontFamily: 'inherit',
          resize: 'none', lineHeight: 1.5 }} />
    : <input value={value} onChange={onChange} placeholder={placeholder}
        style={{ width: '100%', background: t.cardBg, border: `1px solid ${t.formStroke}`, borderRadius: 6,
          padding: '10px 14px', fontSize: 14, color: t.textMain, outline: 'none', fontFamily: 'inherit' }} />
);

const Btn = ({ onClick, disabled, children, variant = 'default', style }) => {
  const styles = {
    primary: { background: t.brand,    color: '#fff', border: 'none' },
    cta:     { background: t.positive, color: '#fff', border: 'none' },
    ghost:   { background: 'transparent', color: t.textSub, border: `1px solid ${t.strokeDefault}` },
    default: { background: t.subtleBg, color: t.textMain, border: `1px solid ${t.strokeDefault}` },
  };
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ ...styles[variant], borderRadius: 6, padding: '9px 18px', fontSize: 14, fontWeight: 500,
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1,
        display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', fontFamily: 'inherit', ...style }}>
      {children}
    </button>
  );
};

function Stepper({ currentPhase, onPhaseClick }) {
  const currentIdx = PHASES.indexOf(currentPhase);
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {PHASES.map((phase, i) => {
        const isDone = i < currentIdx;
        const isActive = i === currentIdx;
        const isLast = i === PHASES.length - 1;
        return (
          <React.Fragment key={phase}>
            <button onClick={() => onPhaseClick(phase)}
              style={{ display: 'flex', alignItems: 'center', gap: 7, background: isActive ? t.hoverBg : 'transparent',
                border: 'none', cursor: 'pointer', padding: '4px 10px', borderRadius: 6, fontFamily: 'inherit' }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0,
                background: isDone ? t.positive : isActive ? t.brand : 'transparent',
                color: isDone || isActive ? '#fff' : t.textDisabled,
                border: isDone || isActive ? 'none' : `2px solid ${t.strokeStrong}` }}>
                {isDone ? '✓' : i + 1}
              </div>
              <span style={{ fontSize: 13, fontWeight: isActive ? 600 : 400,
                color: isDone ? t.positive : isActive ? t.brand : t.textDetail, whiteSpace: 'nowrap' }}>
                {PHASE_LABELS[phase]}
              </span>
            </button>
            {!isLast && <div style={{ width: 20, height: 2, background: isDone ? t.positive : t.strokeDefault, flexShrink: 0 }} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default function InsightCatcher() {
  const [authenticated, setAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedScriptId, setSelectedScriptId] = useState(null);
  const [script, setScript] = useState(null);
  const [currentPhase, setCurrentPhase] = useState('select');
  const [scriptTypeFilter, setScriptTypeFilter] = useState('all');
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [expandedSections, setExpandedSections] = useState({});
  const [taskStatus, setTaskStatus] = useState({});
  const [warmupStatus, setWarmupStatus] = useState({});
  const [wrapupStatus, setWrapupStatus] = useState({});
  const [sessionNotes, setSessionNotes] = useState('');
  const [participantId, setParticipantId] = useState('');
  const [runnerName, setRunnerName] = useState('');
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [timer, setTimer] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerTarget, setTimerTarget] = useState(0);
  const [showScript, setShowScript] = useState(true);
  const [savedSessions, setSavedSessions] = useState([]);
  const [showSavedSessions, setShowSavedSessions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  // Check auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setAuthenticated(!!session);
      } catch (err) {
        console.error('Auth check failed:', err);
      } finally {
        setAuthLoading(false);
      }
    };
    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = onAuthStateChange((event, session) => {
      setAuthenticated(!!session);
    });

    return () => subscription?.unsubscribe();
  }, []);

  useEffect(() => { loadConfig(); }, []);
  useEffect(() => { if (config) loadSavedSessions(); }, [config]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const res = await fetch('./scripts/config.json');
      if (!res.ok) throw new Error('Failed to load config');
      const data = await res.json();
      setConfig(data);
      const last = localStorage.getItem('insightcatcher-last-project');
      if (last && data.projects.find(p => p.id === last)) setSelectedProject(last);
      setLoading(false);
    } catch (err) { setError(err.message); setLoading(false); }
  };

  const loadSavedSessions = async () => {
    try {
      const { data } = await supabase.from('sessions').select('*').order('created_at', { ascending: false });
      setSavedSessions(data || []);
    } catch (err) { console.error(err); }
  };

  const loadScript = async (projectId, filename) => {
    try {
      const res = await fetch(`./scripts/${projectId}/${filename}`);
      if (!res.ok) throw new Error('Failed to load script');
      return await res.json();
    } catch (err) { setError(err.message); return null; }
  };

  const selectScript = async (projectId, scriptInfo) => {
    setLoading(true);
    const data = await loadScript(projectId, scriptInfo.file);
    if (data) {
      setScript(data); setSelectedScriptId(scriptInfo.id); setSelectedProject(projectId);
      localStorage.setItem('insightcatcher-last-project', projectId);
      resetSession(); setCurrentPhase('setup');
    }
    setLoading(false);
  };

  const resetSession = () => {
    setCurrentTaskIndex(0); setTaskStatus({}); setWarmupStatus({}); setWrapupStatus({});
    setSessionNotes(''); setParticipantId(''); setSessionStartTime(null);
    setTimer(0); setTimerRunning(false); setShowCompleteModal(false);
  };

  useEffect(() => {
    let iv;
    if (timerRunning) iv = setInterval(() => setTimer(s => s + 1), 1000);
    return () => clearInterval(iv);
  }, [timerRunning]);

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const startTimer = (mins) => { setTimer(0); setTimerTarget(mins * 60); setTimerRunning(true); };
  const stopTimer = () => setTimerRunning(false);
  const toggleSection = (id) => setExpandedSections(p => ({ ...p, [id]: !p[id] }));
  const updateTaskStatus = (taskId, field, value) =>
    setTaskStatus(p => ({ ...p, [taskId]: { ...p[taskId], [field]: value } }));
  const startSession = () => { setSessionStartTime(new Date()); setCurrentPhase('warmup'); };

  const nextPhase = () => {
    if (currentPhase === 'warmup') { setCurrentPhase('tasks'); setCurrentTaskIndex(0); }
    else if (currentPhase === 'tasks') setCurrentPhase('wrapup');
    else if (currentPhase === 'wrapup') saveCompletedSession();
  };

  const saveCompletedSession = async () => {
    stopTimer();
    setSaving(true); setCurrentPhase('complete'); setShowCompleteModal(true);
    try {
      const sessionData = {
        id: `sess_${Date.now()}`,
        project_id: selectedProject,
        project_name: config?.projects.find(p => p.id === selectedProject)?.name,
        script_id: selectedScriptId, script_title: script.title,
        script_type: script.type || 'usability',
        participant_id: participantId, runner_name: runnerName,
        session_start_time: sessionStartTime, session_end_time: new Date(),
        task_status: taskStatus, warmup_status: warmupStatus,
        wrapup_status: wrapupStatus, session_notes: sessionNotes, tags: {},
      };
      
      let savedSuccessfully = false;
      let saveLocation = '';
      
      // Try SharePoint first
      try {
        const response = await fetch('/api/save-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session: sessionData }),
        });

        if (response.ok) {
          console.log('Session saved to SharePoint');
          savedSuccessfully = true;
          saveLocation = 'SharePoint';
        } else {
          throw new Error('SharePoint save failed');
        }
      } catch (err) {
        console.warn('SharePoint save failed, falling back to Supabase:', err.message);
        // Fall back to Supabase
        await supabase.from('sessions').insert([sessionData]);
        console.log('Session saved to Supabase (fallback)');
        savedSuccessfully = true;
        saveLocation = 'Supabase';
      }
      
      if (savedSuccessfully) {
        console.log(`Session successfully saved to ${saveLocation}`);
        await loadSavedSessions();
      }
    } catch (err) { console.error('Error saving session:', err); alert('Failed to save session: ' + err.message); }
    setSaving(false);
  };

  const downloadSession = () => {
    const sessionData = {
      project_id: selectedProject,
      project_name: config?.projects.find(p => p.id === selectedProject)?.name,
      script_id: selectedScriptId,
      script_title: script.title,
      script_type: script.type || 'usability',
      participant_id: participantId,
      runner_name: runnerName,
      session_start_time: sessionStartTime,
      session_end_time: new Date(),
      task_status: taskStatus,
      warmup_status: warmupStatus,
      wrapup_status: wrapupStatus,
      session_notes: sessionNotes,
      tags: {}
    };
    
    const dataStr = JSON.stringify(sessionData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `session_${participantId || 'unnamed'}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const deleteSession = async (id) => {
    await supabase.from('sessions').delete().eq('id', id);
    setSavedSessions(p => p.filter(s => s.id !== id));
  };

  const nextTask = () => {
    if (currentTaskIndex < script.tasks.length - 1) {
      setCurrentTaskIndex(i => i + 1); setTimer(0); setTimerRunning(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else nextPhase();
  };

  const prevTask = () => {
    if (currentTaskIndex > 0) { setCurrentTaskIndex(i => i - 1); setTimer(0); setTimerRunning(false); }
  };

  const exportMarkdown = () => {
    const tasks = script.tasks.map(tk => {
      const s = taskStatus[tk.id] || {};
      const result = s.completion === 'completed' ? '✅ Completed' : s.completion === 'partial' ? '⚠️ Partially completed' : s.completion === 'failed' ? '❌ Could not complete' : '— Not scored';
      const tags = s.tags?.length ? `\n**Tags:** ${s.tags.join(', ')}` : '';
      return `### Task ${tk.id}: ${tk.name}\n**Result:** ${result}${tags}\n**Notes:** ${s.notes || 'None'}`;
    }).join('\n\n');
    const wrapupAnswers = script.wrapup?.questions?.map(q =>
      `**${q.label}:** ${wrapupStatus[q.id]?.notes || 'No response'}`).join('\n\n') || '';
    const md = `# ${script.title}\n**Participant:** ${participantId || 'Unknown'}\n**Run by:** ${runnerName || 'Unknown'}\n**Date:** ${sessionStartTime?.toLocaleDateString() || 'N/A'}\n\n---\n\n## Tasks\n\n${tasks}\n\n---\n\n## Wrap-up\n\n${wrapupAnswers}\n\n---\n\n## General Notes\n\n${sessionNotes || 'None'}\n`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([md], { type: 'text/markdown' }));
    a.download = `report-${participantId || 'unknown'}-${new Date().toISOString().split('T')[0]}.md`;
    a.click();
  };

  const copySessionSummary = () => {
    const tasks = script.tasks.map(tk => {
      const s = taskStatus[tk.id] || {};
      const result = s.completion === 'completed' ? '✅ Completed' : s.completion === 'partial' ? '⚠️ Partially' : s.completion === 'failed' ? '❌ Couldn\'t do it' : '○ Not scored';
      return `${tk.id}. ${tk.name}: ${result}${s.notes ? `\n   ${s.notes}` : ''}`;
    }).join('\n');
    navigator.clipboard.writeText(`# ${script.title}\nParticipant: ${participantId || 'Unknown'}\nDate: ${sessionStartTime?.toLocaleDateString()}\n\n${tasks}\n\n${sessionNotes}`);
  };

  const sessionDuration = () => {
    if (!sessionStartTime) return '—';
    return `${Math.round((new Date() - new Date(sessionStartTime)) / 60000)} min`;
  };

  const completedTasks = script ? Object.values(taskStatus).filter(t => t?.done).length : 0;
  const totalTasks = script?.tasks?.length || 0;

  // Check auth
  if (authLoading) return (
    <div style={{ minHeight: '100vh', background: t.canvasBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 style={{ color: t.brand, animation: 'spin 1s linear infinite' }} size={28} />
    </div>
  );

  if (!authenticated) return <Login onAuthSuccess={() => setAuthenticated(true)} />;

  if (loading && !config) return (
    <div style={{ minHeight: '100vh', background: t.canvasBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 style={{ color: t.brand, animation: 'spin 1s linear infinite' }} size={28} />
    </div>
  );

  if (error) return (
    <div style={{ minHeight: '100vh', background: t.canvasBg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Card style={{ padding: 32, maxWidth: 400, textAlign: 'center' }}>
        <AlertTriangle style={{ color: t.negative, margin: '0 auto 16px' }} size={28} />
        <p style={{ color: t.textMain, marginBottom: 16 }}>{error}</p>
        <Btn onClick={loadConfig} variant="primary"><RefreshCw size={14} />Retry</Btn>
      </Card>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: t.canvasBg, fontFamily: 'system-ui, -apple-system, sans-serif', color: t.textMain }}>

      {/* ── Sticky header ── */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: t.cardBg, borderBottom: `1px solid ${t.strokeDefault}` }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 32px', display: 'flex', alignItems: 'center', gap: 16, height: 52 }}>
          <button onClick={() => { setCurrentPhase('select'); setScript(null); }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, color: t.brand, fontWeight: 700, fontSize: 15,
              background: 'none', border: 'none', cursor: 'pointer', padding: 0, whiteSpace: 'nowrap' }}>
            <Home size={15} />InsightCatcher
          </button>
          {script && currentPhase !== 'select' && (
            <>
              <ChevronRight size={14} style={{ color: t.strokeStrong, flexShrink: 0 }} />
              <span style={{ color: t.textSub, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220 }}>{script.title}</span>
            </>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
            {script && currentPhase !== 'select' && currentPhase !== 'complete' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'monospace', fontSize: 13,
                  color: timerTarget && timer > timerTarget ? t.negative : t.textSub }}>
                  <Timer size={13} />
                  <span>{formatTime(timer)}</span>
                  {timerTarget > 0 && <span style={{ color: t.textDisabled }}>/ {formatTime(timerTarget)}</span>}
                </div>
                <button onClick={() => setTimerRunning(!timerRunning)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.brand, padding: 3 }}>
                  {timerRunning ? <Pause size={15} /> : <Play size={15} />}
                </button>
                <button onClick={() => { setTimer(0); setTimerRunning(false); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.brand, padding: 3 }}>
                  <RotateCcw size={15} />
                </button>
                {currentPhase === 'tasks' && (
                  <span style={{ fontSize: 12, color: t.textDetail }}>{completedTasks}/{totalTasks}</span>
                )}
              </>
            )}
            <button onClick={() => setShowSavedSessions(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.brand, position: 'relative', padding: 4 }}>
              <FolderOpen size={17} />
              {savedSessions.length > 0 && (
                <span style={{ position: 'absolute', top: -1, right: -1, width: 15, height: 15, background: t.brand,
                  color: '#fff', fontSize: 9, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {savedSessions.length}
                </span>
              )}
            </button>
            <button onClick={() => signOut().then(() => setAuthenticated(false))}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textSub, padding: 4, fontSize: 12 }}>
              <LogOut size={17} />
            </button>
          </div>
        </div>

        {/* Stepper row */}
        {script && currentPhase !== 'select' && currentPhase !== 'complete' && (
          <div style={{ borderTop: `1px solid ${t.strokeLight}`, background: t.cardBg }}>
            <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 44 }}>
              <Stepper currentPhase={currentPhase} onPhaseClick={setCurrentPhase} />
              <div style={{ display: 'flex', gap: 6 }}>
                <Btn variant="ghost" style={{ padding: '3px 12px', fontSize: 12 }}
                  onClick={() => { if (confirm('Restart? All notes will be lost.')) { resetSession(); setCurrentPhase('setup'); } }}>
                  Restart
                </Btn>
                <Btn variant="ghost" style={{ padding: '3px 12px', fontSize: 12 }}
                  onClick={() => { if (confirm('Exit? Session will not be saved.')) { resetSession(); setCurrentPhase('select'); setScript(null); } }}>
                  Exit
                </Btn>
              </div>
            </div>
          </div>
        )}

        {/* Task breadcrumb row */}
        {script && currentPhase === 'tasks' && (
          <div style={{ borderTop: `1px solid ${t.strokeLight}`, background: t.canvasBg }}>
            <div style={{ maxWidth: 1280, margin: '0 auto', padding: '6px 32px', display: 'flex', gap: 4, overflowX: 'auto', scrollbarWidth: 'none' }}>
              {script.tasks.map((task, i) => {
                const s = taskStatus[task.id] || {};
                const isCurrent = i === currentTaskIndex;
                return (
                  <button key={task.id} onClick={() => setCurrentTaskIndex(i)}
                    style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                      whiteSpace: 'nowrap', fontFamily: 'inherit',
                      background: isCurrent ? t.brand : s.done ? t.nearPositive : t.cardBg,
                      color: isCurrent ? '#fff' : s.done ? t.positive : t.textSub,
                      border: `1px solid ${isCurrent ? t.brand : s.done ? t.positive : t.strokeDefault}` }}>
                    {s.done && !isCurrent ? '✓ ' : ''}{task.id}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </header>

      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '16px 32px 120px' }}>
        {currentPhase === 'select' && <SelectPhase config={config} selectedProject={selectedProject} setSelectedProject={setSelectedProject} onSelectScript={selectScript} loading={loading} scriptTypeFilter={scriptTypeFilter} setScriptTypeFilter={setScriptTypeFilter} />}
        {currentPhase === 'setup' && script && <SetupPhase script={script} participantId={participantId} setParticipantId={setParticipantId} runnerName={runnerName} setRunnerName={setRunnerName} onStart={startSession} />}
        {currentPhase === 'warmup' && script && <WarmupPhase warmup={script.warmup} status={warmupStatus} setStatus={setWarmupStatus} onNext={nextPhase} startTimer={startTimer} />}
        {currentPhase === 'tasks' && script && <TasksPhase tasks={script.tasks} currentIndex={currentTaskIndex} setCurrentIndex={setCurrentTaskIndex} status={taskStatus} updateStatus={updateTaskStatus} showScript={showScript} setShowScript={setShowScript} onNext={nextTask} onPrev={prevTask} startTimer={startTimer} expandedSections={expandedSections} toggleSection={toggleSection} />}
        {currentPhase === 'wrapup' && script && <WrapupPhase wrapup={script.wrapup} observerNotes={script.observerNotes} status={wrapupStatus} setStatus={setWrapupStatus} sessionNotes={sessionNotes} setSessionNotes={setSessionNotes} onFinish={nextPhase} />}
        {currentPhase === 'complete' && !showCompleteModal && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <CheckCircle2 style={{ color: t.positive, margin: '0 auto 16px' }} size={40} />
            <p style={{ color: t.textSub }}>Session saved — great work!</p>
          </div>
        )}
      </main>

      {/* ── Completion modal ── */}
      {showCompleteModal && script && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,34,18,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24 }}>
          <Card style={{ width: '100%', maxWidth: 480, padding: 32 }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              {saving
                ? <Loader2 size={36} style={{ color: t.brand, margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
                : <CheckCircle2 size={36} style={{ color: t.positive, margin: '0 auto 12px' }} />}
              <h2 style={{ fontSize: 20, fontWeight: 700, color: t.textHeader, marginBottom: 4 }}>
                {saving ? 'Saving your session...' : 'That\'s a wrap! 🎉'}
              </h2>
              {!saving && <p style={{ color: t.textSub, fontSize: 13 }}>Download your session data and save it to OneDrive.</p>}
            </div>
            {!saving && (
              <>
                <div style={{ background: t.subtleBg, borderRadius: 8, padding: '14px 16px', marginBottom: 20 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px', fontSize: 13 }}>
                    {[
                      ['Participant', participantId || 'Unknown'],
                      ['Run by', runnerName || 'Unknown'],
                      ['Project', config?.projects.find(p => p.id === selectedProject)?.name || '—'],
                      ['Duration', sessionDuration()],
                      ['Completed', `${Object.values(taskStatus).filter(t => t?.completion === 'completed').length} / ${script.tasks.length}`],
                      ['Partial', `${Object.values(taskStatus).filter(t => t?.completion === 'partial').length} tasks`],
                      ["Couldn't do it", `${Object.values(taskStatus).filter(t => t?.completion === 'failed').length} tasks`],
                    ].map(([label, val]) => (
                      <div key={label}>
                        <div style={{ color: t.textDetail, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{label}</div>
                        <div style={{ color: t.textMain, fontWeight: 600 }}>{val}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <Btn variant="ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={copySessionSummary}>
                    <Copy size={13} />Copy summary
                  </Btn>
                  <Btn variant="ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={downloadSession}>
                    <Download size={13} />Save to OneDrive
                  </Btn>
                  <Btn variant="ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={exportMarkdown}>
                    <Download size={13} />Download report
                  </Btn>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Btn variant="default" style={{ flex: 1, justifyContent: 'center' }}
                    onClick={() => { setShowCompleteModal(false); resetSession(); setCurrentPhase('setup'); }}>
                    New session
                  </Btn>
                  <Btn variant="primary" style={{ flex: 1, justifyContent: 'center' }}
                    onClick={() => { setShowCompleteModal(false); resetSession(); setCurrentPhase('select'); setScript(null); }}>
                    <Home size={13} />Back to Home
                  </Btn>
                </div>
              </>
            )}
          </Card>
        </div>
      )}

      {/* ── Saved sessions modal disabled (no Supabase) ── */}
      {/* {showSavedSessions && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,34,18,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24 }}>
          <Card style={{ width: '100%', maxWidth: 560, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: `1px solid ${t.strokeLight}` }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: t.textHeader }}>All Sessions ({savedSessions.length})</h2>
              <button onClick={() => setShowSavedSessions(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.brand }}><X size={18} /></button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1, padding: 16 }}>
              {savedSessions.length === 0
                ? <p style={{ color: t.textDetail, textAlign: 'center', padding: 32 }}>No sessions recorded yet — run your first one to see it here.</p>
                : savedSessions.map(s => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 8, marginBottom: 6, background: t.subtleBg }}>
                    <div>
                      <div style={{ fontWeight: 600, color: t.textMain, fontSize: 14 }}>{s.participant_id || 'Unknown participant'}</div>
                      <div style={{ fontSize: 12, color: t.textSub }}>{s.script_title}</div>
                      <div style={{ fontSize: 11, color: t.textDetail }}>{s.runner_name && `${s.runner_name} · `}{new Date(s.created_at).toLocaleDateString()} · {s.project_name}</div>
                    </div>
                    <button onClick={() => deleteSession(s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.negative, padding: 6 }}><Trash2 size={14} /></button>
                  </div>
                ))
              }
            </div>
          </Card>
        </div>
      )} */}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        textarea, input { font-family: inherit; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-thumb { background: ${t.strokeStrong}; border-radius: 4px; }
      `}</style>
    </div>
  );
}

// ─── Select phase ─────────────────────────────────────────────────────────────
function SelectPhase({ config, selectedProject, setSelectedProject, onSelectScript, loading, scriptTypeFilter, setScriptTypeFilter }) {
  const [showAddInfo, setShowAddInfo] = useState(false);
  const allScripts = config?.projects.flatMap(p => p.scripts.map(s => ({ ...s, projectId: p.id, projectName: p.name }))) || [];
  const filtered = scriptTypeFilter === 'all' ? allScripts : allScripts.filter(s => (s.type || 'usability') === scriptTypeFilter);

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <div style={{ padding: '24px 0 20px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: t.textHeader, marginBottom: 4 }}>Select a test</h2>
          <p style={{ color: t.textSub, fontSize: 14 }}>Choose a script to run your session</p>
        </div>
        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowAddInfo(!showAddInfo)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.brand, display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
            <Info size={14} />How to add a test
          </button>
          {showAddInfo && (
            <Card style={{ position: 'absolute', right: 0, top: 28, width: 320, padding: '14px 16px', zIndex: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
              <ol style={{ fontSize: 12, color: t.textSub, lineHeight: 2, paddingLeft: 16 }}>
                <li>Create a JSON file in <code style={{ background: t.subtleBg, padding: '1px 4px', borderRadius: 3 }}>public/scripts/[project]/</code></li>
                <li>Add <code style={{ background: t.subtleBg, padding: '1px 4px', borderRadius: 3 }}>"type": "discovery"</code> or <code style={{ background: t.subtleBg, padding: '1px 4px', borderRadius: 3 }}>"type": "usability"</code></li>
                <li>Register in <code style={{ background: t.subtleBg, padding: '1px 4px', borderRadius: 3 }}>public/scripts/config.json</code></li>
              </ol>
            </Card>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 2, marginBottom: 16, background: t.subtleBg, borderRadius: 8, padding: 3, width: 'fit-content' }}>
        {[{ id: 'all', label: 'All' }, { id: 'discovery', label: 'Discovery', icon: <Search size={12} /> }, { id: 'usability', label: 'Usability', icon: <FlaskConical size={12} /> }].map(tab => (
          <button key={tab.id} onClick={() => setScriptTypeFilter(tab.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 14px', borderRadius: 6, fontSize: 13,
              fontWeight: scriptTypeFilter === tab.id ? 600 : 400, cursor: 'pointer', border: 'none',
              background: scriptTypeFilter === tab.id ? t.cardBg : 'transparent',
              color: scriptTypeFilter === tab.id ? t.brand : t.textSub,
              boxShadow: scriptTypeFilter === tab.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.length === 0
          ? <p style={{ color: t.textDetail, textAlign: 'center', padding: 40, fontSize: 14 }}>Nothing here yet — scripts will appear once they're added.</p>
          : filtered.map(scriptInfo => (
            <button key={`${scriptInfo.projectId}-${scriptInfo.id}`}
              onClick={() => onSelectScript(scriptInfo.projectId, scriptInfo)} disabled={loading}
              style={{ background: t.cardBg, border: `1px solid ${t.strokeDefault}`, borderRadius: 10, padding: '16px 20px',
                textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'inherit' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = t.brand}
              onMouseLeave={e => e.currentTarget.style.borderColor = t.strokeDefault}>
              <div>
                <div style={{ fontWeight: 600, color: t.textMain, marginBottom: 4, fontSize: 15 }}>{scriptInfo.name}</div>
                <div style={{ fontSize: 12, color: t.textDetail, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>{scriptInfo.projectName}</span>
                  <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 500,
                    background: (scriptInfo.type || 'usability') === 'discovery' ? t.hoverBg : t.nearPositive,
                    color: (scriptInfo.type || 'usability') === 'discovery' ? t.brand : t.positive }}>
                    {(scriptInfo.type || 'usability') === 'discovery' ? 'Discovery' : 'Usability'}
                  </span>
                </div>
              </div>
              <ChevronRight size={18} style={{ color: t.brand, flexShrink: 0 }} />
            </button>
          ))
        }
      </div>
    </div>
  );
}

// ─── Setup phase — two columns ────────────────────────────────────────────────
function SetupPhase({ script, participantId, setParticipantId, runnerName, setRunnerName, onStart }) {
  return (
    <div>
      <div style={{ padding: '16px 0 16px', paddingRight: 'calc(320px + 52px)' }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: t.textHeader, marginBottom: 4 }}>{script.title}</h2>
        {script.description && <p style={{ color: t.textSub, fontSize: 14, lineHeight: 1.6 }}>{script.description}</p>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
        {/* Left: participant fields */}
        <Card style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: t.textHeader, marginBottom: 4 }}>Session details</h3>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: t.textSub, marginBottom: 6 }}>Participant ID</label>
            <Input value={participantId} onChange={e => setParticipantId(e.target.value)} placeholder="e.g. P01, SLL-Jane" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: t.textSub, marginBottom: 6 }}>Your name (running the session)</label>
            <Input value={runnerName} onChange={e => setRunnerName(e.target.value)} placeholder="e.g. Iryna, John" />
          </div>
        </Card>

        {/* Right: say this + no help */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Card style={{ padding: 20, borderLeft: `3px solid ${t.brand}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Mic size={14} style={{ color: t.brand }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: t.textHeader }}>Say this at the start</span>
            </div>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {script.setup.rules.map((rule, i) => (
                <li key={i} style={{ display: 'flex', gap: 10, fontSize: 14, color: t.textSub }}>
                  <span style={{ color: t.brand, flexShrink: 0 }}>→</span>
                  <span style={{ fontStyle: 'italic' }}>"{rule}"</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card style={{ padding: 20, borderLeft: `3px solid ${t.negative}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <AlertTriangle size={14} style={{ color: t.negative }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: t.negative }}>No-help policy</span>
            </div>
            <p style={{ fontSize: 13, color: t.textSub, lineHeight: 1.6 }}>{script.setup.noHelpPolicy}</p>
          </Card>
        </div>
      </div>

      {/* Sticky bottom CTA */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: t.cardBg,
        borderTop: `1px solid ${t.strokeDefault}`, padding: '12px 32px', zIndex: 40 }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', justifyContent: 'flex-end' }}>
          <Btn variant="cta" onClick={onStart} style={{ padding: '11px 32px', fontSize: 15 }}>
            <Play size={16} />Start Session
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ─── Warmup phase — two columns ───────────────────────────────────────────────
function WarmupPhase({ warmup, status, setStatus, onNext, startTimer }) {
  useEffect(() => { startTimer(warmup.timeMinutes); }, []);
  const notedCount = Object.keys(status).filter(k => status[k]?.notes?.trim()).length;

  return (
    <div>
      <div style={{ padding: '16px 0 16px', paddingRight: 'calc(320px + 52px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <MessageSquare size={18} style={{ color: t.brand }} />
          <h2 style={{ fontSize: 22, fontWeight: 700, color: t.textHeader }}>Warm-up</h2>
          <span style={{ fontSize: 13, color: t.textDetail, marginLeft: 4 }}>{warmup.timeMinutes} min</span>
        </div>
        <p style={{ fontSize: 14, color: t.textSub, marginBottom: 4 }}>{warmup.intro}</p>
        {warmup.why && <p style={{ fontSize: 13, color: t.textSub, lineHeight: 1.6 }}>{warmup.why}</p>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>
        {/* Left: questions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {warmup.questions.map((q, i) => (
            <Card key={q.id} style={{ padding: 20 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: t.hoverBg, color: t.brand,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: t.textSub, marginBottom: 4 }}>{q.label}</div>
                  <p style={{ fontSize: 15, fontStyle: 'italic', color: t.textMain, marginBottom: 8 }}>"{q.question}"</p>
                  {q.listenFor && <p style={{ fontSize: 12, color: t.textDetail, marginBottom: 12 }}>Listen for: {q.listenFor}</p>}
                  <Input value={status[q.id]?.notes || ''} onChange={e => setStatus(p => ({ ...p, [q.id]: { notes: e.target.value } }))} placeholder="What did they say? Note anything interesting..." rows={3} />
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Right: Mom's Test reference (fixed) */}
        <div style={{ position: 'fixed', top: 130, right: 'max(32px, calc((100vw - 1280px) / 2 + 32px))', width: 320, height: 'calc(100vh - 150px)', overflowY: 'auto', zIndex: 30 }}>
          <Card style={{ overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: `1px solid ${t.strokeLight}`, background: t.hoverBg }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: t.brand, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Interview guide</div>
              <div style={{ fontSize: 11, color: t.textSub, marginTop: 2 }}>Based on The Mom's Test</div>
            </div>
            <div style={{ padding: '14px 16px', borderBottom: `1px solid ${t.strokeLight}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: t.positive, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                ✓ DO
              </div>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {MOMS_TEST_DOS.map((item, i) => (
                  <li key={i} style={{ fontSize: 12, color: t.textSub, lineHeight: 1.5, display: 'flex', gap: 6 }}>
                    <span style={{ color: t.positive, flexShrink: 0 }}>·</span>{item}
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ padding: '14px 16px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: t.negative, marginBottom: 8 }}>✗ DON'T</div>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {MOMS_TEST_DONTS.map((item, i) => (
                  <li key={i} style={{ fontSize: 12, color: t.textSub, lineHeight: 1.5, display: 'flex', gap: 6 }}>
                    <span style={{ color: t.negative, flexShrink: 0 }}>·</span>{item}
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        </div>
      </div>

      {/* Sticky bottom CTA */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: t.cardBg,
        borderTop: `1px solid ${t.strokeDefault}`, padding: '12px 32px', zIndex: 40 }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, color: t.textDetail }}>
            {notedCount} of {warmup.questions.length} questions noted
          </span>
          <Btn variant="cta" onClick={onNext} style={{ padding: '11px 32px', fontSize: 15 }}>
            Continue to Tasks →
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ─── Tasks phase — two columns ────────────────────────────────────────────────
function TasksPhase({ tasks, currentIndex, setCurrentIndex, status, updateStatus, showScript, setShowScript, onNext, onPrev, startTimer, expandedSections, toggleSection }) {
  const task = tasks[currentIndex];
  const taskStat = status[task.id] || { done: false, success: null, notes: '', tags: [] };

  useEffect(() => {
    startTimer(task.timeMinutes);
    // Auto-expand success and watch for on every task
    toggleSection(`success-${task.id}`);
    toggleSection(`watch-${task.id}`);
  }, [currentIndex]);

  const toggleTag = (tagId) => {
    const cur = taskStat.tags || [];
    updateStatus(task.id, 'tags', cur.includes(tagId) ? cur.filter(x => x !== tagId) : [...cur, tagId]);
  };

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start', marginBottom: 80 }}>

        {/* Left: action card */}
        <Card style={{ overflow: 'hidden' }}>
          <div style={{ padding: '18px 24px', borderBottom: `1px solid ${t.strokeLight}` }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: t.brand, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 3 }}>
                  Task {task.id}{task.optional && <span style={{ color: t.warning, marginLeft: 8, fontWeight: 500 }}>Optional</span>}
                </div>
                <h2 style={{ fontSize: 19, fontWeight: 700, color: t.textHeader }}>{task.name}</h2>
                {task.subtitle && <p style={{ fontSize: 13, color: t.textDetail, marginTop: 2 }}>{task.subtitle}</p>}
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: t.textDisabled, flexShrink: 0 }}>{task.timeMinutes}m</div>
            </div>
            {task.learnWhy && (
              <p style={{ fontSize: 12, color: t.textDetail, fontStyle: 'italic', marginTop: 10, lineHeight: 1.5 }}>
                <Lightbulb size={11} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                {task.learnWhy}
              </p>
            )}
          </div>

          <div style={{ padding: '16px 24px', borderBottom: `1px solid ${t.strokeLight}` }}>
            <button onClick={() => setShowScript(!showScript)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.brand, fontSize: 12,
                display: 'flex', alignItems: 'center', gap: 5, marginBottom: showScript ? 10 : 0 }}>
              {showScript ? <EyeOff size={12} /> : <Eye size={12} />}{showScript ? 'Hide' : 'Show'} script
            </button>
            {showScript && (
              <div>
                <div style={{ background: t.hoverBg, borderRadius: 8, padding: '14px 18px', borderLeft: `3px solid ${t.brand}`, marginBottom: task.steps ? 12 : 0 }}>
                  <p style={{ fontSize: 16, fontStyle: 'italic', color: t.textMain, lineHeight: 1.7 }}>"{task.script}"</p>
                </div>
                {task.steps && task.steps.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {task.steps.map((step, idx) => (
                      <div key={step.id} style={{ background: t.subtleBg, borderRadius: 8, padding: '12px 16px', borderLeft: `3px solid ${t.textDetail}` }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: t.textDetail, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Step {String.fromCharCode(97 + idx).toUpperCase()}
                        </div>
                        <p style={{ fontSize: 15, fontStyle: 'italic', color: t.textMain, lineHeight: 1.6 }}>"{step.prompt}"</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ padding: '14px 24px', borderBottom: `1px solid ${t.strokeLight}` }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: t.textDetail, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Quick tags</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {TAGS.map(tag => {
                const active = (taskStat.tags || []).includes(tag.id);
                return (
                  <button key={tag.id} onClick={() => toggleTag(tag.id)}
                    style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                      background: active ? tag.bg : 'transparent', color: active ? tag.color : t.textDetail,
                      border: `1px solid ${active ? tag.color : t.strokeDefault}`, fontWeight: active ? 600 : 400 }}>
                    {tag.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ padding: '14px 24px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: t.textDetail, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Observations</div>
            <Input value={taskStat.notes || ''} onChange={e => updateStatus(task.id, 'notes', e.target.value)} placeholder="What did you notice? Quotes, hesitations, surprises..." rows={6} />
          </div>
        </Card>

        {/* Right: reference panel (fixed) */}
        <div style={{ position: 'fixed', top: 150, right: 'max(32px, calc((100vw - 1280px) / 2 + 32px))', width: 320, height: 'calc(100vh - 170px)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, zIndex: 30 }}>
          <Card style={{ overflow: 'hidden' }}>
            <button onClick={() => toggleSection(`success-${task.id}`)}
              style={{ width: '100%', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Target size={13} style={{ color: t.positive }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: t.positive }}>Success looks like</span>
              </div>
              {expandedSections[`success-${task.id}`] ? <ChevronDown size={13} style={{ color: t.brand }} /> : <ChevronRight size={13} style={{ color: t.brand }} />}
            </button>
            {expandedSections[`success-${task.id}`] && (
              <div style={{ padding: '0 16px 14px' }}>
                <p style={{ fontSize: 13, color: t.textSub, lineHeight: 1.6 }}>{task.success}</p>
              </div>
            )}
          </Card>

          <Card style={{ overflow: 'hidden' }}>
            <button onClick={() => toggleSection(`watch-${task.id}`)}
              style={{ width: '100%', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Eye size={13} style={{ color: t.brand }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: t.textSub }}>Watch for</span>
              </div>
              {expandedSections[`watch-${task.id}`] ? <ChevronDown size={13} style={{ color: t.brand }} /> : <ChevronRight size={13} style={{ color: t.brand }} />}
            </button>
            {expandedSections[`watch-${task.id}`] && (
              <ul style={{ padding: '0 16px 14px 30px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {task.watchFor.map((item, i) => (
                  <li key={i} style={{ fontSize: 13, color: t.textSub, lineHeight: 1.5 }}>• {item}</li>
                ))}
              </ul>
            )}
          </Card>

          {task.note && (
            <Card style={{ padding: '12px 16px', background: task.note.type === 'warning' ? 'rgba(249,196,0,0.07)' : t.subtleBg }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <AlertTriangle size={13} style={{ color: task.note.type === 'warning' ? '#92400E' : t.textDetail, flexShrink: 0, marginTop: 1 }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: t.textSub, marginBottom: 3 }}>{task.note.title}</div>
                  <p style={{ fontSize: 12, color: t.textDetail, lineHeight: 1.5 }}>{task.note.content}</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Sticky bottom action bar */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: t.cardBg,
        borderTop: `1px solid ${t.strokeDefault}`, padding: '10px 32px', zIndex: 40 }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={onPrev} disabled={currentIndex === 0}
            style={{ background: 'none', border: `1px solid ${t.strokeDefault}`, borderRadius: 6, padding: '8px 14px',
              cursor: currentIndex === 0 ? 'not-allowed' : 'pointer', color: currentIndex === 0 ? t.textDisabled : t.brand,
              fontSize: 13, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}>
            ← Prev
          </button>
          <button onClick={() => updateStatus(task.id, 'done', !taskStat.done)}
            style={{ background: 'none', border: `1px solid ${t.strokeDefault}`, borderRadius: 6, padding: '8px 14px',
              cursor: 'pointer', color: taskStat.done ? t.positive : t.textSub,
              fontSize: 13, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}>
            {taskStat.done ? <CheckSquare size={14} /> : <Square size={14} />}Done
          </button>
          <div style={{ flex: 1 }} />
          {/* 3-point completion scale */}
          {[
            { value: 'completed', label: '✅ Completed', bg: t.nearPositive, color: t.positive, border: t.positive },
            { value: 'partial',   label: '⚠️ Partially',  bg: '#FEF3C7',      color: '#92400E', border: '#F59E0B' },
            { value: 'failed',    label: "❌ Couldn't do it", bg: t.nearNegative, color: t.negative, border: t.negative },
          ].map(({ value, label, bg, color, border }) => (
            <button key={value}
              onClick={() => updateStatus(task.id, 'completion', taskStat.completion === value ? null : value)}
              style={{ padding: '8px 14px', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit',
                background: taskStat.completion === value ? bg : 'transparent',
                color: taskStat.completion === value ? color : t.textSub,
                border: `1px solid ${taskStat.completion === value ? border : t.strokeDefault}` }}>
              {label}
            </button>
          ))}
          <Btn variant="cta" onClick={() => { updateStatus(task.id, 'done', true); onNext(); }}>
            {currentIndex < tasks.length - 1 ? 'Next Task →' : 'Finish Tasks →'}
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ─── Wrapup phase — two columns ───────────────────────────────────────────────
function WrapupPhase({ wrapup, observerNotes, status, setStatus, sessionNotes, setSessionNotes, onFinish }) {
  const notedCount = Object.keys(status).filter(k => status[k]?.notes?.trim()).length;

  return (
    <div>
      <div style={{ padding: '16px 0 16px', paddingRight: 'calc(320px + 52px)' }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: t.textHeader, marginBottom: 4 }}>Wrap-up</h2>
        <p style={{ fontSize: 14, color: t.textSub }}>{wrapup.intro}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start', marginBottom: 80 }}>

        {/* Left: questions + general notes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {wrapup.questions.map(q => (
            <Card key={q.id} style={{ padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: t.textSub, marginBottom: 4 }}>{q.label}</div>
              <p style={{ fontSize: 15, fontStyle: 'italic', color: t.textMain, marginBottom: 12 }}>"{q.question}"</p>
              <Input value={status[q.id]?.notes || ''} onChange={e => setStatus(p => ({ ...p, [q.id]: { notes: e.target.value } }))} placeholder="Their response..." rows={3} />
            </Card>
          ))}

          <Card style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <FileText size={13} style={{ color: t.textDetail }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: t.textSub }}>General notes</span>
            </div>
            <Input value={sessionNotes} onChange={e => setSessionNotes(e.target.value)} placeholder="Overall impressions, notable quotes..." rows={5} />
          </Card>
        </div>

        {/* Right: observer reference (sticky) */}
        {observerNotes && observerNotes.length > 0 && (
          <div style={{ position: 'fixed', top: 130, right: 'max(32px, calc((100vw - 1280px) / 2 + 32px))', width: 320, height: 'calc(100vh - 150px)', overflowY: 'auto', zIndex: 30 }}>
            <Card style={{ padding: 20, borderLeft: `3px solid ${t.brand}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Users size={14} style={{ color: t.brand }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: t.textHeader }}>Behavior reference</span>
              </div>
              <p style={{ fontSize: 12, color: t.textDetail, marginBottom: 12, fontStyle: 'italic' }}>
                Use this to interpret what you observed. Let it guide your follow-up questions.
              </p>
              {observerNotes.map((note, i) => (
                <div key={i} style={{ fontSize: 12, paddingBottom: 8, marginBottom: i < observerNotes.length - 1 ? 8 : 0,
                  borderBottom: i < observerNotes.length - 1 ? `1px solid ${t.strokeLight}` : 'none' }}>
                  <div style={{ color: t.textMain, fontWeight: 500, marginBottom: 2 }}>{note.behavior}</div>
                  <div style={{ color: t.textDetail }}>→ {note.meaning}</div>
                </div>
              ))}
            </Card>
          </div>
        )}
      </div>

      {/* Sticky bottom CTA */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: t.cardBg,
        borderTop: `1px solid ${t.strokeDefault}`, padding: '12px 32px', zIndex: 40 }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, color: t.textDetail }}>
            {notedCount} of {wrapup.questions.length} questions noted
          </span>
          <Btn variant="cta" onClick={onFinish} style={{ padding: '11px 32px', fontSize: 15 }}>
            Complete Session →
          </Btn>
        </div>
      </div>
    </div>
  );
}
