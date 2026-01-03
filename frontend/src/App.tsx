import { useState } from 'react';
import './index.css';
import Login from './components/Login';
import HistoryViewer from './components/HistoryViewer';
import { useAuth } from './contexts/AuthContext';
import { useTheme } from './contexts/ThemeContext'; // Import Theme Hook
import HomePage from './components/HomePage';
import SingleWitnessView from './components/SingleWitnessView';
import MultiWitnessView from './components/MultiWitnessView';

function App() {
  const { user, logout, loading: authLoading } = useAuth();
  const { theme, setTheme } = useTheme(); // Use Theme

  // Navigation State
  // mode: 'home' | 'single' | 'multi'
  const [viewMode, setViewMode] = useState<'home' | 'single' | 'multi'>('home');

  // UI State
  const [showLogin, setShowLogin] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  return (
    <div className="min-h-screen font-sans transition-colors duration-300" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>

      {/* Header */}
      <header className="border-b sticky top-0 z-10 backdrop-blur-md transition-colors duration-300" style={{ backgroundColor: 'var(--header-bg)', borderColor: 'var(--border-color)' }}>
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <div
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setViewMode('home')}
          >
            <img src="/logo.jpeg" alt="Sakshya AI Logo" className="h-8 w-8 rounded-lg object-cover" />
            <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Sakshya AI
            </h1>
          </div>
          <div className="flex items-center gap-4">

            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-slate-500 dark:text-slate-400"
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {theme === 'dark' ? (
                // Sun Icon (for Dark Mode)
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                // Moon Icon (for Light Mode)
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            <nav className="text-sm font-medium hover:opacity-80 transition-colors cursor-pointer" style={{ color: 'var(--text-secondary)' }}>Docs</nav>
            {authLoading ? (
              <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading...</div>
            ) : user ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowHistory(true)}
                  className="text-sm px-3 py-1 rounded border hover:opacity-80 transition-all"
                  style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                >
                  My Analyses
                </button>
                <div className="h-4 w-px bg-slate-700/20 dark:bg-slate-700"></div>
                <button onClick={() => logout()} className="text-sm text-blue-500 hover:text-blue-400 font-medium">Sign out</button>
              </div>
            ) : (
              <button
                onClick={() => setShowLogin(true)}
                className="text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 px-4 py-1.5 rounded transition-colors shadow-sm"
              >
                Log In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Login Modal */}
      {showLogin && !user && (
        <div className="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-4 bg-slate-900/50">
          <div className="legal-panel p-1 rounded-lg w-full max-w-md shadow-2xl relative">
            <button
              onClick={() => setShowLogin(false)}
              className="absolute top-4 right-4 z-10 hover:opacity-70"
              style={{ color: 'var(--text-secondary)' }}
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
              className="flex items-center text-sm hover:opacity-100 transition-colors opacity-70"
              style={{ color: 'var(--text-secondary)' }}
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
