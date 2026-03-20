import { Link } from 'react-router-dom'
import { useTranslation } from '../i18n/LanguageContext'

const STATUS_COLORS = {
  intake: 'bg-gray-100 text-gray-600',
  ready: 'bg-blue-100 text-blue-700',
  filed: 'bg-yellow-100 text-yellow-700',
  escalated: 'bg-red-100 text-red-700',
  resolved: 'bg-green-100 text-green-700',
}

// Sample data — replace with real API data later
const SAMPLE_CASES = [
  {
    id: 'NS-2025-001',
    employer: 'Ramesh Construction Co.',
    wages: '₹14,000',
    status: 'filed',
    next: 'Day 7 follow-up pending',
    filed: '12 Mar 2025',
  },
]

export default function DashboardPage() {
  const { t } = useTranslation()
  const cases = SAMPLE_CASES

  const stats = [
    { label: t('dash_stats_total'), value: cases.length },
    { label: t('dash_stats_resolved'), value: cases.filter(c => c.status === 'resolved').length },
    { label: t('dash_stats_pending'), value: cases.filter(c => c.status !== 'resolved').length },
    { label: t('dash_stats_wages'), value: '₹14,000' },
  ]

  const statusLabel = {
    intake: t('dash_status_intake'),
    ready: t('dash_status_ready'),
    filed: t('dash_status_filed'),
    escalated: t('dash_status_escalated'),
    resolved: t('dash_status_resolved'),
  }

  return (
    <main className="bg-gray-50 min-h-screen py-12 px-4">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('dash_title')}</h1>
            <p className="text-gray-500 mt-1">{t('dash_subtitle')}</p>
          </div>
          <Link
            to="/voice"
            className="bg-orange-600 text-white px-5 py-2.5 rounded-full font-semibold hover:bg-orange-700 transition-colors text-sm"
          >
            {t('dash_new_btn')}
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {stats.map(s => (
            <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm text-center">
              <p className="text-2xl font-bold text-orange-600">{s.value}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Cases table or empty state */}
        {cases.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 shadow-sm text-center">
            <p className="text-4xl mb-4">📋</p>
            <h2 className="font-semibold text-gray-700 mb-1">{t('dash_empty_title')}</h2>
            <p className="text-sm text-gray-400 mb-6">{t('dash_empty_desc')}</p>
            <Link
              to="/voice"
              className="bg-orange-600 text-white px-6 py-2.5 rounded-full font-semibold hover:bg-orange-700 transition-colors text-sm"
            >
              {t('dash_empty_btn')}
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    {['dash_col_case', 'dash_col_employer', 'dash_col_wages', 'dash_col_status', 'dash_col_next', 'dash_col_filed'].map(k => (
                      <th key={k} className="px-4 py-3 text-left font-medium">{t(k)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {cases.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-orange-600">{c.id}</td>
                      <td className="px-4 py-3 text-gray-700">{c.employer}</td>
                      <td className="px-4 py-3 font-semibold text-gray-800">{c.wages}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[c.status]}`}>
                          {statusLabel[c.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{c.next}</td>
                      <td className="px-4 py-3 text-gray-400">{c.filed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
