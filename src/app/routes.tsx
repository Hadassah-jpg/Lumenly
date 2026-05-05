import { createBrowserRouter, Navigate } from 'react-router';
import Home from './pages/Home';
import ServiceSelection from './pages/client/ServiceSelection';
import DateSelection from './pages/client/DateSelection';
import TimeSelection from './pages/client/TimeSelection';
import ClientInfo from './pages/client/ClientInfo';
import Confirmation from './pages/client/Confirmation';
import Login from './pages/admin/Login';
import AdminLayout from './pages/admin/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import Appointments from './pages/admin/Appointments';
import Calendar from './pages/admin/Calendar';
import Services from './pages/admin/Services';
import Business from './pages/admin/Business';
import SettingsPage from './pages/admin/Settings';
import ProtectedRoute from './components/ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Home />,
  },
  {
    path: '/client/services',
    element: <ServiceSelection />,
  },
  {
    path: '/client/date',
    element: <DateSelection />,
  },
  {
    path: '/client/time',
    element: <TimeSelection />,
  },
  {
    path: '/client/info',
    element: <ClientInfo />,
  },
  {
    path: '/client/confirmation',
    element: <Confirmation />,
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/admin',
    element: (
      <ProtectedRoute>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: 'appointments',
        element: <Appointments />,
      },
      {
        path: 'calendar',
        element: <Calendar />,
      },
      {
        path: 'services',
        element: <Services />,
      },
      {
        path: 'business',
        element: <Business />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);