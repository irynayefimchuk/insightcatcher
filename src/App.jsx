import React, { useState, useEffect } from 'react';
import { CheckCircle2, Circle, ChevronDown, ChevronRight, Play, Pause, RotateCcw, AlertTriangle, Copy, Download, Eye, EyeOff, MessageSquare, Lightbulb, Target, CheckSquare, Square, Timer, FileText, Users, Mic, FolderOpen, Trash2, Loader2, RefreshCw, Home, FlaskConical, Search, X } from 'lucide-react';
import { supabase } from './supabase';

// ─── Design tokens from Cashmere ────────────────────────────────────────────
const t = {
  canvasBg:     '#E9EEF3',
  cardBg:       '#FFFFFF',
  subtleBg:     'rgba(233,238,243,0.7)',
  hoverBg:      '#E1EDFA',
  brand:        '#005CB7',
  textMain:     '#022212',
  textSub:      '#5E676F',
  textDetail:   '#708090',
  textPlaceholder: '#95A1AD',
  textDisabled: '#D7DDE4',
  textHeader:   '#003D66',
  textLink:     '#005CB7',
  strokeDefault:'#E0E3E6',
  strokeLight:  '#E9EEF3',
  strokeStrong: '#C0C5CC',
  positive:     '#068252',
  nearPositive: '#C1E8D9',
  negative:     '#C3231D',
  nearNegative: '#FAD8D7',
  warning:      '#F9C400',
  formStroke:   '#C0C5CC',
  formFocus:    '#A3CCF5',
};

const TAGS = [
  { id: 'confused',   label: '😕 Confused',        bg: t.nearNegative,  color: t.negative },
  { id: 'missed',     label: '👻 Missed it',        bg: '#FEF3C7',       color: '#92400E' },
  { id: 'workaround', label: '🔧 Workaround',       bg: '#FEF9C3',       color: '#854D0E' },
  { id: 'surprised',  label: '😮 Surprised',        bg: t.hoverBg,       color: t.brand },
  { id: 'strong',     label: '💬 Strong reaction',  bg: '#EDE9FE',       color: '#5B21B6' },
  { id: 'quit',       label: '🛑 Gave up',          bg: t.subtleBg,      color: t.textSub },
];

// ─── Shared UI primitives ────────────────────────────────────────────────────
const Card = ({ children, style, className = '' }) => (
  <div className={className} style={{ background: t.cardBg, border: `1px solid ${t.strokeDefault}`, borderRadius: 10, ...style }}>
    {children}
  </div>
);

const Divider = () => <div style={{ borderTop: `1px solid ${t.strokeLight}` }} />;

const Input = ({ value, onChange, placeholder, rows, type = 'text' }) => {
  const base = {
    width: '100%', background: t.cardBg, border: `1px solid ${t.formStroke}`,
    borderRadius: 6, padding: '10px 14px', fontSize: 14, color: t.textMain,
    outline: 'none', fontFamily: 'inherit',
  };
  return rows
    ? <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows}
        style={{ ...base, resize: 'none', lineHeight: 1.5 }} />
    : <input type={type} value={value} onChange={onChange} placeholder={placeholder} style={base} />;
};

const Btn = ({ onClick, disabled, children, variant = 'default', style }) => {
  const styles = {
    primary:   { background: t.brand,    color: '#fff', border: 'none' },
    positive:  { background: t.positive, color: '#fff', border: 'none' },
    ghost:     { background: 'transparent', color: t.textSub, border: `1px solid ${t.strokeDefault}` },
    danger:    { background: 'transparent', color: t.negative, border: `1px solid ${t.nearNegative}` },
    default:   { background: t.subtleBg, color: t.textMain, border: `1px solid ${t.strokeDefault}` },
  };
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ ...styles[variant], borderRadius: 6, padding: '9px 18px', fontSize: 14, fontWeight: 500,
        cursor: disabled ? 'not-allowed', opacity: disabled ? 0.4 : 1, display: 'inline-flex',
        alignItems: 'center', gap: 6, whiteSpace: 'nowrap', fontFamily: 'inherit', ...style }}>
      {children}
    </button>
  );
};

