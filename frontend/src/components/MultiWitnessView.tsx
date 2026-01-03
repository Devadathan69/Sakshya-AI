import React, { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import ConfrontationTable from './ConfrontationTable';
import type { ReportRow } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '';

interface WitnessInput {
    id: string; // Internal ID for React keys
    name: string; // User-facing ID (e.g., "PW-1")
    type: string; // FIR, 161, etc.
    text: string;
}

interface MultiAnalyzeResponse {
    input_language: string;
    analysis_language: string;
    consolidated_report: ReportRow[];
    disclaimer: string;
}

export default function MultiWitnessView() {
    const { user } = useAuth();

    // State for Dynamic Witnesses
    const [witnesses, setWitnesses] = useState<WitnessInput[]>([
        { id: 'w1', name: 'Witness 1', type: 'FIR', text: '' },
        { id: 'w2', name: 'Witness 2', type: 'Section 161', text: '' }
    ]);

    const [loading, setLoading] = useState(false);
    const [report, setReport] = useState<MultiAnalyzeResponse | null>(null);
    const [transcribingId, setTranscribingId] = useState<string | null>(null);

    // Audio Refs
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const [recordingId, setRecordingId] = useState<string | null>(null);

    // --- Helper Functions ---

    const addWitness = () => {
        const nextNum = witnesses.length + 1;
        setWitnesses([
            ...witnesses,
            { id: `w${Date.now()}`, name: `Witness ${nextNum}`, type: 'Court Deposition', text: '' }
        ]);
    };

    const removeWitness = (id: string) => {
        if (witnesses.length <= 2) {
            alert("Minimum 2 witnesses required for comparison.");
            return;
        }
        setWitnesses(witnesses.filter(w => w.id !== id));
    };

    const updateWitness = (id: string, field: keyof WitnessInput, value: string) => {
        setWitnesses(prev => prev.map(w => w.id === id ? { ...w, [field]: value } : w));
    };

    // --- API Interactions (Reused & Adapted) ---

    // Generic STT handler
    const callSpeechToText = async (audioBlob: Blob, witnessId: string, statementType: string) => {
        const formData = new FormData();
        formData.append('file', audioBlob, 'audio.webm');
        formData.append('statement_type', statementType);

        try {
            const response = await fetch(`${API_BASE}/speech-to-text`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const maybeText = await response.text();
                throw new Error(`STT Error: ${maybeText}`);
            }

            const data = await response.json();

            // Use functional update to ensure we append to the LATEST text
            setWitnesses(prev => prev.map(w => {
                if (w.id === witnessId) {
                    const newText = w.text ? w.text + '\n' + data.text : data.text;
                    return { ...w, text: newText };
                }
                return w;
            }));

        } catch (err) {
            console.error(err);
            alert(`Transcription failed: ${(err as Error).message}`);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, witnessId: string, type: string) => {
        if (!e.target.files?.length) return;
        const file = e.target.files[0];
        setLoading(true); // Specific loading state if needed

        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("statement_type", type);

            const response = await fetch(`${API_BASE}/upload-document`, { method: 'POST', body: formData });
            if (!response.ok) throw new Error("Upload failed");

            const data = await response.json();
            updateWitness(witnessId, 'text', data.content_preview);
            alert(`Extracted text for ${witnesses.find(w => w.id === witnessId)?.name || 'Witness'}`);
        } catch (err) {
            alert("Upload failed: " + (err as Error).message);
        } finally {
            setLoading(false);
            e.target.value = '';
        }
    };

    const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>, witnessId: string, type: string) => {
        if (!e.target.files?.length) return;
        setTranscribingId(witnessId);
        try {
            await callSpeechToText(e.target.files[0], witnessId, type);
        } finally {
            setTranscribingId(null);
            e.target.value = '';
        }
    };

    // --- Recording Logic ---
    const startRecording = async (witnessId: string) => {
        if (!navigator.mediaDevices?.getUserMedia) {
            alert("Microphone access not supported.");
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const w = witnesses.find(x => x.id === witnessId);

                try {
                    if (w) {
                        setTranscribingId(witnessId);
                        await callSpeechToText(audioBlob, witnessId, w.type);
                    }
                } catch (e) {
                    console.error("Transcription error in onstop:", e);
                } finally {
                    setTranscribingId(null);
                    setRecordingId(null); // CRITICAL: Always reset UI state
                    stream.getTracks().forEach(t => t.stop());
                }
            };

            mediaRecorderRef.current = mediaRecorder;
            mediaRecorder.start();
            setRecordingId(witnessId);
        } catch (err) {
            console.error(err);
            alert("Could not start recording.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
    };

    // --- Main Analysis ---

    const handleAnalyze = async () => {
        // Validate
        if (witnesses.some(w => !w.text.trim())) {
            alert("All witnesses must have statement text.");
            return;
        }

        setLoading(true);
        setReport(null);

        try {
            const payload = {
                witnesses: witnesses.map(w => ({
                    id: w.id,
                    name: w.name,
                    text: w.text,
                    type: w.type
                }))
            };

            const res = await fetch(`${API_BASE}/analyze-multi`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const err = await res.text();
                throw new Error(err);
            }

            const data: MultiAnalyzeResponse = await res.json();
            setReport(data);

            // Save History (Simplified for Multi-mode)
            if (user) {
                await addDoc(collection(db, 'analysis_history'), {
                    userId: user.uid,
                    caseId: `MULTI-${Date.now()}`,
                    title: `Multi-Witness Analysis (${witnesses.length} Statements)`,
                    previewText: witnesses.map(w => w.name).join(", "),
                    actors: [], // Can extract later
                    createdAt: serverTimestamp(),
                    detectedLanguage: data.input_language,
                    summary: {
                        critical: data.consolidated_report.filter(r => r.severity === 'Critical').length,
                        material: 0, minor: 0, omission: 0 // populate fully if needed
                    }
                });
            }

        } catch (err) {
            console.error(err);
            alert("Analysis Failed: " + (err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="animate-slide-up pb-20 max-w-6xl mx-auto">
            {/* Header / Intro */}
            {!report && (
                <div className="mb-12 border-b pb-6 flex justify-between items-end" style={{ borderColor: 'var(--border-color)' }}>
                    <div>
                        <h2 className="text-4xl font-serif mb-2" style={{ color: 'var(--text-primary)' }}>Multi-Witness Matrix</h2>
                        <p className="font-mono text-xs text-amber-600 dark:text-amber-500 uppercase tracking-widest">
                            Cross-Examination Module // N*N Analysis
                        </p>
                    </div>
                    <button
                        onClick={addWitness}
                        className="btn-secondary text-xs uppercase tracking-wider flex items-center gap-2"
                        style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
                    >
                        <span>+ Add Witness</span>
                    </button>
                </div>
            )}

            {/* Witness Cards Grid */}
            {!report && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {witnesses.map((w, idx) => (
                            <div key={w.id} className="legal-panel p-0 group">
                                {/* Header Strip */}
                                <div className="p-4 border-b flex justify-between items-center text-xs font-mono uppercase tracking-wider" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
                                    <span>STATEMENT #{idx + 1}</span>
                                    <button
                                        onClick={() => removeWitness(w.id)}
                                        className="hover:text-red-500 transition-colors"
                                    >
                                        [ DISCARD ]
                                    </button>
                                </div>

                                <div className="p-6">
                                    {/* Witness Header Inputs */}
                                    <div className="flex gap-4 mb-6">
                                        <div className="flex-1">
                                            <label className="text-[10px] uppercase font-bold block mb-2 tracking-widest" style={{ color: 'var(--text-secondary)' }}>Witness Identity</label>
                                            <input
                                                value={w.name}
                                                onChange={(e) => updateWitness(w.id, 'name', e.target.value)}
                                                className="input-field w-full text-lg font-serif"
                                                placeholder="Name / ID..."
                                            />
                                        </div>
                                        <div className="w-1/3">
                                            <label className="text-[10px] uppercase font-bold block mb-2 tracking-widest" style={{ color: 'var(--text-secondary)' }}>Type</label>
                                            <select
                                                value={w.type}
                                                onChange={(e) => updateWitness(w.id, 'type', e.target.value)}
                                                className="input-field w-full text-xs"
                                            >
                                                <option value="FIR">FIR</option>
                                                <option value="Section 161">Sec 161</option>
                                                <option value="Court Deposition">Deposition</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Action Toolbar */}
                                    <div className="flex items-center gap-2 mb-2">
                                        <input type="file" id={`file-${w.id}`} className="hidden" accept=".pdf,.png,.jpg" onChange={(e) => handleFileUpload(e, w.id, w.type)} />
                                        <label htmlFor={`file-${w.id}`} className="cursor-pointer text-xs px-3 py-2 border transition-colors flex items-center gap-2 font-mono"
                                            style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
                                            <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                            DOC
                                        </label>

                                        <input type="file" id={`audio-${w.id}`} className="hidden" accept="audio/*" onChange={(e) => handleAudioUpload(e, w.id, w.type)} />
                                        <label htmlFor={`audio-${w.id}`} className="cursor-pointer text-xs px-3 py-2 border transition-colors flex items-center gap-2 font-mono"
                                            style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
                                            <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                                            AUDIO
                                        </label>

                                        <button
                                            onClick={() => recordingId === w.id ? stopRecording() : startRecording(w.id)}
                                            className={`text-xs px-3 py-2 border flex items-center gap-2 transition-all font-mono ${recordingId === w.id ? "bg-red-900/50 border-red-500 text-red-200 animate-pulse" : ""}`}
                                            style={recordingId !== w.id ? { backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' } : {}}

                                        >
                                            {recordingId === w.id ? (
                                                <><div className="w-2 h-2 bg-red-500 rounded-full animate-ping" /> STOP</>
                                            ) : (
                                                <><svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg> MIC</>
                                            )}
                                        </button>

                                        <div className="flex-1"></div>
                                        {transcribingId === w.id && <div className="text-[10px] font-mono text-amber-500 animate-pulse flex items-center gap-2"><div className="w-1.5 h-1.5 bg-amber-500 rounded-full" /> PROCESSING...</div>}
                                    </div>

                                    {/* Text Area */}
                                    <textarea
                                        value={w.text}
                                        onChange={(e) => updateWitness(w.id, 'text', e.target.value)}
                                        className="input-field w-full h-40 resize-none mb-4 font-mono text-xs leading-relaxed border-t"
                                        style={{ borderColor: 'var(--border-color)' }}
                                        placeholder=">> Enter witness statement transcript..."
                                    />
                                </div>
                            </div>
                        ))}

                        {/* Empty State / Add Placeholder */}
                        {witnesses.length === 0 && (
                            <div className="col-span-2 border border-dashed rounded p-12 text-center opacity-50" style={{ borderColor: 'var(--border-color)' }}>
                                <p className="font-serif italic" style={{ color: 'var(--text-secondary)' }}>No witnesses added yet to the dossier.</p>
                            </div>
                        )}
                    </div>


                    {/* Analyze Button */}
                    <div className="flex justify-start pt-8 border-t mt-8" style={{ borderColor: 'var(--border-color)' }}>
                        <button
                            onClick={handleAnalyze}
                            disabled={loading || witnesses.length < 2}
                            className="btn-primary text-sm uppercase tracking-widest px-12 py-4 w-full md:w-auto"
                        >
                            {loading ? "PROCESSING DATA..." : "INITIATE ANALYSIS"}
                        </button>
                    </div>
                </div>
            )}

            {/* Loading Overlay */}
            {loading && (
                <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center backdrop-blur-md" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="legal-panel p-8 flex flex-col items-center shadow-2xl">
                        <div className="relative w-16 h-16 mb-6">
                            <div className="absolute inset-0 border-4 border-slate-700 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Analyzing Evidence</h3>
                        <p className="animate-pulse" style={{ color: 'var(--text-secondary)' }}>Cross-referencing {witnesses.length} statements for contradictions...</p>
                    </div>
                </div>
            )}

            {/* Results Section */}
            {report && (
                <div className="animate-fade-in space-y-8">
                    <div className="flex flex-col md:flex-row justify-between items-end p-6 rounded-xl border backdrop-blur-sm" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
                        <div>
                            <span className="text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider mb-2 block">Analysis Complete</span>
                            <h2 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Consolidated Report</h2>
                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                Detected <strong>{report.consolidated_report.length}</strong> significant observations across {witnesses.length} witnesses.
                            </p>
                        </div>
                        <button onClick={() => setReport(null)} className="btn-secondary text-sm mt-4 md:mt-0">
                            ← Edit Inputs
                        </button>
                    </div>

                    <ConfrontationTable rows={report.consolidated_report} />

                    <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/10 text-xs text-blue-600/60 dark:text-blue-200/60 text-center leading-relaxed max-w-2xl mx-auto">
                        {report.disclaimer}
                    </div>
                </div>
            )}
        </div>
    );
}
