import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import logoTarefaa from '@/assets/logo-tarefaa.png';

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <img src={logoTarefaa} alt="Tarefaa" className="h-8 w-auto" />
            </Link>
            <Link to="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <motion.main 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12"
      >
        <h1 className="text-3xl font-bold text-foreground mb-8">Política de Privacidade</h1>
        
        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
          <p className="text-muted-foreground">
            Última atualização: {new Date().toLocaleDateString('pt-BR')}
          </p>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">1. Informações que Coletamos</h2>
            <p className="text-muted-foreground leading-relaxed">
              Coletamos informações que você nos fornece diretamente, como nome, e-mail e dados de 
              pagamento ao criar uma conta. Também coletamos automaticamente certas informações quando 
              você usa nosso serviço, incluindo dados de uso e informações do dispositivo.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">2. Como Usamos suas Informações</h2>
            <p className="text-muted-foreground leading-relaxed">
              Utilizamos as informações coletadas para:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Fornecer, manter e melhorar nossos serviços</li>
              <li>Processar transações e enviar notificações relacionadas</li>
              <li>Responder a comentários, perguntas e solicitações</li>
              <li>Enviar comunicações técnicas, atualizações e alertas de segurança</li>
              <li>Monitorar e analisar tendências, uso e atividades</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">3. Compartilhamento de Informações</h2>
            <p className="text-muted-foreground leading-relaxed">
              Não vendemos, alugamos ou compartilhamos suas informações pessoais com terceiros para 
              fins de marketing. Podemos compartilhar informações com provedores de serviços que nos 
              auxiliam na operação do negócio (como processamento de pagamentos via Stripe).
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">4. Segurança dos Dados</h2>
            <p className="text-muted-foreground leading-relaxed">
              Implementamos medidas de segurança técnicas e organizacionais para proteger suas informações 
              pessoais contra acesso não autorizado, alteração, divulgação ou destruição. Utilizamos 
              criptografia de ponta a ponta e servidores seguros.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">5. Seus Direitos</h2>
            <p className="text-muted-foreground leading-relaxed">
              Você tem direito a:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Acessar suas informações pessoais</li>
              <li>Corrigir dados imprecisos</li>
              <li>Solicitar a exclusão de seus dados</li>
              <li>Exportar seus dados em formato legível</li>
              <li>Revogar consentimento a qualquer momento</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">6. Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              Utilizamos cookies e tecnologias similares para coletar informações sobre sua interação 
              com nosso serviço. Você pode configurar seu navegador para recusar todos ou alguns cookies, 
              embora isso possa afetar certas funcionalidades.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">7. Retenção de Dados</h2>
            <p className="text-muted-foreground leading-relaxed">
              Mantemos suas informações pessoais pelo tempo necessário para cumprir os propósitos 
              descritos nesta política, a menos que um período de retenção mais longo seja exigido 
              ou permitido por lei.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">8. Alterações nesta Política</h2>
            <p className="text-muted-foreground leading-relaxed">
              Podemos atualizar esta política periodicamente. Notificaremos você sobre alterações 
              significativas publicando a nova política nesta página e, se apropriado, enviando 
              uma notificação por e-mail.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">9. Contato</h2>
            <p className="text-muted-foreground leading-relaxed">
              Para exercer seus direitos ou esclarecer dúvidas sobre esta política, entre em contato 
              pelo e-mail: contato@tarefaa.com.br
            </p>
          </section>
        </div>
      </motion.main>
    </div>
  );
};

export default Privacy;
