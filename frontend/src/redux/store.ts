// frontend/src/redux/store.js
import { configureStore, createSlice } from '@reduxjs/toolkit';

// Initial state with 2-hour session expiration check
const checkSessionExpiration = () => {
  const token = localStorage.getItem('wfh_token');
  const lastSeenStr = localStorage.getItem('wfh_last_seen');
  
  if (token && lastSeenStr) {
    const lastSeen = parseInt(lastSeenStr, 10);
    const now = Date.now();
    const twoHours = 2 * 60 * 60 * 1000; // 2 hours in ms
    
    if (now - lastSeen > twoHours) {
      console.log('Session expired (more than 2 hours since last activity). Force logging out...');
      localStorage.removeItem('wfh_token');
      localStorage.removeItem('wfh_user');
      localStorage.removeItem('wfh_last_seen');
      return { token: null, user: null };
    }
  }
  
  const userStr = localStorage.getItem('wfh_user');
  const user = userStr ? JSON.parse(userStr) : null;
  
  // Set current last seen time if authenticated
  if (token) {
    localStorage.setItem('wfh_last_seen', Date.now().toString());
  }
  
  return { token: token || null, user };
};

const { token, user } = checkSessionExpiration();

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
      localStorage.setItem('wfh_last_seen', Date.now().toString());
    },
    authFail: (state, action) => {
      state.loading = false;
      state.isAuthenticated = false;
      state.token = null;
      state.user = null;
      state.error = action.payload;
      localStorage.removeItem('wfh_token');
      localStorage.removeItem('wfh_user');
      localStorage.removeItem('wfh_last_seen');
    },
    logout: (state) => {
      state.loading = false;
      state.isAuthenticated = false;
      state.token = null;
      state.user = null;
      state.error = null;
      localStorage.removeItem('wfh_token');
      localStorage.removeItem('wfh_user');
      localStorage.removeItem('wfh_last_seen');
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

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

declare module 'react-redux' {
  export interface DefaultRootState extends RootState {}
}
