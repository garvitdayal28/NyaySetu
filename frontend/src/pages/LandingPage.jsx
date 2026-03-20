import { Link } from 'react-router-dom'
import { useTranslation } from '../i18n/LanguageContext'

export default function LandingPage() {
  const { t } = useTranslation()

  const stats = [
    { num: t('hero_stat1_num'), label: t('hero_stat1_label') },
    { num: t('hero_stat2_num'), label: t('hero_stat2_label') },
    { num: t('hero_stat3_num'), label: t('hero_stat3_label') },
    { num: t('hero_stat4_num'), label: t('hero_stat4_label') },
  ]

  const barriers = [
    { title: t('problem_b1_title'), desc: t('problem_b1_desc'), icon: '⚖️' },
    { title: t('problem_b2_title'), desc: t('problem_b2_desc'), icon: '🗺️' },
    { title: t('problem_b3_title'), desc: t('problem_b3_desc'), icon: '🗣️' },
  ]

  const steps = [
    { title: t('how_s1_title'), desc: t('how_s1_desc'), num: '01' },
    { title: t('how_s2_title'), desc: t('how_s2_desc'), num: '02' },
    { title: t('how_s3_title'), desc: t('how_s3_desc'), num: '03' },
    { title: t('how_s4_title'), desc: t('how_s4_desc'), num: '04' },
  ]

  return (
    <main>
      {/* Hero */}
      <section className="bg-gradient-to-br from-orange-50 to-amber-100 py-20 px-4 text-center">
        <p className="text-xs text-orange-500 font-medium tracking-widest uppercase mb-3">
          {t('hero_tagline')}
        </p>
        <h1 className="text-5xl font-extrabold text-orange-700 mb-4">{t('hero_title')}</h1>
        <p className="text-lg text-gray-600 max-w-xl mx-auto mb-8">{t('hero_subtitle')}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            to="/voice"
            className="bg-orange-600 text-white px-6 py-3 rounded-full font-semibold hover:bg-orange-700 transition-colors"
          >
            {t('hero_cta_primary')}
          </Link>
          <Link
            to="/laws"
            className="border border-orange-400 text-orange-700 px-6 py-3 rounded-full font-semibold hover:bg-orange-50 transition-colors"
          >
            {t('hero_cta_secondary')}
          </Link>
        </div>

        {/* Stats */}
        <div className="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-3xl mx-auto">
          {stats.map(s => (
            <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-2xl font-bold text-orange-600">{s.num}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Problem */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-800 mb-3">{t('problem_title')}</h2>
          <p className="text-gray-500 mb-10 max-w-2xl">{t('problem_desc')}</p>
          <div className="grid sm:grid-cols-3 gap-6">
            {barriers.map(b => (
              <div key={b.title} className="bg-red-50 rounded-2xl p-6">
                <span className="text-3xl">{b.icon}</span>
                <h3 className="font-semibold text-gray-800 mt-3 mb-1">{b.title}</h3>
                <p className="text-sm text-gray-500">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 px-4 bg-orange-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-800 mb-10 text-center">{t('how_title')}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map(s => (
              <div key={s.num} className="bg-white rounded-2xl p-6 shadow-sm">
                <span className="text-3xl font-extrabold text-orange-200">{s.num}</span>
                <h3 className="font-semibold text-gray-800 mt-2 mb-1">{s.title}</h3>
                <p className="text-sm text-gray-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="bg-orange-600 py-14 px-4 text-center text-white">
        <h2 className="text-2xl font-bold mb-2">{t('cta_title')}</h2>
        <p className="text-orange-100 mb-6">{t('cta_desc')}</p>
        <Link
          to="/voice"
          className="bg-white text-orange-600 font-semibold px-8 py-3 rounded-full hover:bg-orange-50 transition-colors"
        >
          {t('cta_btn')}
        </Link>
      </section>
    </main>
  )
}
