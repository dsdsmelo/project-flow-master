import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import logoTarefaa from '@/assets/logo-tarefaa.png';

const Terms = () => {
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
        <h1 className="text-3xl font-bold text-foreground mb-8">Termos de Uso</h1>
        
        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
          <p className="text-muted-foreground">
            Última atualização: {new Date().toLocaleDateString('pt-BR')}
          </p>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">1. Aceitação dos Termos</h2>
            <p className="text-muted-foreground leading-relaxed">
              Ao acessar ou usar o Tarefaa, você concorda em cumprir e ficar vinculado a estes Termos de Uso. 
              Se você não concordar com qualquer parte destes termos, não poderá acessar o serviço.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">2. Descrição do Serviço</h2>
            <p className="text-muted-foreground leading-relaxed">
              O Tarefaa é uma plataforma de gerenciamento de projetos que oferece ferramentas para organização 
              de tarefas, cronogramas, dashboards e gestão de equipes. O serviço é fornecido mediante assinatura 
              mensal no valor de R$ 99,00.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">3. Conta do Usuário</h2>
            <p className="text-muted-foreground leading-relaxed">
              Para utilizar o Tarefaa, você deve criar uma conta fornecendo informações precisas e completas. 
              Você é responsável por manter a confidencialidade de sua senha e por todas as atividades que 
              ocorram em sua conta.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">4. Pagamentos e Assinatura</h2>
            <p className="text-muted-foreground leading-relaxed">
              A assinatura é cobrada mensalmente via Stripe. Você pode cancelar sua assinatura a qualquer 
              momento através do portal do cliente. O cancelamento será efetivado ao final do período de 
              faturamento atual.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">5. Uso Aceitável</h2>
            <p className="text-muted-foreground leading-relaxed">
              Você concorda em não usar o Tarefaa para qualquer finalidade ilegal ou não autorizada. 
              Você não deve, no uso do serviço, violar quaisquer leis em sua jurisdição.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">6. Propriedade Intelectual</h2>
            <p className="text-muted-foreground leading-relaxed">
              O serviço e seu conteúdo original, recursos e funcionalidades são e permanecerão propriedade 
              exclusiva do Tarefaa e seus licenciadores. Você mantém todos os direitos sobre os dados que 
              inserir na plataforma.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">7. Limitação de Responsabilidade</h2>
            <p className="text-muted-foreground leading-relaxed">
              Em nenhum caso o Tarefaa será responsável por quaisquer danos indiretos, incidentais, especiais, 
              consequenciais ou punitivos, incluindo, sem limitação, perda de lucros, dados ou outras perdas 
              intangíveis.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">8. Alterações nos Termos</h2>
            <p className="text-muted-foreground leading-relaxed">
              Reservamo-nos o direito de modificar ou substituir estes termos a qualquer momento. 
              Notificaremos sobre alterações significativas por e-mail ou através de aviso em nosso site.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">9. Contato</h2>
            <p className="text-muted-foreground leading-relaxed">
              Se você tiver alguma dúvida sobre estes Termos, entre em contato conosco pelo e-mail: 
              contato@tarefaa.com.br
            </p>
          </section>
        </div>
      </motion.main>
    </div>
  );
};

export default Terms;
