import { useTranslation } from '../i18n/LanguageContext'

function Section({ title, desc }) {
  return (
    <div className="border-l-4 border-orange-400 pl-4 py-1">
      <h3 className="font-semibold text-gray-800">{title}</h3>
      <p className="text-sm text-gray-500 mt-0.5">{desc}</p>
    </div>
  )
}

function Card({ title, desc }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <h3 className="font-semibold text-gray-800 mb-1">{title}</h3>
      <p className="text-sm text-gray-500">{desc}</p>
    </div>
  )
}

export default function LawsPage() {
  const { t } = useTranslation()

  const ismwaSections = [
    { title: t('laws_sec12_title'), desc: t('laws_sec12_desc') },
    { title: t('laws_sec14_title'), desc: t('laws_sec14_desc') },
    { title: t('laws_sec15_title'), desc: t('laws_sec15_desc') },
    { title: t('laws_sec16_title'), desc: t('laws_sec16_desc') },
    { title: t('laws_sec23_title'), desc: t('laws_sec23_desc') },
  ]

  const additional = [
    { title: t('laws_mwa_title'), desc: t('laws_mwa_desc') },
    { title: t('laws_bocw_title'), desc: t('laws_bocw_desc') },
    { title: t('laws_bla_title'), desc: t('laws_bla_desc') },
    { title: t('laws_eshram_title'), desc: t('laws_eshram_desc') },
  ]

  return (
    <main className="bg-gray-50 min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-10">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('laws_title')}</h1>
          <p className="text-gray-500 mt-1">{t('laws_subtitle')}</p>
        </div>

        {/* ISMWA */}
        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-5">
          <div>
            <h2 className="text-xl font-bold text-orange-700">{t('laws_primary_title')}</h2>
            <p className="text-sm text-gray-500 mt-1">{t('laws_primary_desc')}</p>
          </div>
          <div className="space-y-4">
            {ismwaSections.map(s => <Section key={s.title} {...s} />)}
          </div>
        </div>

        {/* Additional laws */}
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-4">{t('laws_additional_title')}</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {additional.map(a => <Card key={a.title} {...a} />)}
          </div>
        </div>

        {/* Jurisdiction callout */}
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-6">
          <h2 className="font-bold text-amber-800 text-lg mb-2">
            ⚠️ {t('laws_jurisdiction_title')}
          </h2>
          <p className="text-amber-700 text-sm">{t('laws_jurisdiction_desc')}</p>
        </div>
      </div>
    </main>
  )
}
