import React, { memo, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

interface ElapsedTimerProps {
  running: boolean;
  color: string;
  fontSize: number;
  /** 每次秒数变化时回调，父组件借此记录总时长而不参与每秒重渲染 */
  onElapsed: (seconds: number) => void;
}

function formatClock(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

const ElapsedTimer: React.FC<ElapsedTimerProps> = ({ running, color, fontSize, onElapsed }) => {
  const [seconds, setSeconds] = useState(0);
  const onElapsedRef = useRef(onElapsed);

  useEffect(() => {
    onElapsedRef.current = onElapsed;
  }, [onElapsed]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSeconds((prev) => prev + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    onElapsedRef.current(seconds);
  }, [seconds]);

  return <Text style={[styles.text, { color, fontSize }]}>{formatClock(seconds)}</Text>;
};

const styles = StyleSheet.create({
  text: {
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});

export default memo(ElapsedTimer);
