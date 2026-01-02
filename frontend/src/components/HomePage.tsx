import React from 'react';

interface HomePageProps {
    onSelectMode: (mode: 'single' | 'multi') => void;
}

const HomePage: React.FC<HomePageProps> = ({ onSelectMode }) => {
    return (
        <div className="flex flex-col lg:flex-row min-h-[80vh] w-full max-w-7xl mx-auto items-center animate-fade-in gap-12 lg:gap-24 px-6 relative">

            {/* Left Column: Editorial / Brand */}
            <div className="flex-1 text-left z-10">
                <div className="mb-8 inline-block border-b border-amber-500/50 pb-2">
                    <span className="font-mono text-amber-500 text-sm tracking-[0.2em] uppercase">System v2.0 Ready</span>
                </div>

                <h1 className="text-6xl lg:text-8xl font-serif font-bold text-slate-100 leading-[0.9] mb-8 tracking-tight">
                    Sakshya <br />
                    <span className="text-slate-500 italic">Intellect.</span>
                </h1>

                <p className="text-lg text-slate-400 max-w-lg leading-relaxed font-light mb-10 border-l-2 border-slate-800 pl-6">
                    Automated consistency verification for the Indian Judiciary.
                    <br />Analyze, Cross-Reference, Adjudicate.
                </p>

                <div className="flex gap-8 text-xs font-mono text-slate-500 uppercase tracking-widest">
                    <div>
                        <span className="block text-slate-300 mb-1">Engine</span>
                        Hybrid LLM
                    </div>
                    <div>
                        <span className="block text-slate-300 mb-1">Compliance</span>
                        BNSS Sec 145
                    </div>
                </div>
            </div>

            {/* Right Column: Interaction Modules */}
            <div className="flex-1 w-full max-w-md z-10 flex flex-col gap-4">

                {/* Module 1: Single Witness */}
                <button
                    onClick={() => onSelectMode('single')}
                    className="legal-panel group p-6 text-left hover:border-amber-500/30 transition-all hover:translate-x-2 duration-300"
                >
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="text-2xl text-slate-200 group-hover:text-amber-400 transition-colors">Single Witness Analysis</h3>
                        <span className="font-mono text-xs text-slate-600">MOD-01</span>
                    </div>
                    <p className="text-sm text-slate-500 mb-4 font-mono">
                        Sequence Comparison: FIR vs Deposition.
                    </p>
                    <div className="h-[1px] w-full bg-slate-800 group-hover:bg-amber-500/30 transition-colors"></div>
                    <div className="mt-4 flex items-center justify-between">
                        <div className="flex gap-2">
                            <div className="h-1.5 w-1.5 bg-green-500 rounded-full"></div>
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider">Active</span>
                        </div>
                        <span className="text-amber-500 text-lg font-serif italic opacity-0 group-hover:opacity-100 transition-all">Proceed &rarr;</span>
                    </div>
                </button>

                {/* Module 2: Multi Witness */}
                <button
                    onClick={() => onSelectMode('multi')}
                    className="legal-panel group p-6 text-left hover:border-amber-500/30 transition-all hover:translate-x-2 duration-300"
                >
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="text-2xl text-slate-200 group-hover:text-amber-400 transition-colors">Multi-Witness Matrix</h3>
                        <span className="font-mono text-xs text-slate-600">MOD-02</span>
                    </div>
                    <p className="text-sm text-slate-500 mb-4 font-mono">
                        N*N Cross-Verification. Parallel processing.
                    </p>
                    <div className="h-[1px] w-full bg-slate-800 group-hover:bg-amber-500/30 transition-colors"></div>
                    <div className="mt-4 flex items-center justify-between">
                        <div className="flex gap-2">
                            <div className="h-1.5 w-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider">New Engine</span>
                        </div>
                        <span className="text-amber-500 text-lg font-serif italic opacity-0 group-hover:opacity-100 transition-all">Proceed &rarr;</span>
                    </div>
                </button>

                <div className="text-center mt-8 opacity-40">
                    <img src="/logo.jpeg" className="h-12 w-12 mx-auto grayscale opacity-50 mb-2" alt="Emblem" />
                    <p className="text-[10px] text-slate-600 font-mono">OFFICIAL USE ONLY</p>
                </div>

            </div>

            {/* Decorative Background Elements */}
            <div className="absolute right-0 bottom-0 text-[200px] font-serif text-white opacity-[0.02] leading-none pointer-events-none select-none">
                §
            </div>
        </div>
    );
};

export default HomePage;
