import { useState, useEffect } from 'react';
import { Box, Button, Typography, Paper, Container, FormControl, Select, MenuItem } from '@mui/material';
import ExploreIcon from '@mui/icons-material/Explore';
import AutoModeIcon from '@mui/icons-material/AutoMode';
import StayCurrentPortraitIcon from '@mui/icons-material/StayCurrentPortrait';
import StayCurrentLandscapeIcon from '@mui/icons-material/StayCurrentLandscape';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import SwapVertIcon from '@mui/icons-material/SwapVert';

function App() {
  const [orientation, setOrientation] = useState({ beta: 0, gamma: 0, alpha: 0 });
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [modeSetting, setModeSetting] = useState<'auto' | 'horizontal' | 'portrait' | 'landscape'>('auto');

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

  let detectedMode: 'horizontal' | 'portrait' | 'landscape' = 'horizontal';
  
  if (absZ >= absX && absZ >= absY) {
    detectedMode = 'horizontal';
  } else if (absY >= absX && absY >= absZ) {
    detectedMode = 'portrait';
  } else {
    detectedMode = 'landscape';
  }

  const activeMode = modeSetting === 'auto' ? detectedMode : modeSetting;

  let devX = 0;
  let devY = 0;

  if (activeMode === 'horizontal') {
    devX = safeAsin(gx) * radToDeg;
    devY = safeAsin(gy) * radToDeg;
  } else if (activeMode === 'portrait') {
    const sign = -Math.sign(gy) || 1; // upright = 1, upside down = -1
    devX = -safeAsin(gx) * radToDeg * sign;
    devY = -safeAsin(gz) * radToDeg * sign;
  } else {
    const sign = Math.sign(gx) || 1; // right-edge down = 1, left-edge down = -1
    devX = -safeAsin(gy) * radToDeg * sign;
    devY = -safeAsin(gz) * radToDeg * sign;
  }

  // --- イージングと描画座標の計算 ---

  // 全体の傾き量（ベクトルの長さ）
  const tiltMagnitude = Math.sqrt(devX * devX + devY * devY);
  // 最大角でクランプし、0.0 〜 1.0 の割合に正規化
  const normMag = Math.min(tiltMagnitude, maxTilt) / maxTilt;

  // イージング適用 (Ease Out: 中心での変化を大きく、端に行くほど緩やかに)
  // 指数を大きくするほど中心付近がセンシティブになります
  const easedMag = tiltMagnitude === 0 ? 0 : (1 - Math.pow(1 - normMag, 2.5));

  // 元のベクトル長に対して必要な乗算倍率を算出
  const scale = tiltMagnitude === 0 ? 0 : (easedMag / (tiltMagnitude / maxTilt));

  // 気泡の可動半径（コンテナのパーセンテージ）50%だと枠を超えるため少し小さく
  // 気泡自体のサイズが20%なので、半径10%分を考慮して上限を40%にする
  const maxRadius = 40;

  // UI座標の計算 (XY成分の比率を維持したままスケーリング)
  const top = 50 + ((devY / maxTilt) * scale) * maxRadius + '%';
  const left = 50 - ((devX / maxTilt) * scale) * maxRadius + '%';

  // 水平判定
  const isLevel = tiltMagnitude < 2.0 || Number.isNaN(tiltMagnitude);

  // 桁数を合わせて（-10.00 や - 1.00、  1.00のように）表示するヘルパー
  const formatAngle = (val: number) => {
    // 浮動小数点誤差による -0.00 を防ぐため、一旦toFixedしてからパース
    const fixedNum = Number(val.toFixed(2));
    const isNegative = fixedNum < 0 || Object.is(fixedNum, -0);
    const absStr = Math.abs(fixedNum).toFixed(2);
    const paddedStr = absStr.length < 5 ? '\u00A0' + absStr : absStr;
    const sign = isNegative ? '-' : '\u00A0';
    return sign + paddedStr;
  };

  return (
    <Container
      maxWidth="md"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh', // Viewport height including mobile safe areas
        justifyContent: 'center',
        alignItems: 'center',
        p: { xs: 2, sm: 4 },
        overflow: 'hidden' // Prevent scrolling
      }}
    >
      <Box sx={{ textAlign: 'center', mb: { xs: 2, sm: 4 }, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <Typography variant="h5" color="primary">
          スマホ水平器
        </Typography>
        
        {permissionGranted && (
          <FormControl size="small" variant="outlined" sx={{ minWidth: 220 }}>
            <Select
              value={modeSetting}
              onChange={(e) => setModeSetting(e.target.value as any)}
              sx={{ 
                bgcolor: 'background.paper', 
                borderRadius: 2,
                '& .MuiSelect-select': {
                  display: 'flex',
                  alignItems: 'center',
                }
              }}
            >
              <MenuItem value="auto" sx={{ display: 'flex', alignItems: 'center' }}><AutoModeIcon sx={{ mr: 1, fontSize: 20 }} /> 自動切り替えモード</MenuItem>
              <MenuItem value="horizontal" sx={{ display: 'flex', alignItems: 'center' }}><ViewInArIcon sx={{ mr: 1, fontSize: 20 }} /> 固定: 水平 (平置き)</MenuItem>
              <MenuItem value="portrait" sx={{ display: 'flex', alignItems: 'center' }}><StayCurrentPortraitIcon sx={{ mr: 1, fontSize: 20 }} /> 固定: 垂直 (縦置き)</MenuItem>
              <MenuItem value="landscape" sx={{ display: 'flex', alignItems: 'center' }}><StayCurrentLandscapeIcon sx={{ mr: 1, fontSize: 20 }} /> 固定: 垂直 (横置き)</MenuItem>
            </Select>
          </FormControl>
        )}
      </Box>

      {!permissionGranted ? (
        <Paper elevation={3} sx={{ p: 4, borderRadius: 4, textAlign: 'center' }}>
          <ExploreIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            センサーへのアクセスが必要です
          </Typography>
          <Button variant="contained" color="primary" size="large" onClick={requestPermission}>
            開始する
          </Button>
        </Paper>
      ) : (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            '@media (orientation: landscape)': { flexDirection: 'row' },
            alignItems: 'center',
            justifyContent: 'center',
            gap: { xs: 3, sm: 6 },
            width: '100%'
          }}
        >
          {/* Main Bubble Target */}
          <Box
            sx={{
              position: 'relative',
              width: { xs: '65vw', sm: 300 },
              maxWidth: 300,
              height: { xs: '65vw', sm: 300 },
              maxHeight: 300,
              '@media (orientation: landscape)': {
                width: '55vh',
                height: '55vh',
                maxWidth: 250,
                maxHeight: 250,
              },
              borderRadius: '50%',
              border: '4px solid',
              borderColor: isLevel ? 'success.main' : 'divider',
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
              width: '15%',
              height: '15%',
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
                width: '20%',
                height: '20%',
                borderRadius: '50%',
                backgroundColor: 'rgba(0, 150, 255, 0.6)',
                border: '2px solid white',
                transform: 'translate(-50%, -50%)',
                boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
                transition: 'top 0.1s ease-out, left 0.1s ease-out',
              }}
            />
          </Box>

          {/* Readout Panels */}
          <Box sx={{
            display: 'flex',
            flexDirection: 'row',
            '@media (orientation: landscape)': { flexDirection: 'column' },
            justifyContent: 'space-around',
            textAlign: 'center',
            width: { xs: '100%', sm: 'auto' },
            gap: { xs: 0, sm: 3 },
            minWidth: '120px'
          }}>
            <Box sx={{ '@media (orientation: landscape)': { mb: 2 } }}>
              <Typography variant="caption" color="textSecondary" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 0.5 }}>
                <SwapHorizIcon sx={{ fontSize: 16, mr: 0.5 }} /> 左右のズレ
              </Typography>
              <Typography variant="h5" sx={{ fontFamily: 'monospace', minWidth: '94px', display: 'inline-block', textAlign: 'right' }}>
                {formatAngle(devX)}°
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="textSecondary" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 0.5 }}>
                <SwapVertIcon sx={{ fontSize: 16, mr: 0.5 }} /> 前後のズレ
              </Typography>
              <Typography variant="h5" sx={{ fontFamily: 'monospace', minWidth: '94px', display: 'inline-block', textAlign: 'right' }}>
                {formatAngle(devY)}°
              </Typography>
            </Box>
          </Box>
        </Box>
      )}
    </Container>
  );
}

export default App;
