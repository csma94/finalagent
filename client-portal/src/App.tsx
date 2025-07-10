import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box, Container, Card, CardContent, Typography, CircularProgress } from '@mui/material';
import { Security as SecurityIcon } from '@mui/icons-material';
import { Provider } from 'react-redux';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ClerkProvider, useAuth as useClerkAuth, SignIn, SignUp } from '@clerk/clerk-react';

import { store } from './store';
import ErrorBoundary from './components/common/ErrorBoundary';
import { SocketProvider } from './providers/SocketProvider';
import { NotificationProvider } from './providers/NotificationProvider';

// Components
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';

// Pages
import DashboardPage from './pages/DashboardPage';
import ReportsPage from './pages/ReportsPage';
import ServiceRequestsPage from './pages/ServiceRequestsPage';
import IncidentsPage from './pages/IncidentsPage';
import BillingPage from './pages/BillingPage';
import SettingsPage from './pages/SettingsPage';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          borderRadius: 12,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
  },
});

const AuthenticatedApp: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <SocketProvider>
      <NotificationProvider>
        <Box sx={{ display: 'flex', minHeight: '100vh' }}>
          <Navbar onMenuClick={handleSidebarToggle} />
          <Sidebar open={sidebarOpen} onToggle={handleSidebarToggle} />
          <Box
            component="main"
            sx={{
              flexGrow: 1,
              p: 3,
              mt: 8, // Account for navbar height
              ml: sidebarOpen ? '240px' : '60px',
              transition: 'margin-left 0.3s ease',
            }}
          >
            <Routes>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/service-requests" element={<ServiceRequestsPage />} />
              <Route path="/incidents" element={<IncidentsPage />} />
              <Route path="/billing" element={<BillingPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<DashboardPage />} />
            </Routes>
          </Box>
        </Box>
      </NotificationProvider>
    </SocketProvider>
  );
};

const AppContent: React.FC = () => {
  const { isLoaded, isSignedIn } = useClerkAuth();

  // Show loading spinner while Clerk is initializing
  if (!isLoaded) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Routes>
      {/* Protected routes - only accessible when signed in */}
      <Route
        path="/dashboard"
        element={
          isSignedIn ? (
            <AuthenticatedApp />
          ) : (
            <Navigate to="/sign-in" replace />
          )
        }
      />
      <Route
        path="/reports"
        element={
          isSignedIn ? (
            <AuthenticatedApp />
          ) : (
            <Navigate to="/sign-in" replace />
          )
        }
      />
      <Route
        path="/service-requests"
        element={
          isSignedIn ? (
            <AuthenticatedApp />
          ) : (
            <Navigate to="/sign-in" replace />
          )
        }
      />
      <Route
        path="/incidents"
        element={
          isSignedIn ? (
            <AuthenticatedApp />
          ) : (
            <Navigate to="/sign-in" replace />
          )
        }
      />
      <Route
        path="/billing"
        element={
          isSignedIn ? (
            <AuthenticatedApp />
          ) : (
            <Navigate to="/sign-in" replace />
          )
        }
      />
      <Route
        path="/settings"
        element={
          isSignedIn ? (
            <AuthenticatedApp />
          ) : (
            <Navigate to="/sign-in" replace />
          )
        }
      />

      {/* Sign-in page */}
      <Route
        path="/sign-in/*"
        element={
          !isSignedIn ? (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh',
                backgroundColor: 'background.default',
              }}
            >
              <Container maxWidth="sm">
                <Card>
                  <CardContent sx={{ p: 4 }}>
                    <Box sx={{ textAlign: 'center', mb: 4 }}>
                      <SecurityIcon
                        sx={{
                          fontSize: 60,
                          color: 'secondary.main',
                          mb: 2
                        }}
                      />
                      <Typography variant="h4" gutterBottom>
                        BahinLink Client Portal
                      </Typography>
                      <Typography variant="subtitle1" color="text.secondary">
                        Security Service Management
                      </Typography>
                    </Box>
                    <SignIn
                      routing="path"
                      path="/sign-in"
                      signUpUrl="/sign-up"
                    />
                  </CardContent>
                </Card>
              </Container>
            </Box>
          ) : (
            <Navigate to="/dashboard" replace />
          )
        }
      />

      {/* Sign-up page */}
      <Route
        path="/sign-up/*"
        element={
          !isSignedIn ? (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh',
                backgroundColor: 'background.default',
              }}
            >
              <Container maxWidth="sm">
                <Card>
                  <CardContent sx={{ p: 4 }}>
                    <Box sx={{ textAlign: 'center', mb: 4 }}>
                      <SecurityIcon
                        sx={{
                          fontSize: 60,
                          color: 'secondary.main',
                          mb: 2
                        }}
                      />
                      <Typography variant="h4" gutterBottom>
                        BahinLink Client Portal
                      </Typography>
                      <Typography variant="subtitle1" color="text.secondary">
                        Security Service Management
                      </Typography>
                    </Box>
                    <SignUp
                      routing="path"
                      path="/sign-up"
                      signInUrl="/sign-in"
                    />
                  </CardContent>
                </Card>
              </Container>
            </Box>
          ) : (
            <Navigate to="/dashboard" replace />
          )
        }
      />

      {/* Default redirects */}
      <Route
        path="/"
        element={
          isSignedIn ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <Navigate to="/sign-in" replace />
          )
        }
      />

      {/* Catch-all redirect */}
      <Route
        path="*"
        element={
          isSignedIn ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <Navigate to="/sign-in" replace />
          )
        }
      />
    </Routes>
  );
};

const App: React.FC = () => {
  if (!process.env.REACT_APP_CLERK_PUBLISHABLE_KEY) {
    throw new Error('Missing Clerk publishable key');
  }

  return (
    <ClerkProvider publishableKey={process.env.REACT_APP_CLERK_PUBLISHABLE_KEY}>
      <Provider store={store}>
        <ThemeProvider theme={theme}>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <CssBaseline />
            <Router>
              <ErrorBoundary>
                <AppContent />
              </ErrorBoundary>
            </Router>
          </LocalizationProvider>
        </ThemeProvider>
      </Provider>
    </ClerkProvider>
  );
};

export default App;
