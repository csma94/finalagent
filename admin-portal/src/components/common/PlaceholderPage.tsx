import React from 'react';
import { Box, Typography, Card, CardContent, Button } from '@mui/material';
import { Warning as WarningIcon } from '@mui/icons-material';

interface PlaceholderPageProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actionText?: string;
  onAction?: () => void;
}

const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ 
  title, 
  description = 'This feature requires additional configuration or data to be displayed.',
  icon = <WarningIcon />,
  actionText,
  onAction
}) => {
  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 4 }}>
        {title}
      </Typography>
      
      <Card>
        <CardContent>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              py: 8,
              textAlign: 'center',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 80,
                height: 80,
                borderRadius: '50%',
                backgroundColor: 'warning.light',
                color: 'warning.main',
                mb: 3,
              }}
            >
              {React.cloneElement(icon as React.ReactElement, { sx: { fontSize: 40 } })}
            </Box>
            
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
              {title}
            </Typography>
            
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 400, mb: 3 }}>
              {description}
            </Typography>

            {actionText && onAction && (
              <Button variant="contained" onClick={onAction}>
                {actionText}
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default PlaceholderPage;
