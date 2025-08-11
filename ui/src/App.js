import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

// API Configuration - uses environment variables or defaults
const AUTH_API = process.env.AUTH_API_URL || `http://${window.location.hostname}:3001/api/auth`;
const TASK_API = process.env.TASK_API_URL || `http://${window.location.hostname}:3002/api/tasks`;

console.log('API URLs:', { AUTH_API, TASK_API }); // Debug logging

function App() {
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Login form state
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerForm, setRegisterForm] = useState({ username: '', email: '', password: '' });
  
  // Task form state
  const [taskForm, setTaskForm] = useState({ title: '', description: '', priority: 'medium' });
  const [editingTask, setEditingTask] = useState(null);

  useEffect(() => {
    // Intentional security flaw: storing JWT in localStorage
    const token = localStorage.getItem('token');
    if (token) {
      // Intentional security flaw: no token validation on startup
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      setUser(userData);
      loadTasks();
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${AUTH_API}/login`, loginForm);
      const { token, user: userData } = response.data;
      
      // Intentional security flaw: storing sensitive data in localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      
      setUser(userData);
      setLoginForm({ username: '', password: '' });
      await loadTasks();
    } catch (err) {
      // Intentional security flaw: exposing detailed error info
      setError(err.response?.data?.error || 'Login failed');
    }
    setLoading(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${AUTH_API}/register`, registerForm);
      const { token, user: userData } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      
      setUser(userData);
      setRegisterForm({ username: '', email: '', password: '' });
      setIsRegistering(false);
      await loadTasks();
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    }
    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setTasks([]);
  };

  const loadTasks = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(TASK_API, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTasks(response.data);
    } catch (err) {
      setError('Failed to load tasks');
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      await axios.post(TASK_API, taskForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setTaskForm({ title: '', description: '', priority: 'medium' });
      await loadTasks();
    } catch (err) {
      setError('Failed to create task');
    }
    setLoading(false);
  };

  const handleUpdateTask = async (taskId, updates) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${TASK_API}/${taskId}`, updates, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await loadTasks();
    } catch (err) {
      setError('Failed to update task');
    }
  };

  const handleDeleteTask = async (taskId) => {
    // Intentional security flaw: no confirmation dialog
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${TASK_API}/${taskId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await loadTasks();
    } catch (err) {
      setError('Failed to delete task');
    }
  };

  const toggleTaskStatus = (task) => {
    const newStatus = task.status === 'pending' ? 'completed' : 'pending';
    handleUpdateTask(task.id, { ...task, status: newStatus });
  };

  if (!user) {
    return (
      <div className="app">
        <div className="auth-container">
          <h1>Task Manager</h1>
          
          {error && <div className="error">{error}</div>}
          
          <div className="auth-tabs">
            <button 
              className={!isRegistering ? 'active' : ''}
              onClick={() => setIsRegistering(false)}
            >
              Login
            </button>
            <button 
              className={isRegistering ? 'active' : ''}
              onClick={() => setIsRegistering(true)}
            >
              Register
            </button>
          </div>

          {!isRegistering ? (
            <form onSubmit={handleLogin} className="auth-form">
              <input
                type="text"
                placeholder="Username"
                value={loginForm.username}
                onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                required
              />
              <button type="submit" disabled={loading}>
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="auth-form">
              <input
                type="text"
                placeholder="Username"
                value={registerForm.username}
                onChange={(e) => setRegisterForm({...registerForm, username: e.target.value})}
                required
              />
              <input
                type="email"
                placeholder="Email"
                value={registerForm.email}
                onChange={(e) => setRegisterForm({...registerForm, email: e.target.value})}
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={registerForm.password}
                onChange={(e) => setRegisterForm({...registerForm, password: e.target.value})}
                required
              />
              <button type="submit" disabled={loading}>
                {loading ? 'Registering...' : 'Register'}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Task Manager</h1>
        <div className="user-info">
          <span>Welcome, {user.username}!</span>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </header>

      {error && <div className="error">{error}</div>}

      <div className="main-content">
        <div className="task-form-section">
          <h2>Create New Task</h2>
          <form onSubmit={handleCreateTask} className="task-form">
            <input
              type="text"
              placeholder="Task title"
              value={taskForm.title}
              onChange={(e) => setTaskForm({...taskForm, title: e.target.value})}
              required
            />
            <textarea
              placeholder="Task description"
              value={taskForm.description}
              onChange={(e) => setTaskForm({...taskForm, description: e.target.value})}
            />
            <select
              value={taskForm.priority}
              onChange={(e) => setTaskForm({...taskForm, priority: e.target.value})}
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
            </select>
            <button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Task'}
            </button>
          </form>
        </div>

        <div className="tasks-section">
          <h2>Your Tasks ({tasks.length})</h2>
          {tasks.length === 0 ? (
            <p>No tasks yet. Create your first task above!</p>
          ) : (
            <div className="tasks-list">
              {tasks.map(task => (
                <div key={task.id} className={`task-item ${task.status}`}>
                  <div className="task-header">
                    <h3>{task.title}</h3>
                    <span className={`priority ${task.priority}`}>
                      {task.priority}
                    </span>
                  </div>
                  <p>{task.description}</p>
                  <div className="task-meta">
                    <span>Status: {task.status}</span>
                    <span>Created: {new Date(task.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="task-actions">
                    <button onClick={() => toggleTaskStatus(task)}>
                      Mark as {task.status === 'pending' ? 'Completed' : 'Pending'}
                    </button>
                    <button 
                      onClick={() => handleDeleteTask(task.id)}
                      className="delete-btn"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;