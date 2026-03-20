import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { LanguageProvider } from './i18n/LanguageContext'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import LandingPage from './pages/LandingPage'
import LawsPage from './pages/LawsPage'
import DashboardPage from './pages/DashboardPage'
import VoiceInput from './components/VoiceInput'

function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <div className="flex flex-col min-h-screen">
          <Navbar />
          <div className="flex-1">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/laws" element={<LawsPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/voice" element={<VoiceInput />} />
            </Routes>
          </div>
          <Footer />
        </div>
      </BrowserRouter>
    </LanguageProvider>
  )
}

export default App
