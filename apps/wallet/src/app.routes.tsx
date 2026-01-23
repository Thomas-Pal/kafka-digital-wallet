import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Health from './pages/Health';
import WorkBenefits from './pages/WorkBenefits';
import HMRC from './pages/HMRC';
import Consents from './pages/Consents';
import Activity from './pages/Activity';
import ScenarioLab from './components/ScenarioLab';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/health" element={<Health />} />
      <Route path="/work" element={<WorkBenefits />} />
      <Route path="/hmrc" element={<HMRC />} />
      <Route path="/consents" element={<Consents />} />
      <Route path="/activity" element={<Activity />} />
      <Route path="/scenario-lab" element={<ScenarioLab />} />
    </Routes>
  );
}
