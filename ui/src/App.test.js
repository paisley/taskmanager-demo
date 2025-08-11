import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

describe('Task Manager App', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  test('renders Task Manager title', () => {
    render(<App />);
    expect(screen.getByText('Task Manager')).toBeInTheDocument();
  });

  test('renders login form when not authenticated', () => {
    render(<App />);
    
    expect(screen.getByPlaceholderText('Username')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    expect(screen.getAllByText('Login')).toHaveLength(2);
    expect(screen.getByText('Register')).toBeInTheDocument();
  });

  test('can switch between login and register tabs', () => {
    render(<App />);
    
    // Get the tab buttons specifically (not the submit button)
    const loginTab = screen.getAllByText('Login')[0]; // First one is the tab
    const registerTab = screen.getByText('Register');
    
    expect(loginTab).toHaveClass('active');
    expect(registerTab).not.toHaveClass('active');
    
    // Click register tab
    fireEvent.click(registerTab);
    
    expect(registerTab).toHaveClass('active');
    expect(loginTab).not.toHaveClass('active');
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
  });

  test('allows user input in form fields', () => {
    render(<App />);
    
    const usernameInput = screen.getByPlaceholderText('Username');
    const passwordInput = screen.getByPlaceholderText('Password');
    
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    
    expect(usernameInput.value).toBe('testuser');
    expect(passwordInput.value).toBe('password123');
  });
});