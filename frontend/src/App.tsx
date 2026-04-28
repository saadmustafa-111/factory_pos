import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { ProtectedRoute } from './components/ProtectedRoute';
import BackupRestore from './pages/BackupRestore';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Login from './pages/Login';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import AdvancePayments from './pages/AdvancePayments';
import Expenses from './pages/Expenses';
import UdharBook from './pages/UdharBook';
import DailyRegister from './pages/DailyRegister';
import MillLedger from './pages/MillLedger';
import Reports from './pages/Reports';
import Sales from './pages/Sales';
import Settings from './pages/Settings';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="sales" element={<Sales />} />
        <Route path="customers" element={<Customers />} />
        <Route path="customers/:id" element={<CustomerDetail />} />
        <Route path="customer-ledger" element={<Navigate to="/customers" replace />} />
        <Route path="advance-payments" element={<AdvancePayments />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="udhar-book" element={<UdharBook />} />
        <Route path="daily-register" element={<DailyRegister />} />
        <Route path="mill-ledger" element={<MillLedger />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
        <Route path="backup" element={<BackupRestore />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
