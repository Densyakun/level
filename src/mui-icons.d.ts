/* eslint-disable @typescript-eslint/no-explicit-any */
declare module '@mui/icons-material/*' {
  import { SvgIconProps } from '@mui/material/SvgIcon';
  import { ComponentType } from 'react';
  const icon: ComponentType<SvgIconProps>;
  export default icon;
}
