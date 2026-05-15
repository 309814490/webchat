import { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';

interface VoicePlayerProps {
  audioUrl: string;
  duration?: number;
  isMe: boolean;
}

export default function VoicePlayer({ audioUrl, duration, isMe }: VoicePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const displayDuration = duration || audioRef.current?.duration || 0;

  return (
    <div className={`flex items-center gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
      <button
        onClick={togglePlay}
        className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center shrink-0"
      >
        {isPlaying ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4 ml-0.5" />
        )}
      </button>
      <div className="flex-1 min-w-[100px]">
        <div className="h-1 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-white/60 transition-all"
            style={{ width: `${displayDuration > 0 ? (currentTime / displayDuration) * 100 : 0}%` }}
          />
        </div>
        <p className="text-xs mt-1 opacity-80">
          {formatTime(currentTime)} / {formatTime(displayDuration)}
        </p>
      </div>
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
    </div>
  );
}
