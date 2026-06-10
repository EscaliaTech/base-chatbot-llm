import { useQuery } from '@tanstack/react-query'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement
} from 'chart.js'
import { Bar, Doughnut } from 'react-chartjs-2'
import { conversationsApi } from '../../api/endpoints/conversations.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement)

function KPICard({ label, value, sub }) {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 px-5 py-4">
      <p className="text-xs text-neutral-500 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs text-neutral-400 mt-0.5">{sub}</p>}
    </div>
  )
}

export function MetricsDashboard() {
  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => conversationsApi.list().then(r => r.data),
  })

  if (isLoading) return <div className="text-sm text-neutral-400">Cargando métricas...</div>

  // Compute KPIs
  const total = conversations.length
  const resolved = conversations.filter(c => c.status === 'resolved' || c.status === 'closed').length
  const inProgress = conversations.filter(c => c.status === 'in_progress').length
  const open = conversations.filter(c => c.status === 'open').length
  const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0

  // Group by day (last 7 days)
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric' })
  })

  const volumeByDay = days.map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const dayStr = d.toDateString()
    return conversations.filter(c => new Date(c.createdAt).toDateString() === dayStr).length
  })

  const barData = {
    labels: days,
    datasets: [{
      label: 'Conversaciones',
      data: volumeByDay,
      backgroundColor: 'rgb(23, 23, 23)',
      borderRadius: 6,
    }],
  }

  const doughnutData = {
    labels: ['Abiertas', 'En atención', 'Resueltas/Cerradas'],
    datasets: [{
      data: [open, inProgress, resolved],
      backgroundColor: ['#3b82f6', '#eab308', '#22c55e'],
      borderWidth: 0,
    }],
  }

  const chartOptions = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Dashboard</h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Total" value={total} sub="conversaciones" />
        <KPICard label="En atención" value={inProgress} sub="activas" />
        <KPICard label="Abiertas" value={open} sub="sin asignar" />
        <KPICard label="Tasa resolución" value={`${resolutionRate}%`} sub={`${resolved} resueltas`} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-neutral-200 p-5">
          <p className="text-sm font-semibold mb-4">Volumen últimos 7 días</p>
          <Bar data={barData} options={chartOptions} />
        </div>
        <div className="bg-white rounded-xl border border-neutral-200 p-5">
          <p className="text-sm font-semibold mb-4">Distribución por estado</p>
          <Doughnut data={doughnutData} options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }} />
        </div>
      </div>
    </div>
  )
}
