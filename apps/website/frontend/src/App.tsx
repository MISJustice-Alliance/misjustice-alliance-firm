import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { MainLayout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { HomePage } from './pages/HomePage';
import { CaseListPage } from './pages/CaseListPage';
import { CaseDetailsPage } from './pages/CaseDetailsPage';
import { ContactPage } from './pages/ContactPage';
// Temporarily disabled - import { DocumentDemoPage } from './pages/DocumentDemoPage';
import { MissionStatementPage } from './pages/MissionStatementPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <MainLayout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/cases" element={<CaseListPage />} />
            <Route path="/cases/:id" element={<CaseDetailsPage />} />
            <Route path="/mission" element={<MissionStatementPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
{/* Temporarily disabled - <Route path="/documents/demo" element={<DocumentDemoPage />} /> */}
          </Routes>
        </MainLayout>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
