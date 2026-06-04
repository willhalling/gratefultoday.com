import React from 'react';
import { AbsoluteFill } from 'remotion';
import { DARKEN_OVERLAY_ALPHA } from '../constants';

export const DarkenLayer: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: `rgba(0, 0, 0, ${DARKEN_OVERLAY_ALPHA})`,
      }}
    />
  );
};
