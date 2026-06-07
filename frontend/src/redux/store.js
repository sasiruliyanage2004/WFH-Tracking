// frontend/src/redux/store.js
import { configureStore, createSlice } from '@reduxjs/toolkit';

// Initial state
const token = localStorage.getItem('wfh_token') || null;
const userStr = localStorage.getItem('wfh_user');
const user = userStr ? JSON.parse(userStr) : null;

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    token,
    user,
    isAuthenticated: !!token,
    loading: false,
    error: null,
    onBreak: false,
    currentBreakType: null
  },
  reducers: {
    authStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    authSuccess: (state, action) => {
      state.loading = false;
      state.isAuthenticated = true;
      state.token = action.payload.token;
      state.user = action.payload.user;
      localStorage.setItem('wfh_token', action.payload.token);
      localStorage.setItem('wfh_user', JSON.stringify(action.payload.user));
    },
    authFail: (state, action) => {
      state.loading = false;
      state.isAuthenticated = false;
      state.token = null;
      state.user = null;
      state.error = action.payload;
      localStorage.removeItem('wfh_token');
      localStorage.removeItem('wfh_user');
    },
    logout: (state) => {
      state.loading = false;
      state.isAuthenticated = false;
      state.token = null;
      state.user = null;
      state.error = null;
      localStorage.removeItem('wfh_token');
      localStorage.removeItem('wfh_user');
    },
    updateProfileSuccess: (state, action) => {
      state.user = action.payload;
      localStorage.setItem('wfh_user', JSON.stringify(action.payload));
    },
    setBreakStart: (state, action) => {
      state.onBreak = true;
      state.currentBreakType = action.payload;
    },
    setBreakEnd: (state) => {
      state.onBreak = false;
      state.currentBreakType = null;
    }
  }
});

export const { authStart, authSuccess, authFail, logout, updateProfileSuccess, setBreakStart, setBreakEnd } = authSlice.actions;

export const store = configureStore({
  reducer: {
    auth: authSlice.reducer
  }
});
