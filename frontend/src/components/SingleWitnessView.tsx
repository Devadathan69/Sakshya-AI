import { useRef, useState } from 'react';
import type { AnalysisReport } from '../types';
import ConfrontationTable from './ConfrontationTable';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function SingleWitnessView() {
    const { user } = useAuth();
    const [s1Text, setS1Text] = useState("");
    const [s1Type, setS1Type] = useState("FIR");
    const [s2Text, setS2Text] = useState("");
    const [s2Type, setS2Type] = useState("Section 161");
    const [loading, setLoading] = useState(false);
    const [report, setReport] = useState<AnalysisReport | null>(null);

    // Audio recording state
    const [recordingTarget, setRecordingTarget] = useState<'s1' | 's2' | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const [transcribingTarget, setTranscribingTarget] = useState<'s1' | 's2' | null>(null);
    const [uploadingDocTarget, setUploadingDocTarget] = useState<'s1' | 's2' | null>(null);

    const handleFileUpload = async (
        e: React.ChangeEvent<HTMLInputElement>,
        setText: React.Dispatch<React.SetStateAction<string>>,
        type: string,
        target: 's1' | 's2'
    ) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];

        setUploadingDocTarget(target);
        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("statement_type", type);

            const response = await fetch(`${API_BASE}/upload-document`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const contentType = response.headers.get("content-type");
                if (contentType && contentType.includes("application/json")) {
                    const err = await response.json();
                    throw new Error(err.detail || "Upload failed");
                } else {
                    const textErr = await response.text();
                    throw new Error("Server Error: " + textErr);
                }
            }

            const data = await response.json();
            const preview = typeof data.content_preview === 'string' ? data.content_preview : String(data.content_preview || '');
            setText(preview);
            alert(`Extracted text from ${data.filename}. Preview: ${preview.slice(0, 200)}\n\nPlease review and edit if necessary.`);
        } catch (err) {
            console.error(err);
            alert("Failed to upload/extract text: " + (err as Error).message);
        } finally {
            setUploadingDocTarget(null);
            e.target.value = '';
        }
    };

    const callSpeechToText = async (
        audioBlob: Blob,
        setText: React.Dispatch<React.SetStateAction<string>>,
        statementType: string
    ) => {
        const formData = new FormData();
        formData.append('file', audioBlob, 'audio.webm');
        formData.append('statement_type', statementType);

        try {
            const response = await fetch(`${API_BASE}/speech-to-text`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const maybeJson = await response.text();
                throw new Error(`STT failed: ${maybeJson}`);
            }

            const data = await response.json();
            const text = typeof data.text === 'string' ? data.text : String(data.text || '');
            setText(prev => (prev ? prev + '\n' + text : text));
        } catch (err) {
            console.error('Speech-to-text error', err);
            alert('Failed to transcribe audio: ' + (err as Error).message);
        }
    };

    const handleAudioUpload = async (
        e: React.ChangeEvent<HTMLInputElement>,
        setText: React.Dispatch<React.SetStateAction<string>>,
        statementType: string,
        target: 's1' | 's2',
    ) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];

        setTranscribingTarget(target);
        try {
            await callSpeechToText(file, setText, statementType);
        } finally {
            setTranscribingTarget(null);
            e.target.value = '';
        }
    };

    const startRecording = async (target: 's1' | 's2') => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert('Audio recording is not supported in this browser.');
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const targetSetter = target === 's1' ? setS1Text : setS2Text;

                setTranscribingTarget(target);
                try {
                    await callSpeechToText(audioBlob, targetSetter, target === 's1' ? s1Type : s2Type);
                } catch (e) {
                    console.error(e);
                } finally {
                    setTranscribingTarget(null);
                    setRecordingTarget(null); // CRITICAL: Always reset UI state
                    stream.getTracks().forEach(t => t.stop());
                }
            };

            mediaRecorderRef.current = mediaRecorder;
            mediaRecorder.start();
            setRecordingTarget(target);
        } catch (err) {
            console.error('Error starting recording', err);
            alert('Could not access microphone: ' + (err as Error).message);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
    };

    const saveHistory = async (reportData: AnalysisReport) => {
        if (!user) return;

        try {
            const summary = {
                critical: reportData.rows.filter(r => r.severity === 'Critical').length,
                material: reportData.rows.filter(r => r.severity === 'Material').length,
                minor: reportData.rows.filter(r => r.severity === 'Minor').length,
                omission: reportData.rows.filter(r => r.classification === 'omission').length
            };

            const actorsSet = new Set<string>();
            reportData.rows.forEach(row => {
                const match = row.source_1.match(/:\s*([^ ]+)/);
                if (match && match[1]) actorsSet.add(match[1]);
            });
            const actors = Array.from(actorsSet).slice(0, 3);

            await addDoc(collection(db, 'analysis_history'), {
                userId: user.uid,
                caseId: `CASE-${Date.now()}`,
                title: `Analysis: ${s1Type} vs ${s2Type}`,
                previewText: s1Text.slice(0, 150) + (s1Text.length > 150 ? "..." : ""),
                actors: actors,
                createdAt: serverTimestamp(),
                detectedLanguage: reportData.input_language,
                summary
            });
            console.log("Analysis history saved.");
        } catch (err) {
            console.error("Failed to save history:", err);
        }
    };

    const handleAnalyze = async () => {
        setLoading(true);
        setReport(null);
        try {
            const response = await fetch(`${API_BASE}/analyze`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    statement_1_text: s1Text,
                    statement_1_type: s1Type,
                    statement_2_text: s2Text,
                    statement_2_type: s2Type,
                }),
            });

            if (!response.ok) throw new Error("Analysis failed");

            const data = await response.json();
            setReport(data);

            if (user) {
                saveHistory(data);
            }

        } catch (error) {
            console.error("Fetch error details:", error);
            alert(`Error analyzing statements: ${(error as Error).message}. Check console for details.`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="animate-slide-up pb-20 max-w-6xl mx-auto">
            {/* Header / Intro */}
            {!report && !loading && (
                <div className="mb-12 border-b pb-6 flex justify-between items-end" style={{ borderColor: 'var(--border-color)' }}>
                    <div>
                        <h2 className="text-4xl font-serif mb-2" style={{ color: 'var(--text-primary)' }}>Single Witness Analysis</h2>
                        <p className="font-mono text-xs text-amber-600 dark:text-amber-500 uppercase tracking-widest">
                            Sequence Comparison // FIR vs Deposition
                        </p>
                    </div>
                </div>
            )}

            {/* Input Section */}
            {!report && !loading && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    {/* Statement 1 Panel */}
                    <div className="legal-panel p-0 group">
                        <div className="p-4 border-b flex justify-between items-center text-xs font-mono uppercase tracking-wider" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
                            <span>STATEMENT 01</span>
                        </div>
                        <div className="p-6">
                            <div className="mb-6">
                                <label className="text-[10px] uppercase font-bold block mb-2 tracking-widest" style={{ color: 'var(--text-secondary)' }}>Type</label>
                                <select
                                    value={s1Type}
                                    onChange={(e) => setS1Type(e.target.value)}
                                    className="input-field w-full text-xs"
                                >
                                    <option value="FIR">FIR</option>
                                    <option value="Section 161">Section 161</option>
                                    <option value="Court Deposition">Court Deposition</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-2 mb-2">
                                <input type="file" id="file-1" className="hidden" accept=".pdf,.png,.jpg" onChange={(e) => handleFileUpload(e, setS1Text, s1Type, 's1')} />
                                <label htmlFor="file-1" className="cursor-pointer text-xs px-3 py-2 border transition-colors flex items-center gap-2 font-mono group-hover/btn:text-white"
                                    style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
                                    <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                    UPLOAD DOC
                                </label>

                                <input type="file" id="audio-1" className="hidden" accept="audio/*" onChange={(e) => handleAudioUpload(e, setS1Text, s1Type, 's1')} />
                                <label htmlFor="audio-1" className="cursor-pointer text-xs px-3 py-2 border transition-colors flex items-center gap-2 font-mono"
                                    style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
                                    <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                                    UPLOAD AUDIO
                                </label>

                                <button
                                    onClick={() => recordingTarget === 's1' ? stopRecording() : startRecording('s1')}
                                    className={`text-xs px-3 py-2 border flex items-center gap-2 transition-all font-mono ${recordingTarget === 's1' ? "bg-red-900/50 border-red-500 text-red-200 animate-pulse" : ""}`}
                                    style={recordingTarget !== 's1' ? { backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' } : {}}
                                >
                                    {recordingTarget === 's1' ? (
                                        <><div className="w-2 h-2 bg-red-500 rounded-full animate-ping" /> STOP REC</>
                                    ) : (
                                        <><svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg> MIC INPUT</>
                                    )}
                                </button>

                                <div className="flex-1"></div>
                                {(transcribingTarget === 's1' || uploadingDocTarget === 's1') && (
                                    <div className="text-[10px] font-mono text-amber-500 animate-pulse flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" /> PROCESSING...
                                    </div>
                                )}
                            </div>

                            <textarea
                                value={s1Text}
                                onChange={(e) => setS1Text(e.target.value)}
                                className="input-field w-full h-80 resize-none mb-0 font-mono text-xs leading-relaxed border-t"
                                style={{ borderColor: 'var(--border-color)' }}
                                placeholder=">> Paste first statement text here..."
                            />
                        </div>
                    </div>

                    {/* Statement 2 Panel */}
                    <div className="legal-panel p-0 group">
                        <div className="p-4 border-b flex justify-between items-center text-xs font-mono uppercase tracking-wider" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
                            <span>STATEMENT 02</span>
                        </div>
                        <div className="p-6">
                            <div className="mb-6">
                                <label className="text-[10px] uppercase font-bold block mb-2 tracking-widest" style={{ color: 'var(--text-secondary)' }}>Type</label>
                                <select
                                    value={s2Type}
                                    onChange={(e) => setS2Type(e.target.value)}
                                    className="input-field w-full text-xs"
                                >
                                    <option value="FIR">FIR</option>
                                    <option value="Section 161">Section 161</option>
                                    <option value="Court Deposition">Court Deposition</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-2 mb-2">
                                <input type="file" id="file-2" className="hidden" accept=".pdf,.png,.jpg" onChange={(e) => handleFileUpload(e, setS2Text, s2Type, 's2')} />
                                <label htmlFor="file-2" className="cursor-pointer text-xs px-3 py-2 border transition-colors flex items-center gap-2 font-mono group-hover/btn:text-white"
                                    style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
                                    <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                    UPLOAD DOC
                                </label>

                                <input type="file" id="audio-2" className="hidden" accept="audio/*" onChange={(e) => handleAudioUpload(e, setS2Text, s2Type, 's2')} />
                                <label htmlFor="audio-2" className="cursor-pointer text-xs px-3 py-2 border transition-colors flex items-center gap-2 font-mono"
                                    style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
                                    <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                                    UPLOAD AUDIO
                                </label>

                                <button
                                    onClick={() => recordingTarget === 's2' ? stopRecording() : startRecording('s2')}
                                    className={`text-xs px-3 py-2 border flex items-center gap-2 transition-all font-mono ${recordingTarget === 's2' ? "bg-red-900/50 border-red-500 text-red-200 animate-pulse" : ""}`}
                                    style={recordingTarget !== 's2' ? { backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' } : {}}
                                >
                                    {recordingTarget === 's2' ? (
                                        <><div className="w-2 h-2 bg-red-500 rounded-full animate-ping" /> STOP REC</>
                                    ) : (
                                        <><svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg> MIC INPUT</>
                                    )}
                                </button>

                                <div className="flex-1"></div>
                                {(transcribingTarget === 's2' || uploadingDocTarget === 's2') && (
                                    <div className="text-[10px] font-mono text-amber-500 animate-pulse flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" /> PROCESSING...
                                    </div>
                                )}
                            </div>

                            <textarea
                                value={s2Text}
                                onChange={(e) => setS2Text(e.target.value)}
                                className="input-field w-full h-80 resize-none mb-0 font-mono text-xs leading-relaxed border-t"
                                style={{ borderColor: 'var(--border-color)' }}
                                placeholder=">> Paste second statement text here..."
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Action Button */}
            {!report && !loading && (
                <div className="flex justify-start pt-8 border-t mt-8" style={{ borderColor: 'var(--border-color)' }}>
                    <button
                        onClick={handleAnalyze}
                        disabled={!s1Text || !s2Text}
                        className="btn-primary text-sm uppercase tracking-widest px-12 py-4 w-full md:w-auto"
                    >
                        INITIATE SEQUENCE ANALYSIS
                    </button>
                </div>
            )}

            {/* Loading Overlay */}
            {loading && (
                <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center backdrop-blur-md" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="legal-panel p-8 flex flex-col items-center shadow-2xl">
                        <div className="relative w-16 h-16 mb-6">
                            <div className="absolute inset-0 border-4 border-slate-700 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin"></div>
                        </div>
                        <h3 className="text-xl font-serif font-bold mb-2 text-white">Analyzing Discrepancies</h3>
                        <p className="font-mono text-xs uppercase tracking-widest text-slate-400 animate-pulse">Cross-referencing legal texts...</p>
                    </div>
                </div>
            )}

            {/* Report Section */}
            {report && (
                <div className="animate-fade-in space-y-8">
                    <div className="flex flex-col md:flex-row justify-between items-end p-6 border backdrop-blur-sm" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
                        <div>
                            <span className="text-amber-600 dark:text-amber-500 text-xs font-bold uppercase tracking-wider mb-2 block">Analysis Complete</span>
                            <h2 className="text-3xl font-serif font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Analysis Report</h2>
                            {report.input_language !== 'en' && (
                                <span className="text-xs mt-1 font-mono" style={{ color: 'var(--text-secondary)' }}>
                                    DETECTED LANGUAGE: {report.input_language.toUpperCase()}
                                </span>
                            )}
                        </div>
                        <button onClick={() => setReport(null)} className="btn-secondary text-sm mt-4 md:mt-0">
                            &larr; Return to Inputs
                        </button>
                    </div>

                    <ConfrontationTable rows={report.rows} />

                    <div className="p-6 border text-xs leading-relaxed font-mono" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
                        <p className="font-bold mb-2 uppercase tracking-wider opacity-70">Legal Disclaimer</p>
                        <p>{report.disclaimer}</p>
                    </div>

                    <div className="mt-8 pt-8 border-t text-[10px] font-mono" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
                        <details>
                            <summary className="cursor-pointer hover:text-amber-500 transition-colors uppercase tracking-widest">Debug JSON Stream</summary>
                            <pre className="mt-4 p-4 border overflow-auto h-64" style={{ backgroundColor: '#050a15', borderColor: 'var(--border-color)', color: '#94a3b8' }}>
                                {JSON.stringify(report, null, 2)}
                            </pre>
                        </details>
                    </div>
                </div>
            )}
        </div>
    )
}
