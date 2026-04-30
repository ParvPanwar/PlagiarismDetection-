import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Login from './pages/Login/Login';
import StudentDashboard from './pages/StudentDashboard/StudentDashboard';
import FacultyDashboard from './pages/FacultyDashboard/FacultyDashboard';

// A simple protective wrapper that checks if the user is logged in
const ProtectedRoute = ({ children, allowedRole }) => {
  const userRole = localStorage.getItem('role');
  
  if (!userRole) {
    return <Navigate to="/" replace />;
  }
  
  if (allowedRole && userRole !== allowedRole) {
    // If they try to access the wrong dashboard, send them back to login
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  return (
    <Router>
      <div className="app-wrapper">
        <ToastContainer position="top-right" autoClose={3000} hideProgressBar={true} />
        <Routes>
          <Route path="/" element={<Login />} />
          
          <Route 
            path="/student" 
            element={
              <ProtectedRoute allowedRole="Student">
                <StudentDashboard />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/faculty" 
            element={
              <ProtectedRoute allowedRole="Faculty">
                <FacultyDashboard />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
