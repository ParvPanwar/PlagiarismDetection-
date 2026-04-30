import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiShield, FiUser, FiLock } from 'react-icons/fi';
import styles from './Login.module.css';

function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Student');

  const handleLogin = (e) => {
    e.preventDefault();

    if (role === 'Student' && username === 'student' && password === 'student123') {
      localStorage.setItem('role', 'Student');
      toast.success('Welcome to PlagioCheck Student Portal');
      navigate('/student');
    } else if (role === 'Faculty' && username === 'faculty' && password === 'faculty123') {
      localStorage.setItem('role', 'Faculty');
      toast.success('Welcome to PlagioCheck Faculty Portal');
      navigate('/faculty');
    } else {
      toast.error('Invalid credentials for the selected role.');
    }
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.card}>
        <div className={styles.header}>
          <FiShield className={styles.logoIcon} />
          <h1 className={styles.title}>PlagioCheck</h1>
          <p className={styles.subtitle}>Sign in to your account</p>
        </div>

        <form onSubmit={handleLogin}>
          <div className={styles.roleSelector}>
            <button
              type="button"
              className={`${styles.roleBtn} ${role === 'Student' ? styles.roleBtnActive : ''}`}
              onClick={() => setRole('Student')}
            >
              Student
            </button>
            <button
              type="button"
              className={`${styles.roleBtn} ${role === 'Faculty' ? styles.roleBtnActive : ''}`}
              onClick={() => setRole('Faculty')}
            >
              Faculty
            </button>
          </div>

          <div className={styles.formGroup}>
            <div className={styles.inputWrapper}>
              <FiUser className={styles.inputIcon} />
              <input
                className={styles.input}
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <div className={styles.inputWrapper}>
              <FiLock className={styles.inputIcon} />
              <input
                className={styles.input}
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className={styles.submitBtn}>
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
