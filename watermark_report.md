# Anti-Piracy Dynamic Watermark Report
**Component**: `src/renderer/App.tsx`

## Overview
To discourage and trace manual recordings (such as using external cameras or phone recordings), the player overlays a dynamic, low-opacity watermark containing the student's identity details directly on top of the playing video.

## Watermark Contents
The watermark is rendered as a CSS absolute layout containing:
- **Student Name**: Full name of the authenticated user.
- **Student Email**: Email address linked to the active license.
- **Device ID**: First 16 characters of the hardware fingerprint hash.
- **Current Timestamp**: Date formatted for the locale.

## Coordinate Randomization
- **Interval**: Coordinates are randomized every **7 seconds**.
- **Boundaries**: Positions are bounded between `10%` and `80%` (both top and left offsets) to prevent the watermark from clipping outside the visible viewport.
- **Styling**: Rendered in a semi-transparent white color (`text-white/10`) with a text-shadow (`1px 1px 1px rgba(0,0,0,0.5)`) to maintain visibility on both light and dark video frames.
- **Transitions**: Smooth transitions (`top 1s ease, left 1s ease`) animate the movement to avoid user distraction while maintaining persistent deterrence.
