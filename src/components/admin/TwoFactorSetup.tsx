import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Smartphone, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  Copy,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import * as OTPAuth from 'otpauth';
import { QRCodeSVG } from 'qrcode.react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface TwoFactorSetupProps {
  userId: string;
  userEmail: string;
}

export const TwoFactorSetup = ({ userId, userEmail }: TwoFactorSetupProps) => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const [otpUri, setOtpUri] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    checkTwoFactorStatus();
  }, [userId]);

  const checkTwoFactorStatus = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('admin_2fa')
        .select('enabled')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      setIsEnabled(data?.enabled || false);
    } catch (error) {
      console.error('Error checking 2FA status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateSecret = () => {
    const totp = new OTPAuth.TOTP({
      issuer: 'Tarefaa Admin',
      label: userEmail,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromHex(crypto.getRandomValues(new Uint8Array(20)).reduce((acc, val) => acc + val.toString(16).padStart(2, '0'), ''))
    });

    setSecret(totp.secret.base32);
    setOtpUri(totp.toString());
    setShowSetup(true);
  };

  const verifyAndEnable = async () => {
    if (!secret || verificationCode.length !== 6) {
      toast({
        title: 'Código inválido',
        description: 'Digite o código de 6 dígitos do seu app autenticador.',
        variant: 'destructive',
      });
      return;
    }

    setIsSettingUp(true);

    try {
      // Verify the code
      const totp = new OTPAuth.TOTP({
        issuer: 'Tarefaa Admin',
        label: userEmail,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(secret)
      });

      const delta = totp.validate({ token: verificationCode, window: 1 });

      if (delta === null) {
        throw new Error('Código inválido. Verifique se o horário do seu dispositivo está correto.');
      }

      // Save to database
      const { error } = await supabase
        .from('admin_2fa')
        .upsert({
          user_id: userId,
          secret: secret,
          enabled: true,
          created_at: new Date().toISOString(),
        });

      if (error) throw error;

      setIsEnabled(true);
      setShowSetup(false);
      setSecret(null);
      setOtpUri(null);
      setVerificationCode('');

      toast({
        title: '2FA Ativado!',
        description: 'Autenticação de dois fatores foi configurada com sucesso.',
      });
    } catch (error: any) {
      console.error('Error enabling 2FA:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível ativar o 2FA.',
        variant: 'destructive',
      });
    } finally {
      setIsSettingUp(false);
    }
  };

  const disableTwoFactor = async () => {
    if (disableCode.length !== 6) {
      toast({
        title: 'Código obrigatório',
        description: 'Digite o código do seu app autenticador para desativar.',
        variant: 'destructive',
      });
      return;
    }

    setIsSettingUp(true);

    try {
      // Get current secret
      const { data: tfaData, error: fetchError } = await supabase
        .from('admin_2fa')
        .select('secret')
        .eq('user_id', userId)
        .single();

      if (fetchError || !tfaData) throw new Error('2FA não encontrado');

      // Verify code before disabling
      const totp = new OTPAuth.TOTP({
        issuer: 'Tarefaa Admin',
        label: userEmail,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(tfaData.secret)
      });

      const delta = totp.validate({ token: disableCode, window: 1 });

      if (delta === null) {
        throw new Error('Código inválido.');
      }

      // Disable 2FA
      const { error } = await supabase
        .from('admin_2fa')
        .update({ enabled: false })
        .eq('user_id', userId);

      if (error) throw error;

      setIsEnabled(false);
      setShowDisableDialog(false);
      setDisableCode('');

      toast({
        title: '2FA Desativado',
        description: 'Autenticação de dois fatores foi desativada.',
      });
    } catch (error: any) {
      console.error('Error disabling 2FA:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível desativar o 2FA.',
        variant: 'destructive',
      });
    } finally {
      setIsSettingUp(false);
    }
  };

  const copySecret = () => {
    if (secret) {
      navigator.clipboard.writeText(secret);
      toast({
        title: 'Copiado!',
        description: 'Chave secreta copiada para a área de transferência.',
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-primary" />
              <div>
                <CardTitle>Autenticação de Dois Fatores (2FA)</CardTitle>
                <CardDescription>
                  Adicione uma camada extra de segurança ao seu login
                </CardDescription>
              </div>
            </div>
            <Badge variant={isEnabled ? 'default' : 'secondary'}>
              {isEnabled ? (
                <>
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Ativo
                </>
              ) : (
                <>
                  <XCircle className="w-3 h-3 mr-1" />
                  Inativo
                </>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!showSetup ? (
            <>
              <p className="text-sm text-muted-foreground">
                {isEnabled 
                  ? 'O 2FA está ativo. Você precisará do código do seu app autenticador a cada login.'
                  : 'Proteja sua conta exigindo um código do seu celular além da senha.'}
              </p>
              
              <div className="flex gap-3">
                {isEnabled ? (
                  <Button 
                    variant="destructive" 
                    onClick={() => setShowDisableDialog(true)}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Desativar 2FA
                  </Button>
                ) : (
                  <Button onClick={generateSecret}>
                    <Smartphone className="w-4 h-4 mr-2" />
                    Configurar 2FA
                  </Button>
                )}
              </div>
            </>
          ) : (
            <div className="space-y-6">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-600">Importante!</p>
                    <p className="text-amber-600/80">
                      Salve a chave secreta em um local seguro. Você precisará dela se perder acesso ao seu dispositivo.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* QR Code */}
                <div className="flex flex-col items-center gap-4 p-4 border rounded-lg bg-white">
                  <p className="text-sm font-medium text-gray-700">
                    Escaneie com Google Authenticator ou similar
                  </p>
                  {otpUri && (
                    <QRCodeSVG value={otpUri} size={180} />
                  )}
                </div>

                {/* Manual Entry */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Ou digite a chave manualmente:</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="flex-1 p-2 bg-muted rounded text-xs font-mono break-all">
                        {secret}
                      </code>
                      <Button variant="ghost" size="icon" onClick={copySecret}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="verification-code">Código de Verificação</Label>
                    <Input
                      id="verification-code"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      className="text-center text-2xl tracking-widest font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      Digite o código de 6 dígitos do seu app autenticador
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowSetup(false);
                    setSecret(null);
                    setOtpUri(null);
                    setVerificationCode('');
                  }}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={verifyAndEnable}
                  disabled={isSettingUp || verificationCode.length !== 6}
                >
                  {isSettingUp ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Ativar 2FA
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Disable Confirmation Dialog */}
      <AlertDialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar 2FA?</AlertDialogTitle>
            <AlertDialogDescription>
              Para desativar a autenticação de dois fatores, digite o código atual do seu app autenticador.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="text-center text-2xl tracking-widest font-mono"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDisableCode('')}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={disableTwoFactor}
              disabled={isSettingUp || disableCode.length !== 6}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSettingUp ? 'Verificando...' : 'Desativar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
