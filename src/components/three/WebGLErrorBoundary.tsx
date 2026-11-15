"use client";

import React from "react";

interface WebGLErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface WebGLErrorBoundaryState {
  hasError: boolean;
}

/**
 * React ErrorBoundary isolating 3D WebGL canvases so GPU/context failures
 * gracefully degrade to the 2D SVG studio fallback without crashing the UI.
 */
export class WebGLErrorBoundary extends React.Component<
  WebGLErrorBoundaryProps,
  WebGLErrorBoundaryState
> {
  constructor(props: WebGLErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): WebGLErrorBoundaryState {
    return { hasError: true };
  }

  override render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }
    return this.props.children;
  }
}
