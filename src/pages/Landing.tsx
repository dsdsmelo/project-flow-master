import { Link } from 'react-router-dom';
import { 
  FolderKanban, 
  CheckCircle2, 
  BarChart3, 
  Users, 
  Zap, 
  Shield,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

const Landing = () => {
  const { isAuthenticated, hasActiveSubscription } = useAuth();

  const features = [
    {
      icon: FolderKanban,
      title: 'Gestão de Projetos',
      description: 'Organize seus projetos com visões em lista, Kanban e Gantt.',
    },
    {
      icon: CheckCircle2,
      title: 'Tarefas Personalizáveis',
      description: 'Colunas totalmente customizáveis para cada projeto.',
    },
    {
      icon: BarChart3,
      title: 'Dashboards Inteligentes',
      description: 'Acompanhe o progresso com métricas e gráficos em tempo real.',
    },
    {
      icon: Users,
      title: 'Gestão de Equipe',
      description: 'Atribua responsáveis e acompanhe a carga de trabalho.',
    },
    {
      icon: Zap,
      title: 'Automações',
      description: 'Regras automáticas para atualização de status e progresso.',
    },
    {
      icon: Shield,
      title: 'Segurança Total',
      description: 'Seus dados isolados e protegidos com criptografia.',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <FolderKanban className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-foreground">TaskFlow</span>
            </div>
            
            <div className="flex items-center gap-4">
              {isAuthenticated ? (
                <Link to="/dashboard">
                  <Button className="gradient-primary text-white">
                    Ir para o Dashboard
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/auth">
                    <Button variant="ghost">Entrar</Button>
                  </Link>
                  <Link to="/auth">
                    <Button className="gradient-primary text-white">
                      Começar Grátis
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium mb-8">
            <Sparkles className="w-4 h-4" />
            Sistema completo de gestão de projetos
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
            Gerencie seus projetos<br />
            <span className="text-gradient">com total controle</span>
          </h1>
          
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Substitua planilhas complexas por um sistema moderno e intuitivo. 
            Dashboards, Gantt, colunas personalizáveis e muito mais.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/auth">
              <Button size="lg" className="gradient-primary text-white h-14 px-8 text-lg">
                Começar agora
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="lg" variant="outline" className="h-14 px-8 text-lg">
                Ver demonstração
              </Button>
            </Link>
          </div>
          
          {/* Pricing Preview */}
          <div className="mt-12 inline-flex items-center gap-3 px-6 py-3 bg-card border border-border rounded-2xl shadow-sm">
            <div className="text-left">
              <p className="text-sm text-muted-foreground">A partir de</p>
              <p className="text-2xl font-bold text-foreground">
                R$ 99<span className="text-base font-normal text-muted-foreground">/mês</span>
              </p>
            </div>
            <div className="w-px h-10 bg-border" />
            <div className="text-left">
              <p className="text-sm text-muted-foreground">Inclui</p>
              <p className="text-sm font-medium text-foreground">Acesso completo</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Tudo que você precisa
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Ferramentas poderosas para gerenciar projetos de qualquer tamanho
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-card rounded-2xl p-6 border border-border shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-3xl p-8 sm:p-12 lg:p-16 text-center border border-primary/20">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Pronto para começar?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              Crie sua conta agora e comece a gerenciar seus projetos de forma profissional.
            </p>
            <Link to="/auth">
              <Button size="lg" className="gradient-primary text-white h-14 px-10 text-lg">
                Criar conta grátis
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
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