// ─── Main app ────────────────────────────────────────────────────────────────
export default function InsightCatcher() {
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
      setScript(data);
      setSelectedScriptId(scriptInfo.id);
      setSelectedProject(projectId);
      localStorage.setItem('insightcatcher-last-project', projectId);
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
    setShowCompleteModal(false);
  };

  useEffect(() => {
    let iv;
    if (timerRunning) iv = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(iv);
  }, [timerRunning]);

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const startTimer = (mins) => { setTimer(0); setTimerTarget(mins * 60); setTimerRunning(true); };

  const toggleSection = (id) => setExpandedSections(p => ({ ...p, [id]: !p[id] }));

  const updateTaskStatus = (taskId, field, value) =>
    setTaskStatus(p => ({ ...p, [taskId]: { ...p[taskId], [field]: value } }));

  const startSession = () => { setSessionStartTime(new Date()); setCurrentPhase('warmup'); };

  const nextPhase = () => {
    if (currentPhase === 'warmup') { setCurrentPhase('tasks'); setCurrentTaskIndex(0); }
    else if (currentPhase === 'tasks') setCurrentPhase('wrapup');
    else if (currentPhase === 'wrapup') { saveCompletedSession(); }
  };

  const saveCompletedSession = async () => {
    setSaving(true);
    setCurrentPhase('complete');
    setShowCompleteModal(true);
    try {
      await supabase.from('sessions').insert([{
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
        tags: {},
      }]);
      await loadSavedSessions();
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  const deleteSession = async (id) => {
    await supabase.from('sessions').delete().eq('id', id);
    setSavedSessions(p => p.filter(s => s.id !== id));
  };

  const nextTask = () => {
    if (currentTaskIndex < script.tasks.length - 1) {
      setCurrentTaskIndex(i => i + 1);
      setTimer(0); setTimerRunning(false);
    } else nextPhase();
  };

  const prevTask = () => {
    if (currentTaskIndex > 0) { setCurrentTaskIndex(i => i - 1); setTimer(0); setTimerRunning(false); }
  };

  const exportMarkdown = () => {
    const tasks = script.tasks.map(t => {
      const s = taskStatus[t.id] || {};
      const result = s.success === true ? '✓ Pass' : s.success === false ? '✗ Struggled' : '— Not scored';
      const tags = s.tags?.length ? `\n**Tags:** ${s.tags.join(', ')}` : '';
      return `### Task ${t.id}: ${t.name}\n**Result:** ${result}${tags}\n**Notes:** ${s.notes || 'None'}`;
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
    const tasks = script.tasks.map(t => {
      const s = taskStatus[t.id] || {};
      return `${t.id}. ${t.name}: ${s.done ? (s.success ? '✓ Pass' : s.success === false ? '✗ Struggled' : '— Done') : '○ Not done'}${s.notes ? `\n   ${s.notes}` : ''}`;
    }).join('\n');
    navigator.clipboard.writeText(`# ${script.title}\nParticipant: ${participantId || 'Unknown'}\nDate: ${sessionStartTime?.toLocaleDateString()}\n\n${tasks}\n\n${sessionNotes}`);
  };

  const sessionDuration = () => {
    if (!sessionStartTime) return '—';
    const mins = Math.round((new Date() - new Date(sessionStartTime)) / 60000);
    return `${mins} min`;
  };

  const completedTasks = script ? Object.values(taskStatus).filter(t => t?.done).length : 0;
  const totalTasks = script?.tasks?.length || 0;
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

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
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: t.cardBg, borderBottom: `1px solid ${t.strokeDefault}`, padding: '0 24px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 16, height: 56 }}>

          {/* Home */}
          <button onClick={() => { setCurrentPhase('select'); setScript(null); }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, color: t.brand, fontWeight: 600, fontSize: 15, background: 'none', border: 'none', cursor: 'pointer', padding: 0, whiteSpace: 'nowrap' }}>
            <Home size={16} />InsightCatcher
          </button>

          {script && currentPhase !== 'select' && (
            <>
              <span style={{ color: t.strokeStrong }}>›</span>
              <span style={{ color: t.textSub, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>{script.title}</span>

              {/* Task breadcrumb pills — only during tasks phase */}
              {currentPhase === 'tasks' && script.tasks && (
                <div style={{ display: 'flex', gap: 4, overflowX: 'auto', flex: 1, scrollbarWidth: 'none' }}>
                  {script.tasks.map((task, i) => {
                    const s = taskStatus[task.id] || {};
                    const isCurrent = i === currentTaskIndex;
                    return (
                      <button key={task.id} onClick={() => setCurrentTaskIndex(i)}
                        style={{
                          padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap',
                          background: isCurrent ? t.brand : s.done ? t.nearPositive : t.subtleBg,
                          color: isCurrent ? '#fff' : s.done ? t.positive : t.textSub,
                          border: `1px solid ${isCurrent ? t.brand : s.done ? t.positive : t.strokeDefault}`,
                        }}>
                        {s.done && !isCurrent ? '✓ ' : ''}{task.id}
                      </button>
                    );
                  })}
                </div>
              )}

              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                {/* Timer */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'monospace', fontSize: 14,
                  color: timerTarget && timer > timerTarget ? t.negative : t.textSub }}>
                  <Timer size={14} />
                  <span>{formatTime(timer)}</span>
                  {timerTarget > 0 && <span style={{ color: t.textDisabled }}>/ {formatTime(timerTarget)}</span>}
                </div>
                <button onClick={() => setTimerRunning(!timerRunning)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textSub, padding: 4 }}>
                  {timerRunning ? <Pause size={16} /> : <Play size={16} />}
                </button>
                <button onClick={() => { setTimer(0); setTimerRunning(false); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textSub, padding: 4 }}>
                  <RotateCcw size={16} />
                </button>

                {/* Progress */}
                {currentPhase === 'tasks' && (
                  <span style={{ fontSize: 12, color: t.textDetail }}>{completedTasks}/{totalTasks}</span>
                )}
              </div>
            </>
          )}

          {/* Sessions button */}
          <button onClick={() => setShowSavedSessions(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textSub, position: 'relative', padding: 4, marginLeft: script ? 0 : 'auto' }}>
            <FolderOpen size={18} />
            {savedSessions.length > 0 && (
              <span style={{ position: 'absolute', top: -2, right: -2, width: 16, height: 16, background: t.brand,
                color: '#fff', fontSize: 10, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {savedSessions.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* ── Phase nav strip (below header, only during active session) ── */}
      {script && currentPhase !== 'select' && (
        <div style={{ background: t.cardBg, borderBottom: `1px solid ${t.strokeLight}`, padding: '0 24px' }}>
          <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', gap: 4, padding: '6px 0' }}>
            {['setup', 'warmup', 'tasks', 'wrapup'].map(phase => (
              <button key={phase} onClick={() => setCurrentPhase(phase)}
                style={{ padding: '5px 14px', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: 'none',
                  background: currentPhase === phase ? t.hoverBg : 'transparent',
                  color: currentPhase === phase ? t.brand : t.textSub }}>
                {phase.charAt(0).toUpperCase() + phase.slice(1)}
              </button>
            ))}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
              <Btn variant="ghost" style={{ padding: '4px 12px', fontSize: 12 }}
                onClick={() => { if (confirm('Restart this session? All notes will be lost.')) { resetSession(); setCurrentPhase('setup'); } }}>
                Restart
              </Btn>
              <Btn variant="ghost" style={{ padding: '4px 12px', fontSize: 12 }}
                onClick={() => { if (confirm('Exit to home? Session will not be saved.')) { resetSession(); setCurrentPhase('select'); setScript(null); } }}>
                Exit
              </Btn>
            </div>
          </div>
        </div>
      )}

      <main style={{ maxWidth: 800, margin: '0 auto', padding: '24px 24px 80px' }}>
        {currentPhase === 'select' && <SelectPhase config={config} selectedProject={selectedProject} setSelectedProject={setSelectedProject} onSelectScript={selectScript} loading={loading} scriptTypeFilter={scriptTypeFilter} setScriptTypeFilter={setScriptTypeFilter} />}
        {currentPhase === 'setup' && script && <SetupPhase script={script} participantId={participantId} setParticipantId={setParticipantId} runnerName={runnerName} setRunnerName={setRunnerName} onStart={startSession} />}
        {currentPhase === 'warmup' && script && <WarmupPhase warmup={script.warmup} status={warmupStatus} setStatus={setWarmupStatus} onNext={nextPhase} startTimer={startTimer} />}
        {currentPhase === 'tasks' && script && <TasksPhase tasks={script.tasks} currentIndex={currentTaskIndex} setCurrentIndex={setCurrentTaskIndex} status={taskStatus} updateStatus={updateTaskStatus} showScript={showScript} setShowScript={setShowScript} onNext={nextTask} onPrev={prevTask} startTimer={startTimer} expandedSections={expandedSections} toggleSection={toggleSection} />}
        {currentPhase === 'wrapup' && script && <WrapupPhase wrapup={script.wrapup} observerNotes={script.observerNotes} status={wrapupStatus} setStatus={setWrapupStatus} sessionNotes={sessionNotes} setSessionNotes={setSessionNotes} onFinish={nextPhase} />}
        {currentPhase === 'complete' && script && !showCompleteModal && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <CheckCircle2 style={{ color: t.positive, margin: '0 auto 16px' }} size={40} />
            <p style={{ color: t.textSub }}>Session saved.</p>
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
              <h2 style={{ fontSize: 20, fontWeight: 600, color: t.textHeader, marginBottom: 4 }}>
                {saving ? 'Saving...' : 'Session complete'}
              </h2>
              {!saving && <p style={{ color: t.textSub, fontSize: 14 }}>Saved to central database</p>}
            </div>

            {!saving && (
              <>
                <div style={{ background: t.subtleBg, borderRadius: 8, padding: '14px 16px', marginBottom: 20, fontSize: 13 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
                    {[
                      ['Participant', participantId || 'Unknown'],
                      ['Run by', runnerName || 'Unknown'],
                      ['Project', config?.projects.find(p => p.id === selectedProject)?.name || '—'],
                      ['Duration', sessionDuration()],
                      ['Tasks done', `${Object.values(taskStatus).filter(t => t?.done).length} / ${script.tasks.length}`],
                      ['Struggled', `${Object.values(taskStatus).filter(t => t?.success === false).length} tasks`],
                    ].map(([label, val]) => (
                      <div key={label}>
                        <div style={{ color: t.textDetail, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                        <div style={{ color: t.textMain, fontWeight: 500 }}>{val}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <Btn variant="ghost" style={{ flex: 1 }} onClick={copySessionSummary}><Copy size={14} />Copy</Btn>
                  <Btn variant="ghost" style={{ flex: 1 }} onClick={exportMarkdown}><FileText size={14} />Markdown</Btn>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Btn variant="default" style={{ flex: 1 }} onClick={() => { setShowCompleteModal(false); resetSession(); setCurrentPhase('setup'); }}>
                    New session
                  </Btn>
                  <Btn variant="primary" style={{ flex: 1 }} onClick={() => { setShowCompleteModal(false); resetSession(); setCurrentPhase('select'); setScript(null); }}>
                    <Home size={14} />Go home
                  </Btn>
                </div>
              </>
            )}
          </Card>
        </div>
      )}

      {/* ── Saved sessions modal ── */}
      {showSavedSessions && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,34,18,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24 }}>
          <Card style={{ width: '100%', maxWidth: 560, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: `1px solid ${t.strokeLight}` }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: t.textHeader }}>All Sessions ({savedSessions.length})</h2>
              <button onClick={() => setShowSavedSessions(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textSub }}><X size={18} /></button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1, padding: 16 }}>
              {savedSessions.length === 0
                ? <p style={{ color: t.textDetail, textAlign: 'center', padding: 32 }}>No sessions yet</p>
                : savedSessions.map(s => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 8, marginBottom: 6, background: t.subtleBg }}>
                    <div>
                      <div style={{ fontWeight: 500, color: t.textMain, fontSize: 14 }}>{s.participant_id || 'Unknown participant'}</div>
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
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } * { box-sizing: border-box; margin: 0; padding: 0; } textarea, input { font-family: inherit; } ::-webkit-scrollbar { width: 4px; height: 4px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: ${t.strokeStrong}; border-radius: 4px; }`}</style>
    </div>
  );
}

// ─── Select phase ─────────────────────────────────────────────────────────────
function SelectPhase({ config, selectedProject, setSelectedProject, onSelectScript, loading, scriptTypeFilter, setScriptTypeFilter }) {
  const allScripts = config?.projects.flatMap(p => p.scripts.map(s => ({ ...s, projectId: p.id, projectName: p.name }))) || [];
  const filtered = scriptTypeFilter === 'all' ? allScripts : allScripts.filter(s => (s.type || 'usability') === scriptTypeFilter);

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <div style={{ padding: '32px 0 24px' }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: t.textHeader, marginBottom: 6 }}>Select a test</h2>
        <p style={{ color: t.textSub, fontSize: 14 }}>Choose a script to run your session</p>
      </div>

      {/* Type filter tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 20, background: t.subtleBg, borderRadius: 8, padding: 3, width: 'fit-content' }}>
        {[
          { id: 'all', label: 'All', icon: null },
          { id: 'discovery', label: 'Discovery', icon: <Search size={13} /> },
          { id: 'usability', label: 'Usability', icon: <FlaskConical size={13} /> },
        ].map(tab => (
          <button key={tab.id} onClick={() => setScriptTypeFilter(tab.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: 'none',
              background: scriptTypeFilter === tab.id ? t.cardBg : 'transparent',
              color: scriptTypeFilter === tab.id ? t.brand : t.textSub,
              boxShadow: scriptTypeFilter === tab.id ? `0 1px 3px rgba(0,0,0,0.08)` : 'none' }}>
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map(scriptInfo => (
          <button key={`${scriptInfo.projectId}-${scriptInfo.id}`}
            onClick={() => onSelectScript(scriptInfo.projectId, scriptInfo)}
            disabled={loading}
            style={{ background: t.cardBg, border: `1px solid ${t.strokeDefault}`, borderRadius: 10, padding: '16px 20px', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'border-color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = t.brand}
            onMouseLeave={e => e.currentTarget.style.borderColor = t.strokeDefault}>
            <div>
              <div style={{ fontWeight: 600, color: t.textMain, marginBottom: 3 }}>{scriptInfo.name}</div>
              <div style={{ fontSize: 12, color: t.textDetail, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>{scriptInfo.projectName}</span>
                <span style={{ padding: '1px 8px', borderRadius: 20, background: (scriptInfo.type || 'usability') === 'discovery' ? t.hoverBg : t.nearPositive,
                  color: (scriptInfo.type || 'usability') === 'discovery' ? t.brand : t.positive, fontSize: 11, fontWeight: 500 }}>
                  {(scriptInfo.type || 'usability') === 'discovery' ? 'Discovery' : 'Usability'}
                </span>
              </div>
            </div>
            <ChevronRight size={18} style={{ color: t.strokeStrong, flexShrink: 0 }} />
          </button>
        ))}
        {filtered.length === 0 && (
          <p style={{ color: t.textDetail, textAlign: 'center', padding: 32 }}>No scripts found for this type</p>
        )}
      </div>

      <Card style={{ marginTop: 24, padding: '16px 20px' }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: t.textSub, marginBottom: 8 }}>How to add a new test</p>
        <ol style={{ fontSize: 12, color: t.textDetail, lineHeight: 1.8, paddingLeft: 16 }}>
          <li>Create a JSON file in <code style={{ background: t.subtleBg, padding: '1px 5px', borderRadius: 3 }}>public/scripts/[project]/</code></li>
          <li>Add <code style={{ background: t.subtleBg, padding: '1px 5px', borderRadius: 3 }}>"type": "discovery"</code> or <code style={{ background: t.subtleBg, padding: '1px 5px', borderRadius: 3 }}>"type": "usability"</code></li>
          <li>Register it in <code style={{ background: t.subtleBg, padding: '1px 5px', borderRadius: 3 }}>public/scripts/config.json</code></li>
        </ol>
      </Card>
    </div>
  );
}

// ─── Setup phase ──────────────────────────────────────────────────────────────
function SetupPhase({ script, participantId, setParticipantId, runnerName, setRunnerName, onStart }) {
  return (
    <div style={{ maxWidth: 600, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ padding: '24px 0 8px' }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: t.textHeader, marginBottom: 4 }}>{script.title}</h2>
        {script.description && <p style={{ color: t.textSub, fontSize: 14, lineHeight: 1.6 }}>{script.description}</p>}
      </div>

      <Card style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: t.textSub, marginBottom: 6 }}>Participant ID</label>
          <Input value={participantId} onChange={e => setParticipantId(e.target.value)} placeholder="e.g. P01, SLL-Jane" />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: t.textSub, marginBottom: 6 }}>Your name (who is running this)</label>
          <Input value={runnerName} onChange={e => setRunnerName(e.target.value)} placeholder="e.g. Iryna, John" />
        </div>
      </Card>

      <Card style={{ padding: 20, borderLeft: `3px solid ${t.brand}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Mic size={15} style={{ color: t.brand }} />
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
          <AlertTriangle size={15} style={{ color: t.negative }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: t.negative }}>No-help policy</span>
        </div>
        <p style={{ fontSize: 13, color: t.textSub, lineHeight: 1.6 }}>{script.setup.noHelpPolicy}</p>
      </Card>

      <Btn variant="positive" onClick={onStart} style={{ width: '100%', justifyContent: 'center', padding: '13px 0', fontSize: 15 }}>
        <Play size={16} />Start Session
      </Btn>
    </div>
  );
}

// ─── Warmup phase ─────────────────────────────────────────────────────────────
function WarmupPhase({ warmup, status, setStatus, onNext, startTimer }) {
  useEffect(() => { startTimer(warmup.timeMinutes); }, []);
  return (
    <div style={{ maxWidth: 600, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ padding: '24px 0 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <MessageSquare size={15} style={{ color: t.brand }} />
          <h2 style={{ fontSize: 18, fontWeight: 700, color: t.textHeader }}>Warm-up</h2>
          <span style={{ fontSize: 12, color: t.textDetail, marginLeft: 4 }}>{warmup.timeMinutes} min</span>
        </div>
        <p style={{ fontSize: 13, color: t.textSub }}>{warmup.intro}</p>
        {warmup.why && <p style={{ fontSize: 12, color: t.textDetail, fontStyle: 'italic', marginTop: 6 }}>{warmup.why}</p>}
      </div>

      {warmup.questions.map((q, i) => (
        <Card key={q.id} style={{ padding: 20 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ width: 26, height: 26, borderRadius: '50%', background: t.hoverBg, color: t.brand, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: t.textSub, marginBottom: 4 }}>{q.label}</div>
              <p style={{ fontSize: 15, fontStyle: 'italic', color: t.textMain, marginBottom: 8 }}>"{q.question}"</p>
              {q.listenFor && <p style={{ fontSize: 12, color: t.textDetail, marginBottom: 12 }}>Listen for: {q.listenFor}</p>}
              <Input value={status[q.id]?.notes || ''} onChange={e => setStatus(p => ({ ...p, [q.id]: { notes: e.target.value } }))} placeholder="Notes..." rows={3} />
            </div>
          </div>
        </Card>
      ))}

      <Btn variant="primary" onClick={onNext} style={{ width: '100%', justifyContent: 'center', padding: '12px 0' }}>
        Continue to Tasks →
      </Btn>
    </div>
  );
}

// ─── Tasks phase ──────────────────────────────────────────────────────────────
function TasksPhase({ tasks, currentIndex, setCurrentIndex, status, updateStatus, showScript, setShowScript, onNext, onPrev, startTimer, expandedSections, toggleSection }) {
  const task = tasks[currentIndex];
  const taskStat = status[task.id] || { done: false, success: null, notes: '', tags: [] };

  useEffect(() => { startTimer(task.timeMinutes); }, [currentIndex]);

  const toggleTag = (tagId) => {
    const cur = taskStat.tags || [];
    updateStatus(task.id, 'tags', cur.includes(tagId) ? cur.filter(x => x !== tagId) : [...cur, tagId]);
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <Card style={{ overflow: 'hidden' }}>

        {/* Task header */}
        <div style={{ padding: '18px 20px', borderBottom: `1px solid ${t.strokeLight}` }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: t.brand, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>
                Task {task.id} {task.optional && <span style={{ color: t.warning, marginLeft: 6 }}>Optional</span>}
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: t.textHeader }}>{task.name}</h2>
              {task.subtitle && <p style={{ fontSize: 13, color: t.textDetail, marginTop: 2 }}>{task.subtitle}</p>}
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: t.textDisabled, flexShrink: 0 }}>{task.timeMinutes}m</div>
          </div>

          {/* Why we're asking — quiet, right under task name */}
          {task.learnWhy && (
            <p style={{ fontSize: 12, color: t.textDetail, fontStyle: 'italic', marginTop: 10, lineHeight: 1.5 }}>
              <Lightbulb size={11} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle', color: t.textDetail }} />
              {task.learnWhy}
            </p>
          )}
        </div>

        {/* Script — the star */}
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${t.strokeLight}` }}>
          <button onClick={() => setShowScript(!showScript)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textDetail, fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, marginBottom: showScript ? 10 : 0 }}>
            {showScript ? <EyeOff size={12} /> : <Eye size={12} />}{showScript ? 'Hide' : 'Show'} script
          </button>
          {showScript && (
            <div style={{ background: t.hoverBg, borderRadius: 8, padding: '14px 18px', borderLeft: `3px solid ${t.brand}` }}>
              <p style={{ fontSize: 16, fontStyle: 'italic', color: t.textMain, lineHeight: 1.6 }}>"{task.script}"</p>
            </div>
          )}
        </div>

        {/* Success */}
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${t.strokeLight}`, background: 'rgba(6,130,82,0.04)' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <Target size={14} style={{ color: t.positive, marginTop: 2, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: t.positive, marginBottom: 3 }}>Success looks like</div>
              <p style={{ fontSize: 13, color: t.textSub, lineHeight: 1.5 }}>{task.success}</p>
            </div>
          </div>
        </div>

        {/* Watch for — collapsed */}
        <div style={{ borderBottom: `1px solid ${t.strokeLight}` }}>
          <button onClick={() => toggleSection(`watch-${task.id}`)}
            style={{ width: '100%', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Eye size={13} style={{ color: t.textDetail }} />
              <span style={{ fontSize: 13, color: t.textSub, fontWeight: 500 }}>Watch for</span>
            </div>
            {expandedSections[`watch-${task.id}`] ? <ChevronDown size={14} style={{ color: t.textDetail }} /> : <ChevronRight size={14} style={{ color: t.textDetail }} />}
          </button>
          {expandedSections[`watch-${task.id}`] && (
            <ul style={{ padding: '0 20px 14px 44px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {task.watchFor.map((item, i) => (
                <li key={i} style={{ fontSize: 13, color: t.textSub, lineHeight: 1.5 }}>• {item}</li>
              ))}
            </ul>
          )}
        </div>

        {/* Warning note */}
        {task.note && (
          <div style={{ padding: '12px 20px', borderBottom: `1px solid ${t.strokeLight}`, background: task.note.type === 'warning' ? 'rgba(249,196,0,0.08)' : t.subtleBg }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <AlertTriangle size={13} style={{ color: task.note.type === 'warning' ? t.warning : t.textDetail, flexShrink: 0, marginTop: 1 }} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: t.textSub, marginBottom: 2 }}>{task.note.title}</div>
                <p style={{ fontSize: 12, color: t.textDetail, lineHeight: 1.5 }}>{task.note.content}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tags */}
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${t.strokeLight}` }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: t.textDetail, marginBottom: 8 }}>Quick tags</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {TAGS.map(tag => {
              const active = (taskStat.tags || []).includes(tag.id);
              return (
                <button key={tag.id} onClick={() => toggleTag(tag.id)}
                  style={{ padding: '5px 11px', borderRadius: 20, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                    background: active ? tag.bg : 'transparent',
                    color: active ? tag.color : t.textDetail,
                    border: `1px solid ${active ? tag.color : t.strokeDefault}`,
                    fontWeight: active ? 500 : 400 }}>
                  {tag.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Notes */}
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${t.strokeLight}` }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: t.textDetail, marginBottom: 8 }}>Observations</div>
          <Input value={taskStat.notes || ''} onChange={e => updateStatus(task.id, 'notes', e.target.value)} placeholder="What did you notice?" rows={4} />
        </div>

        {/* Pass / Struggled + Next */}
        <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => updateStatus(task.id, 'success', taskStat.success === true ? null : true)}
              style={{ padding: '7px 14px', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit',
                background: taskStat.success === true ? t.nearPositive : 'transparent',
                color: taskStat.success === true ? t.positive : t.textSub,
                border: `1px solid ${taskStat.success === true ? t.positive : t.strokeDefault}` }}>
              <CheckCircle2 size={14} />Pass
            </button>
            <button onClick={() => updateStatus(task.id, 'success', taskStat.success === false ? null : false)}
              style={{ padding: '7px 14px', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit',
                background: taskStat.success === false ? t.nearNegative : 'transparent',
                color: taskStat.success === false ? t.negative : t.textSub,
                border: `1px solid ${taskStat.success === false ? t.negative : t.strokeDefault}` }}>
              <AlertTriangle size={14} />Struggled
            </button>
          </div>
          <Btn variant="primary" onClick={() => { updateStatus(task.id, 'done', true); onNext(); }}>
            {currentIndex < tasks.length - 1 ? 'Next →' : 'Finish Tasks →'}
          </Btn>
        </div>
      </Card>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
        <button onClick={onPrev} disabled={currentIndex === 0}
          style={{ background: 'none', border: 'none', cursor: currentIndex === 0 ? 'not-allowed' : 'pointer', color: t.textDetail, fontSize: 13, opacity: currentIndex === 0 ? 0.3 : 1 }}>
          ← Previous
        </button>
        <button onClick={() => updateStatus(task.id, 'done', !taskStat.done)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: taskStat.done ? t.positive : t.textDetail, fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}>
          {taskStat.done ? <CheckSquare size={14} /> : <Square size={14} />}Mark as done
        </button>
      </div>
    </div>
  );
}

// ─── Wrapup phase ─────────────────────────────────────────────────────────────
function WrapupPhase({ wrapup, observerNotes, status, setStatus, sessionNotes, setSessionNotes, onFinish }) {
  return (
    <div style={{ maxWidth: 600, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ padding: '24px 0 8px' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: t.textHeader, marginBottom: 4 }}>Wrap-up</h2>
        <p style={{ fontSize: 13, color: t.textSub }}>{wrapup.intro}</p>
      </div>

      {wrapup.questions.map(q => (
        <Card key={q.id} style={{ padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: t.textSub, marginBottom: 4 }}>{q.label}</div>
          <p style={{ fontSize: 15, fontStyle: 'italic', color: t.textMain, marginBottom: 12 }}>"{q.question}"</p>
          <Input value={status[q.id]?.notes || ''} onChange={e => setStatus(p => ({ ...p, [q.id]: { notes: e.target.value } }))} placeholder="Their response..." rows={3} />
        </Card>
      ))}

      {observerNotes && observerNotes.length > 0 && (
        <Card style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Users size={14} style={{ color: t.textDetail }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: t.textSub }}>Observer reference</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {observerNotes.map((note, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 12, paddingBottom: 8, borderBottom: i < observerNotes.length - 1 ? `1px solid ${t.strokeLight}` : 'none' }}>
                <span style={{ color: t.textMain }}>{note.behavior}</span>
                <span style={{ color: t.textDetail }}>→ {note.meaning}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <FileText size={14} style={{ color: t.textDetail }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: t.textSub }}>General notes</span>
        </div>
        <Input value={sessionNotes} onChange={e => setSessionNotes(e.target.value)} placeholder="Overall impressions, notable quotes..." rows={5} />
      </Card>

      <Btn variant="positive" onClick={onFinish} style={{ width: '100%', justifyContent: 'center', padding: '13px 0', fontSize: 15 }}>
        Complete Session →
      </Btn>
    </div>
  );
}
