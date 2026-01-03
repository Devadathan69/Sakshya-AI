import React, { useState } from 'react';
import type { ReportRow } from '../types';

interface Props {
    rows: ReportRow[];
}

const SeverityBadge = ({ severity }: { severity: string }) => {
    // Badges can remain somewhat static or use specific semantic colors that work on both
    // For now, let's keep them colorful but maybe adjust borders
    const colors = {
        Minor: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-300 border-yellow-500/50",
        Material: "bg-orange-500/10 text-orange-600 dark:text-orange-300 border-orange-500/50",
        Critical: "bg-red-500/10 text-red-600 dark:text-red-300 border-red-500/50",
    };

    return (
        <span className={`px-2 py-1 rounded border text-xs font-bold uppercase ${colors[severity as keyof typeof colors] || "bg-gray-500"}`}>
            {severity}
        </span>
    );
};

const ConfrontationTable: React.FC<Props> = ({ rows }) => {
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const toggleExpand = (id: string) => {
        setExpandedId(expandedId === id ? null : id);
    };

    return (
        <div className="overflow-x-auto rounded-lg border shadow-xl" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
            <table className="w-full text-left text-sm" style={{ color: 'var(--text-secondary)' }}>
                <thead className="text-xs uppercase" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>
                    <tr>
                        <th className="px-6 py-4">Severity</th>
                        <th className="px-6 py-4" title="Classification reflects semantic inconsistency, not truthfulness or credibility.">
                            Classification
                            <span className="ml-1 cursor-help opacity-70">ℹ️</span>
                        </th>
                        <th className="px-6 py-4">Prior Statement (FIR)</th>
                        <th className="px-6 py-4">Later Statement (Deposition)</th>
                        <th className="px-6 py-4">Legal Basis</th>
                    </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
                    {rows.map((row) => (
                        <React.Fragment key={row.id}>
                            <tr
                                className={`cursor-pointer transition-colors ${expandedId === row.id ? "bg-amber-500/5" : "hover:bg-slate-100 dark:hover:bg-slate-800/50"}`}
                                onClick={() => toggleExpand(row.id)}
                            >
                                <td className="px-6 py-4"><SeverityBadge severity={row.severity} /></td>
                                <td className="px-6 py-4 font-medium capitalize" style={{ color: 'var(--text-primary)' }}>{row.classification.replace('_', ' ')}</td>
                                <td className="px-6 py-4 max-w-xs truncate" title={row.source_1}>{row.source_1}</td>
                                <td className="px-6 py-4 max-w-xs truncate" title={row.source_2}>{row.source_2}</td>
                                <td className="px-6 py-4 opacity-70">Click to expand...</td>
                            </tr>
                            {expandedId === row.id && (
                                <tr style={{ backgroundColor: 'var(--bg-primary)' }}>
                                    <td colSpan={5} className="px-6 py-4">
                                        <div className="space-y-4 rounded p-4 border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
                                            <div>
                                                <h4 className="text-xs font-bold uppercase mb-1 opacity-70">Legal Logic</h4>
                                                <p style={{ color: 'var(--text-primary)' }}>{row.legal_basis}</p>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="p-3 rounded border" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
                                                    <h4 className="text-xs font-bold uppercase mb-2 opacity-70">Source Reference A</h4>
                                                    <p className="italic" style={{ color: 'var(--text-secondary)' }}>"{row.source_sentence_refs[0]}"</p>
                                                </div>
                                                <div className="p-3 rounded border" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
                                                    <h4 className="text-xs font-bold uppercase mb-2 opacity-70">Source Reference B</h4>
                                                    <p className="italic" style={{ color: 'var(--text-secondary)' }}>"{row.source_sentence_refs[1]}"</p>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </React.Fragment>
                    ))}
                    {rows.length === 0 && (
                        <tr>
                            <td colSpan={5} className="px-6 py-8 text-center" style={{ color: 'var(--text-secondary)' }}>
                                No discrepancies found. Statements appear consistent.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
            <div className="px-6 py-2 border-t text-xs italic text-center opacity-60" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>
                This analysis is structured for witness confrontation under Section 145 of the Bharatiya Sakshya Adhiniyam.
            </div>
        </div>
    );
};

export default ConfrontationTable;
