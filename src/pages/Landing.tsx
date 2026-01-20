import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  FolderKanban, 
  CheckCircle2, 
  BarChart3, 
  Users, 
  Zap, 
  Shield,
  ArrowRight,
  Play,
  Star,
  Clock,
  Loader2,
  GanttChart,
  Layers,
  Target
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

const Landing = () => {
  const { isAuthenticated, hasActiveSubscription, user } = useAuth();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const subscriptionRequired = searchParams.get('subscription') === 'required';

  const handleSubscribe = async () => {
    if (!isAuthenticated) {
      window.location.href = '/auth';
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout');
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao iniciar checkout. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    {
      icon: FolderKanban,
      title: 'Gestão Completa de Projetos',
      description: 'Organize projetos com visões em lista, Kanban e Gantt. Tudo em um só lugar.',
    },
    {
      icon: Layers,
      title: 'Colunas 100% Personalizáveis',
      description: 'Crie, renomeie, reordene e delete qualquer coluna. Adaptável ao seu fluxo.',
    },
    {
      icon: BarChart3,
      title: 'Dashboards em Tempo Real',
      description: 'Métricas, gráficos e indicadores atualizados automaticamente.',
    },
    {
      icon: Users,
      title: 'Gestão de Equipe',
      description: 'Atribua responsáveis, acompanhe cargas de trabalho e prazos.',
    },
    {
      icon: GanttChart,
      title: 'Visualização Gantt',
      description: 'Cronogramas visuais para planejamento e acompanhamento de entregas.',
    },
    {
      icon: Shield,
      title: 'Ambiente Isolado e Seguro',
      description: 'Seus dados são exclusivos e protegidos com criptografia ponta a ponta.',
    },
  ];

  const benefits = [
    'Projetos ilimitados',
    'Tarefas ilimitadas',
    'Colunas personalizáveis',
    'Dashboard completo',
    'Gráfico de Gantt',
    'Gestão de equipe',
    'Suporte prioritário',
    'Atualizações contínuas',
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <FolderKanban className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-foreground">TaskFlow</span>
            </div>
            
            <div className="flex items-center gap-3">
              {isAuthenticated && hasActiveSubscription ? (
                <Link to="/dashboard">
                  <Button className="gradient-primary text-white">
                    Acessar Dashboard
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              ) : isAuthenticated ? (
                <Button 
                  onClick={handleSubscribe} 
                  disabled={isLoading}
                  className="gradient-primary text-white"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  Assinar Agora
                </Button>
              ) : (
                <>
                  <Link to="/auth">
                    <Button variant="ghost">Entrar</Button>
                  </Link>
                  <Button onClick={handleSubscribe} className="gradient-primary text-white">
                    Começar Agora
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Subscription Required Alert */}
      {subscriptionRequired && (
        <div className="bg-primary/10 border-b border-primary/20 py-3">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-sm text-primary font-medium">
              🔒 Assine o TaskFlow para acessar o sistema completo
            </p>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 lg:py-24">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl opacity-50" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-primary/5 rounded-full blur-3xl opacity-50" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium mb-6">
                <Target className="w-4 h-4" />
                Substitua planilhas complexas
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
                Gerencie projetos<br />
                <span className="text-gradient">como um profissional</span>
              </h1>
              
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                Sistema completo para gerenciamento de projetos de TI e infraestrutura. 
                Dashboards, cronogramas Gantt, colunas personalizáveis e controle total 
                do seu fluxo de trabalho.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Button 
                  size="lg" 
                  onClick={handleSubscribe}
                  disabled={isLoading}
                  className="gradient-primary text-white h-14 px-8 text-lg shadow-lg hover:shadow-xl transition-shadow"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : null}
                  Assinar por R$ 99/mês
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>

              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Acesso imediato
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Cancele quando quiser
                </div>
              </div>
            </div>

            {/* Pricing Card */}
            <div className="lg:pl-8">
              <div className="bg-card rounded-3xl border-2 border-primary/20 shadow-2xl p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl" />
                
                <div className="relative">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="px-3 py-1 bg-primary/10 rounded-full text-primary text-xs font-semibold uppercase tracking-wide">
                      Plano Único
                    </div>
                  </div>

                  <div className="mb-6">
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-bold text-foreground">R$ 99</span>
                      <span className="text-muted-foreground">/mês</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Acesso completo a todas as funcionalidades
                    </p>
                  </div>

                  <div className="space-y-3 mb-8">
                    {benefits.map((benefit, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                        </div>
                        <span className="text-foreground">{benefit}</span>
                      </div>
                    ))}
                  </div>

                  <Button 
                    size="lg" 
                    onClick={handleSubscribe}
                    disabled={isLoading}
                    className="w-full gradient-primary text-white h-14 text-lg font-semibold shadow-lg hover:shadow-xl transition-shadow"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    ) : null}
                    Começar Agora
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>

                  <p className="text-xs text-center text-muted-foreground mt-4">
                    Pagamento seguro via Stripe. Cancele a qualquer momento.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Tudo que você precisa para gerenciar projetos
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Ferramentas poderosas projetadas para equipes que precisam de resultados
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-card rounded-2xl p-6 border border-border shadow-sm hover:shadow-lg hover:border-primary/20 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-16 border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-foreground mb-2">100%</div>
              <p className="text-muted-foreground">Personalizável</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-foreground mb-2">∞</div>
              <p className="text-muted-foreground">Projetos ilimitados</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-foreground mb-2">24/7</div>
              <p className="text-muted-foreground">Acesso disponível</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Pare de perder tempo com planilhas
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Comece a gerenciar seus projetos de forma profissional hoje mesmo.
            Assine e tenha acesso imediato a todas as funcionalidades.
          </p>
          <Button 
            size="lg" 
            onClick={handleSubscribe}
            disabled={isLoading}
            className="gradient-primary text-white h-14 px-10 text-lg shadow-lg hover:shadow-xl transition-shadow"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : null}
            Assinar por R$ 99/mês
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                <FolderKanban className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-foreground">TaskFlow</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} TaskFlow. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
