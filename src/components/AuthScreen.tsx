import { Zap } from 'lucide-react';
import { isSupabaseConfigured } from '../supabase';

interface AuthScreenProps {
  onSignIn: () => void;
}

export function AuthScreen({ onSignIn }: AuthScreenProps) {
  const configured = isSupabaseConfigured();

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center px-4">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col items-center max-w-sm w-full">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-900/40">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <span className="text-3xl font-extrabold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            FunFlow
          </span>
        </div>

        {/* Tagline */}
        <h1 className="text-2xl font-bold text-white text-center mb-2">
          Where Fun Meets Connection
        </h1>
        <p className="text-white/40 text-center mb-10 text-sm leading-relaxed">
          Join live voice rooms with people who share your vibe.
          Talk, laugh, play.
        </p>

        {/* Sign in card */}
        <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
          {configured ? (
            <>
              <p className="text-white/50 text-sm text-center mb-6">
                Meld dich an, um Räume zu erstellen und beizutreten.
              </p>

              {/* Apple Sign In button — follows Apple HIG */}
              <button
                onClick={onSignIn}
                className="w-full flex items-center justify-center gap-3 bg-white text-black font-semibold py-3.5 px-6 rounded-xl hover:bg-white/90 active:bg-white/80 transition-colors text-sm"
              >
                {/* Apple logo SVG */}
                <svg viewBox="0 0 814 1000" className="w-4 h-5 flex-shrink-0" fill="currentColor">
                  <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-42.8-161.2-113.8c-124.3-168.1-213.4-428.6-213.4-662.6 0-30.6 2.5-60.9 7.5-90.9 22.3-123.7 89.5-208.8 176.5-259.6 52-30.4 111.2-47.5 171.2-48.4 55.6-.9 116.9 22.2 160.7 54.6 39.4 29.7 63.4 61.3 78 83.4 2.5 3.7 5.2 7.2 7.7 10.8 7.1-21.7 20.9-43.4 39.5-65.4 52.5-62.1 133.5-96.8 212.5-96.8z"/>
                </svg>
                Mit Apple anmelden
              </button>
            </>
          ) : (
            <div className="text-center">
              <div className="text-4xl mb-3">⚙️</div>
              <p className="text-white/60 text-sm font-medium mb-2">Supabase nicht konfiguriert</p>
              <p className="text-white/30 text-xs leading-relaxed">
                Füge <code className="bg-white/10 px-1 rounded">VITE_SUPABASE_URL</code> und{' '}
                <code className="bg-white/10 px-1 rounded">VITE_SUPABASE_ANON_KEY</code> zu
                deinen Vercel Environment Variables hinzu.
              </p>
            </div>
          )}
        </div>

        <p className="text-white/20 text-xs mt-6 text-center">
          Durch die Anmeldung stimmst du unseren Nutzungsbedingungen zu.
        </p>
      </div>
    </div>
  );
}
