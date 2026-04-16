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

  const clampAndMap = (value: number) => {
    if (Number.isNaN(value)) return 0;
    let clamped = Math.max(-maxTilt, Math.min(maxTilt, value));
    return (clamped / maxTilt) * 50;
  };

  const safeAsin = (val: number) => Math.asin(Math.max(-1, Math.min(1, val)));

  const degToRad = Math.PI / 180;
  const radToDeg = 180 / Math.PI;

  const b = orientation.beta * degToRad;
  const c = orientation.gamma * degToRad;

  // 重力ベクトルを計算 (X: スマホの右, Y: スマホの上, Z: スマホの画面の表側)
  const gx = Math.cos(b) * Math.sin(c);
  const gy = -Math.sin(b);
  const gz = -Math.cos(b) * Math.cos(c);

  const absX = Math.abs(gx);
  const absY = Math.abs(gy);
  const absZ = Math.abs(gz);

  let modeLabel = '水平 (平置き)';
  let devX = 0;
  let devY = 0;

  if (absZ >= absX && absZ >= absY) {
    // 平置きモード：重力が主にZ軸方向
    modeLabel = '水平 (平置き)';
    devX = safeAsin(gx) * radToDeg;
    devY = safeAsin(gy) * radToDeg;
  } else if (absY >= absX && absY >= absZ) {
    // 縦置きモード：重力が主にY軸方向
    modeLabel = '垂直 (縦置き)';
    const sign = -Math.sign(gy) || 1; // upright = 1, upside down = -1
    devX = -safeAsin(gx) * radToDeg * sign;
    devY = -safeAsin(gz) * radToDeg * sign;
  } else {
    // 横置きモード：重力が主にX軸方向
    modeLabel = '垂直 (横置き)';
    const sign = Math.sign(gx) || 1; // right-edge down = 1, left-edge down = -1
    devX = -safeAsin(gy) * radToDeg * sign;
    devY = -safeAsin(gz) * radToDeg * sign;
  }

  // UI calculations: Bubble moves towards the higher side
  const top = 50 + clampAndMap(devY) + '%';
  const left = 50 - clampAndMap(devX) + '%';

  // Calculate how close to level it is to change color
  const diff = Math.sqrt(devX * devX + devY * devY);
  const isLevel = diff < 2.0;

  return (
    <Container maxWidth="sm" sx={{ mt: 4, textAlign: 'center' }}>
      <Typography variant="h4" gutterBottom color="primary">
        スマホ水平器
      </Typography>
      <Typography variant="body1" color="textSecondary">
        現在のモード: <strong>{modeLabel}</strong>
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
              <Typography variant="caption" color="textSecondary">左右のズレ</Typography>
              <Typography variant="h6">{Math.abs(devX).toFixed(1)}°</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="textSecondary">前後のズレ</Typography>
              <Typography variant="h6">{Math.abs(devY).toFixed(1)}°</Typography>
            </Box>
          </Box>
        </Box>
      )}
    </Container>
  );
}

export default App;
