import React from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  AppBar,
  Toolbar,
  useTheme,
  useMediaQuery,
  Fade,
  Slide,
} from '@mui/material';
import {
  Security as SecurityIcon,
  AdminPanelSettings as AdminIcon,
  Business as ClientIcon,
  LocationOn as LocationIcon,
  Schedule as ScheduleIcon,
  Assessment as ReportsIcon,
  Notifications as NotificationsIcon,
  Shield as ShieldIcon,
} from '@mui/icons-material';

const LandingPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleAdminPortal = () => {
    // Redirect to admin portal on port 12001
    window.location.href = 'https://work-2-izuazmglxvjecjaw.prod-runtime.all-hands.dev';
  };

  const handleClientPortal = () => {
    // Redirect to client portal on port 12002
    window.location.href = 'http://localhost:12002';
  };

  const features = [
    {
      icon: <LocationIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Real-time GPS Tracking',
      description: 'Track security personnel location with geofencing capabilities'
    },
    {
      icon: <ScheduleIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Shift Management',
      description: 'Automated scheduling and time & attendance management'
    },
    {
      icon: <ReportsIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Digital Reporting',
      description: 'Streamlined patrol and incident reporting with photo/video support'
    },
    {
      icon: <NotificationsIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Real-time Notifications',
      description: 'Instant alerts for critical events and status updates'
    },
  ];

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
      {/* Header */}
      <AppBar position="static" elevation={0} sx={{ backgroundColor: 'white', color: 'text.primary' }}>
        <Toolbar>
          <SecurityIcon sx={{ mr: 2, color: 'primary.main', fontSize: 32 }} />
          <Typography variant="h5" component="div" sx={{ flexGrow: 1, fontWeight: 700, color: 'primary.main' }}>
            BahinLink
          </Typography>
          <Typography variant="subtitle1" sx={{ color: 'text.secondary' }}>
            Security Workforce Management
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Hero Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Fade in timeout={1000}>
          <Box textAlign="center" mb={8}>
            <Typography 
              variant={isMobile ? "h3" : "h2"} 
              component="h1" 
              gutterBottom 
              sx={{ 
                fontWeight: 700,
                background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 3
              }}
            >
              Professional Security Management
            </Typography>
            <Typography 
              variant="h5" 
              color="text.secondary" 
              paragraph 
              sx={{ maxWidth: 600, mx: 'auto', mb: 4 }}
            >
              Streamline your security operations with real-time tracking, automated scheduling, 
              and comprehensive reporting tools designed for modern security companies.
            </Typography>
            
            {/* Portal Selection Cards */}
            <Grid container spacing={4} justifyContent="center" sx={{ mt: 6 }}>
              <Grid item xs={12} md={5}>
                <Slide direction="right" in timeout={1200}>
                  <Card 
                    sx={{ 
                      height: '100%',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-8px)',
                        boxShadow: '0 8px 30px rgba(25, 118, 210, 0.2)',
                      }
                    }}
                    onClick={handleAdminPortal}
                  >
                    <CardContent sx={{ p: 4, textAlign: 'center' }}>
                      <AdminIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
                      <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
                        Admin Portal
                      </Typography>
                      <Typography variant="body1" color="text.secondary" paragraph>
                        For administrators, supervisors, and security agents. 
                        Manage operations, track personnel, and oversee security services.
                      </Typography>
                      <Box sx={{ mt: 3 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          Access for:
                        </Typography>
                        <Typography variant="body2" color="primary.main" sx={{ fontWeight: 600 }}>
                          • Administrators & HR Personnel<br/>
                          • Field Supervisors<br/>
                          • Security Agents
                        </Typography>
                      </Box>
                      <Button 
                        variant="contained" 
                        size="large" 
                        fullWidth 
                        sx={{ mt: 3 }}
                        onClick={handleAdminPortal}
                      >
                        Access Admin Portal
                      </Button>
                    </CardContent>
                  </Card>
                </Slide>
              </Grid>
              
              <Grid item xs={12} md={5}>
                <Slide direction="left" in timeout={1200}>
                  <Card 
                    sx={{ 
                      height: '100%',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-8px)',
                        boxShadow: '0 8px 30px rgba(220, 0, 78, 0.2)',
                      }
                    }}
                    onClick={handleClientPortal}
                  >
                    <CardContent sx={{ p: 4, textAlign: 'center' }}>
                      <ClientIcon sx={{ fontSize: 60, color: 'secondary.main', mb: 2 }} />
                      <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
                        Client Portal
                      </Typography>
                      <Typography variant="body1" color="text.secondary" paragraph>
                        For clients to monitor security services in real-time, 
                        access reports, and request additional services.
                      </Typography>
                      <Box sx={{ mt: 3 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          Features include:
                        </Typography>
                        <Typography variant="body2" color="secondary.main" sx={{ fontWeight: 600 }}>
                          • Real-time Personnel Monitoring<br/>
                          • Service Reports & Analytics<br/>
                          • Incident Reporting & Requests
                        </Typography>
                      </Box>
                      <Button 
                        variant="contained" 
                        color="secondary"
                        size="large" 
                        fullWidth 
                        sx={{ mt: 3 }}
                        onClick={handleClientPortal}
                      >
                        Access Client Portal
                      </Button>
                    </CardContent>
                  </Card>
                </Slide>
              </Grid>
            </Grid>
          </Box>
        </Fade>

        {/* Features Section */}
        <Fade in timeout={1500}>
          <Box sx={{ mt: 12 }}>
            <Typography variant="h3" textAlign="center" gutterBottom sx={{ fontWeight: 600, mb: 6 }}>
              Key Features
            </Typography>
            <Grid container spacing={4}>
              {features.map((feature, index) => (
                <Grid item xs={12} sm={6} md={3} key={index}>
                  <Slide direction="up" in timeout={1500 + index * 200}>
                    <Card sx={{ height: '100%', textAlign: 'center' }}>
                      <CardContent sx={{ p: 3 }}>
                        {feature.icon}
                        <Typography variant="h6" gutterBottom sx={{ mt: 2, fontWeight: 600 }}>
                          {feature.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {feature.description}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Slide>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Fade>

        {/* About Section */}
        <Fade in timeout={2000}>
          <Box sx={{ mt: 12, textAlign: 'center' }}>
            <ShieldIcon sx={{ fontSize: 80, color: 'primary.main', mb: 3 }} />
            <Typography variant="h3" gutterBottom sx={{ fontWeight: 600 }}>
              About BahinLink
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 800, mx: 'auto', lineHeight: 1.6 }}>
              BahinLink is a comprehensive workforce management solution designed specifically for 
              Bahin SARL, a private security company. Our platform enhances operational efficiency, 
              provides real-time control, and increases client satisfaction through modern technology 
              and innovative security management tools.
            </Typography>
          </Box>
        </Fade>
      </Container>

      {/* Footer */}
      <Box sx={{ backgroundColor: 'primary.main', color: 'white', py: 4, mt: 8 }}>
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Box display="flex" alignItems="center">
                <SecurityIcon sx={{ mr: 2, fontSize: 32 }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  BahinLink
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>
                Professional Security Workforce Management Solution
              </Typography>
            </Grid>
            <Grid item xs={12} md={6} textAlign={isMobile ? 'left' : 'right'}>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                © 2025 Bahin SARL. All rights reserved.
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                Powered by BahinLink Technology
              </Typography>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </Box>
  );
};

export default LandingPage;