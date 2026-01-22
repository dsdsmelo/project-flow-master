import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get parameters from URL
        const tokenHash = searchParams.get('token_hash');
        const type = searchParams.get('type');
        const code = searchParams.get('code');

        // Get hash fragment parameters (for implicit flow)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const hashType = hashParams.get('type');

        // Method 1: Token hash verification (invite, email confirmation)
        if (tokenHash && type) {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as 'invite' | 'signup' | 'recovery' | 'email',
          });

          if (verifyError) {
            console.error('Error verifying token:', verifyError);
            setError('Link expirado ou inválido. Solicite um novo convite.');
            setTimeout(() => navigate('/login'), 3000);
            return;
          }
        }
        // Method 2: Hash fragment tokens (implicit flow)
        else if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            console.error('Error setting session:', sessionError);
            setError('Erro ao processar autenticação. Tente novamente.');
            setTimeout(() => navigate('/login'), 3000);
            return;
          }
        }
        // Method 3: PKCE flow (code exchange)
        else if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            console.error('Error exchanging code:', exchangeError);
            setError('Erro ao processar autenticação. Tente novamente.');
            setTimeout(() => navigate('/login'), 3000);
            return;
          }
        }

        // Wait for auth state to propagate
        await new Promise(resolve => setTimeout(resolve, 500));

        // Check if we have a valid session
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          setError('Sessão não encontrada. Tente fazer login novamente.');
          setTimeout(() => navigate('/login'), 3000);
          return;
        }

        // Redirect based on authentication type
        const authType = type || hashType;
        switch (authType) {
          case 'recovery':
            navigate('/reset-password', { replace: true });
            break;
          case 'invite':
          case 'signup':
          case 'email':
          default:
            navigate('/dashboard', { replace: true });
            break;
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        setError('Ocorreu um erro inesperado. Redirecionando para login...');
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    handleAuthCallback();
  }, [navigate, searchParams]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-destructive">{error}</p>
        <p className="text-muted-foreground text-sm">Redirecionando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <p className="text-muted-foreground">Processando autenticação...</p>
    </div>
  );
};

export default AuthCallback;
