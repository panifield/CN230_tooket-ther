/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Booking from './pages/Booking';
import Payment from './pages/Payment';
import MyTicket from './pages/MyTicket';
import PostPayment from './pages/PostPayment';
import OrganizerDashboard from './pages/OrganizerDashboard';
import OrganizerZones from './pages/OrganizerZones';
import OrganizerCreateConcert from './pages/OrganizerCreateConcert';
import Checker from './pages/Checker';
import { useAuth } from './context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) => {
  const { role } = useAuth();
  if (!role || !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="booking" element={<Booking />} />
          <Route path="payment" element={<Payment />} />
          <Route path="my-tickets" element={<MyTicket />} />
          <Route path="post-purchase" element={<PostPayment />} />
          <Route path="organizer">
            <Route path="dashboard" element={
              <ProtectedRoute allowedRoles={['organizer']}>
                <OrganizerDashboard />
              </ProtectedRoute>
            } />
            <Route path="zones" element={
              <ProtectedRoute allowedRoles={['organizer']}>
                <OrganizerZones />
              </ProtectedRoute>
            } />
            <Route path="create-concert" element={
              <ProtectedRoute allowedRoles={['organizer']}>
                <OrganizerCreateConcert />
              </ProtectedRoute>
            } />
          </Route>
          <Route path="checker" element={
            <ProtectedRoute allowedRoles={['checker', 'organizer']}>
              <Checker />
            </ProtectedRoute>
          } />
        </Route>
      </Routes>
    </Router>
  );
}

