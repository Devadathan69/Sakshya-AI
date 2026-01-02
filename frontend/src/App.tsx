import { useState } from 'react';
import './index.css';
import Login from './components/Login';
import HistoryViewer from './components/HistoryViewer';
import { useAuth } from './contexts/AuthContext';
import HomePage from './components/HomePage';
import SingleWitnessView from './components/SingleWitnessView';
import MultiWitnessView from './components/MultiWitnessView';

function App() {
  const { user, logout, loading: authLoading } = useAuth();

  // Navigation State
  // mode: 'home' | 'single' | 'multi'
  const [viewMode, setViewMode] = useState<'home' | 'single' | 'multi'>('home');

  // UI State
  const [showLogin, setShowLogin] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-200 selection:bg-blue-500/30 relative flex flex-col">

      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <div
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setViewMode('home')}
          >
            <img src="/logo.jpeg" alt="Sakshya AI Logo" className="h-8 w-8 rounded-lg object-cover" />
            <h1 className="text-xl font-bold tracking-tight text-white">Sakshya AI <span className="text-xs font-normal text-slate-400 bg-slate-800 px-2 py-0.5 rounded ml-2">V2.0</span></h1>
          </div>
          <div className="flex items-center gap-4">
            <nav className="text-sm font-medium text-slate-400 hover:text-white transition-colors cursor-pointer">Docs</nav>
            {authLoading ? (
              <div className="text-sm text-slate-400">Loading...</div>
            ) : user ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowHistory(true)}
                  className="text-sm text-slate-300 hover:text-white bg-slate-800/50 px-3 py-1 rounded border border-slate-700/50 hover:border-slate-600 transition-all"
                >
                  My Analyses
                </button>
                <div className="h-4 w-px bg-slate-700"></div>
                <button onClick={() => logout()} className="text-sm text-blue-400 hover:text-blue-300">Sign out</button>
              </div>
            ) : (
              <button
                onClick={() => setShowLogin(true)}
                className="text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 px-4 py-1.5 rounded transition-colors"
              >
                Log In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Login Modal */}
      {showLogin && !user && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-1 rounded-lg w-full max-w-md shadow-2xl relative">
            <button
              onClick={() => setShowLogin(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white z-10"
            >
              ✕
            </button>
            <Login onGuest={() => setShowLogin(false)} />
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistory && user && (
        <HistoryViewer onClose={() => setShowHistory(false)} onLoadReport={() => { }} />
      )}

      {/* Main Content Area */}
      <main className="flex-grow mx-auto w-full max-w-7xl px-6 py-6">

        {viewMode !== 'home' && (
          <div className="mb-6">
            <button
              onClick={() => setViewMode('home')}
              className="flex items-center text-sm text-slate-400 hover:text-white transition-colors"
            >
              ← Back to Home
            </button>
          </div>
        )}

        {viewMode === 'home' && <HomePage onSelectMode={setViewMode} />}
        {viewMode === 'single' && <SingleWitnessView />}
        {viewMode === 'multi' && <MultiWitnessView />}

      </main>

    </div>
  )
}

export default App
