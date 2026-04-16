import { useState, useEffect } from 'react';
import { Box, Button, Typography, Paper, Container } from '@mui/material';
import ExploreIcon from '@mui/icons-material/Explore';

function App() {
  const [orientation, setOrientation] = useState({ beta: 0, gamma: 0, alpha: 0 });
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);

  const requestPermission = async () => {
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const permissionState = await (DeviceOrientationEvent as any).requestPermission();
        if (permissionState === 'granted') {
          setPermissionGranted(true);
        } else {
          setPermissionGranted(false);
          alert('アクセスが拒否されました。');
        }
      } catch (error) {
        console.error(error);
        setPermissionGranted(false);
      }
    } else {
      // Non-iOS 13+ devices
      setPermissionGranted(true);
    }
  };

  useEffect(() => {
    if (permissionGranted) {
      const handleOrientation = (e: DeviceOrientationEvent) => {
        setOrientation({
          beta: e.beta || 0,
          gamma: e.gamma || 0,
          alpha: e.alpha || 0,
        });
      };
      window.addEventListener('deviceorientation', handleOrientation);
      return () => window.removeEventListener('deviceorientation', handleOrientation);
    }
  }, [permissionGranted]);

  // Max tilt to consider (degrees)
  const maxTilt = 45;

  // Clamp and map degrees to percentage offset (-50% to 50%)
  const clampAndMap = (value: number) => {
    let clamped = Math.max(-maxTilt, Math.min(maxTilt, value));
    return (clamped / maxTilt) * 50;
  };

  // UI calculations: Bubble moves towards the higher side
  const top = 50 + clampAndMap(orientation.beta) + '%';
  const left = 50 - clampAndMap(orientation.gamma) + '%';

  // Calculate how close to level it is to change color
  const diff = Math.sqrt(orientation.beta * orientation.beta + orientation.gamma * orientation.gamma);
  const isLevel = diff < 2.0;

  return (
    <Container maxWidth="sm" sx={{ mt: 4, textAlign: 'center' }}>
      <Typography variant="h4" gutterBottom color="primary">
        スマホ水平器
      </Typography>
      <Typography variant="body1" color="textSecondary">
        スマホを平らな場所に置いてみましょう。
      </Typography>

      {!permissionGranted ? (
        <Paper elevation={3} sx={{ p: 4, mt: 4, borderRadius: 4 }}>
          <ExploreIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            センサーへのアクセスが必要です
          </Typography>
          <Button variant="contained" color="primary" size="large" onClick={requestPermission}>
            開始する
          </Button>
        </Paper>
      ) : (
        <Box sx={{ mt: 5 }}>
          <Box
            sx={{
              position: 'relative',
              width: { xs: 250, sm: 300 },
              height: { xs: 250, sm: 300 },
              borderRadius: '50%',
              border: '4px solid',
              borderColor: isLevel ? 'success.main' : 'divider',
              margin: '0 auto',
              backgroundColor: isLevel ? 'success.light' : 'background.paper',
              transition: 'background-color 0.3s, border-color 0.3s',
              boxShadow: 'inset 0 0 20px rgba(0,0,0,0.1)',
              overflow: 'hidden',
            }}
          >
            {/* Crosshairs */}
            <Box sx={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', bgcolor: 'rgba(0,0,0,0.2)' }} />
            <Box sx={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: '1px', bgcolor: 'rgba(0,0,0,0.2)' }} />

            {/* Center target circle */}
            <Box sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              border: '2px solid rgba(0,0,0,0.3)',
              transform: 'translate(-50%, -50%)'
            }} />

            {/* Bubble */}
            <Box
              sx={{
                position: 'absolute',
                top: top,
                left: left,
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                backgroundColor: 'rgba(0, 150, 255, 0.6)',
                border: '2px solid white',
                transform: 'translate(-50%, -50%)',
                boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
                transition: 'top 0.1s ease-out, left 0.1s ease-out',
              }}
            />
          </Box>

          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-around' }}>
            <Box>
              <Typography variant="caption" color="textSecondary">X (Gamma)</Typography>
              <Typography variant="h6">{orientation.gamma.toFixed(1)}°</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="textSecondary">Y (Beta)</Typography>
              <Typography variant="h6">{orientation.beta.toFixed(1)}°</Typography>
            </Box>
          </Box>
        </Box>
      )}
    </Container>
  );
}

export default App;
