import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import IntakeForm from './pages/IntakeForm';
import MatterDashboard from './pages/MatterDashboard';
import ApprovalInbox from './pages/ApprovalInbox';

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<IntakeForm />} />
          <Route path="/dashboard" element={<MatterDashboard />} />
          <Route path="/approvals" element={<ApprovalInbox />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
