import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  FolderKanban, 
  CheckCircle2, 
  BarChart3, 
  Users, 
  Shield,
  ArrowRight,
  Loader2,
  GanttChart,
  Layers,
  Target,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Lock,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

// Import mockup images
import mockupDashboard from '@/assets/mockup-dashboard.png';
import mockupGantt from '@/assets/mockup-gantt.png';
import mockupTasks from '@/assets/mockup-tasks.png';

const Landing = () => {
  const { isAuthenticated, hasActiveSubscription } = useAuth();
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

  const screenshots = [
    { image: mockupDashboard, title: 'Dashboard Inteligente', description: 'Visualize o progresso de todos os projetos em tempo real' },
    { image: mockupGantt, title: 'Gráfico de Gantt', description: 'Planeje cronogramas e acompanhe dependências entre tarefas' },
    { image: mockupTasks, title: 'Gestão de Tarefas', description: 'Organize tarefas com colunas totalmente personalizáveis' },
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
                  {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
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
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium mb-6">
              <Target className="w-4 h-4" />
              Substitua planilhas complexas
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
              Gerencie projetos<br />
              <span className="text-gradient">como um profissional</span>
            </h1>
            
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              Sistema completo para gerenciamento de projetos de TI e infraestrutura. 
              Dashboards, cronogramas Gantt, colunas personalizáveis e controle total.
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-8">
              <Button 
                size="lg" 
                onClick={handleSubscribe}
                disabled={isLoading}
                className="gradient-primary text-white h-14 px-8 text-lg shadow-lg hover:shadow-xl transition-shadow"
              >
                {isLoading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : null}
                Assinar por R$ 99/mês
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>

            <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Acesso imediato
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Cancele quando quiser
              </div>
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-green-500" />
                Pagamento seguro
              </div>
            </div>
          </div>

          {/* Hero Image */}
          <div className="relative mt-12">
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10 pointer-events-none" />
            <div className="rounded-2xl overflow-hidden shadow-2xl border border-border/50">
              <img 
                src={mockupDashboard} 
                alt="TaskFlow Dashboard" 
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Screenshots Gallery */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium mb-4">
              <Sparkles className="w-4 h-4" />
              Veja na prática
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Conheça a plataforma por dentro
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Interface moderna e intuitiva projetada para máxima produtividade
            </p>
          </div>
          
          <div className="grid lg:grid-cols-3 gap-8">
            {screenshots.map((item, index) => (
              <div
                key={index}
                className="group bg-card rounded-2xl overflow-hidden border border-border shadow-sm hover:shadow-xl transition-all duration-300"
              >
                <div className="aspect-video overflow-hidden">
                  <img 
                    src={item.image} 
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {item.title}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
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

      {/* Pricing Section */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-lg mx-auto">
            <div className="bg-card rounded-3xl border-2 border-primary/20 shadow-2xl p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/5 rounded-full blur-xl" />
              
              <div className="relative">
                <div className="flex items-center gap-2 mb-4">
                  <div className="px-3 py-1 bg-primary/10 rounded-full text-primary text-xs font-semibold uppercase tracking-wide">
                    Plano Completo
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
                      <div className="w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
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
                  {isLoading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : null}
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
          </p>
          <Button 
            size="lg" 
            onClick={handleSubscribe}
            disabled={isLoading}
            className="gradient-primary text-white h-14 px-10 text-lg shadow-lg hover:shadow-xl transition-shadow"
          >
            {isLoading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : null}
            Assinar por R$ 99/mês
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-sidebar text-sidebar-foreground">
        {/* Main Footer */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12">
            {/* Brand Column */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
                  <FolderKanban className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold">TaskFlow</span>
              </div>
              <p className="text-sidebar-foreground/70 mb-6 max-w-sm leading-relaxed">
                Sistema completo de gerenciamento de projetos para equipes que buscam 
                produtividade e resultados. Substitua suas planilhas por uma solução profissional.
              </p>
              <div className="flex items-center gap-4">
                <a href="mailto:contato@taskflow.com.br" className="flex items-center gap-2 text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors">
                  <Mail className="w-4 h-4" />
                  contato@taskflow.com.br
                </a>
              </div>
            </div>

            {/* Links Column */}
            <div>
              <h4 className="font-semibold mb-4 text-lg">Produto</h4>
              <ul className="space-y-3">
                <li>
                  <a href="#" className="text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors flex items-center gap-1">
                    <ChevronRight className="w-3 h-3" />
                    Funcionalidades
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors flex items-center gap-1">
                    <ChevronRight className="w-3 h-3" />
                    Preços
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors flex items-center gap-1">
                    <ChevronRight className="w-3 h-3" />
                    Suporte
                  </a>
                </li>
                <li>
                  <Link to="/auth" className="text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors flex items-center gap-1">
                    <ChevronRight className="w-3 h-3" />
                    Entrar
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal Column */}
            <div>
              <h4 className="font-semibold mb-4 text-lg">Legal</h4>
              <ul className="space-y-3">
                <li>
                  <a href="#" className="text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors flex items-center gap-1">
                    <ChevronRight className="w-3 h-3" />
                    Termos de Uso
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors flex items-center gap-1">
                    <ChevronRight className="w-3 h-3" />
                    Privacidade
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors flex items-center gap-1">
                    <ChevronRight className="w-3 h-3" />
                    Cookies
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Payment Methods & Copyright */}
        <div className="border-t border-sidebar-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              {/* Copyright */}
              <div className="flex items-center gap-2 text-sm text-sidebar-foreground/60">
                <span>© {new Date().getFullYear()} TaskFlow. Todos os direitos reservados.</span>
              </div>

              {/* Payment Methods */}
              <div className="flex items-center gap-4">
                <span className="text-xs text-sidebar-foreground/50 uppercase tracking-wide">Formas de pagamento:</span>
                <div className="flex items-center gap-2">
                  {/* Visa */}
                  <div className="w-10 h-6 bg-white rounded flex items-center justify-center">
                    <svg viewBox="0 0 48 32" className="w-8 h-5">
                      <rect fill="#1A1F71" width="48" height="32" rx="4"/>
                      <text x="24" y="20" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold" fontFamily="Arial">VISA</text>
                    </svg>
                  </div>
                  {/* Mastercard */}
                  <div className="w-10 h-6 bg-white rounded flex items-center justify-center">
                    <svg viewBox="0 0 48 32" className="w-8 h-5">
                      <rect fill="#F9F9F9" width="48" height="32" rx="4"/>
                      <circle cx="18" cy="16" r="10" fill="#EB001B"/>
                      <circle cx="30" cy="16" r="10" fill="#F79E1B"/>
                      <path d="M24 8a10 10 0 000 16 10 10 0 000-16z" fill="#FF5F00"/>
                    </svg>
                  </div>
                  {/* Amex */}
                  <div className="w-10 h-6 bg-[#006FCF] rounded flex items-center justify-center">
                    <span className="text-white text-[8px] font-bold">AMEX</span>
                  </div>
                  {/* Pix */}
                  <div className="w-10 h-6 bg-[#32BCAD] rounded flex items-center justify-center">
                    <span className="text-white text-[8px] font-bold">PIX</span>
                  </div>
                  {/* Boleto */}
                  <div className="w-10 h-6 bg-gray-700 rounded flex items-center justify-center">
                    <CreditCard className="w-4 h-4 text-white" />
                  </div>
                </div>
              </div>

              {/* Security Badge */}
              <div className="flex items-center gap-2 text-sm text-sidebar-foreground/60">
                <Lock className="w-4 h-4" />
                <span>Pagamento 100% seguro</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
