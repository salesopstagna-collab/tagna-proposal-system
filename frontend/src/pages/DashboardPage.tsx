import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Loader2, FolderOpen, TrendingUp, DollarSign, CheckCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency, PROJECT_STATUS, cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

export function DashboardPage() {
  const navigate = useNavigate();
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get('/projects').then(r => r.data),
  });

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>;

  const totalProjects = projects.length;
  const approved = projects.filter((p: any) => p.status === 'approved').length;

  let totalRevenue = 0;
  let totalMarginSum = 0;
  let marginCount = 0;

  for (const p of projects) {
    const active = p.memories?.find((m: any) => m.isActive);
    if (active?.dre) {
      totalRevenue += active.dre.grossRevenue || 0;
      if (active.dre.grossRevenue > 0) {
        totalMarginSum += active.dre.grossMarginPct || 0;
        marginCount++;
      }
    }
  }

  const avgMargin = marginCount > 0 ? totalMarginSum / marginCount : 0;

  const chartData = Object.entries(PROJECT_STATUS).map(([key, val]) => ({
    name: val.label,
    total: projects.filter((p: any) => p.status === key).length,
  }));

  const recent = [...projects].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Visão geral do pipeline de projetos</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total de Projetos', value: totalProjects, icon: FolderOpen, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Projetos Aprovados', value: approved, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Receita Total (pipeline)', value: formatCurrency(totalRevenue), icon: DollarSign, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Margem Média', value: `${avgMargin.toFixed(1)}%`, icon: TrendingUp, color: avgMargin >= 0 ? 'text-green-600' : 'text-red-600', bg: avgMargin >= 0 ? 'bg-green-50' : 'bg-red-50' },
        ].map(item => (
          <Card key={item.label}>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', item.bg)}>
                  <item.icon className={cn('w-5 h-5', item.color)} />
                </div>
                <div>
                  <p className="text-xs text-gray-500">{item.label}</p>
                  <p className={cn('text-xl font-bold', item.color)}>{item.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Projetos por Status</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Projetos Recentes</CardTitle></CardHeader>
          <CardContent className="p-0">
            {recent.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">Nenhum projeto ainda</div>
            ) : (
              <div className="divide-y">
                {recent.map((p: any) => {
                  const st = PROJECT_STATUS[p.status] ?? { label: p.status, color: 'bg-gray-100 text-gray-700' };
                  const active = p.memories?.find((m: any) => m.isActive);
                  return (
                    <div key={p.id} className="flex items-center gap-3 px-6 py-3 hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/projects/${p.id}`)}>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 truncate">{p.projectNumber}</p>
                        <p className="text-xs text-gray-400 truncate">{p.clientName}</p>
                      </div>
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', st.color)}>{st.label}</span>
                      {active?.dre && (
                        <span className="text-sm font-semibold text-blue-700 tabular-nums">{formatCurrency(active.dre.grossRevenue)}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
