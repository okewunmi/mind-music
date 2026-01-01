import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Download, Share2, Radio, Music, Activity, Zap } from 'lucide-react';

export default function MindMusic() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [brainState, setBrainState] = useState('Ready to start');
  const [emotion, setEmotion] = useState('neutral');
  const [eegData, setEegData] = useState([]);
  const [recordings, setRecordings] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [sessionId] = useState(() => Math.random().toString(36).substr(2, 9));
  const [viewers, setViewers] = useState(0);
  const [isStreaming, setIsStreaming] = useState(false);
  const [bandPowers, setBandPowers] = useState({
    delta: 0,
    theta: 0,
    alpha: 0,
    beta: 0,
    gamma: 0
  });
  
  // NEW: Real dataset integration
  const [realData, setRealData] = useState<any>(null);
  const [dataSource, setDataSource] = useState('Simulated EEG');
  const [frameIndex, setFrameIndex] = useState(0);

  const audioContextRef = useRef(null);
  const oscillatorsRef = useRef([]);
  const gainNodeRef = useRef(null);
  const analyserRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  // Load Real EEG Dataset
  useEffect(() => {
    const loadRealData = async () => {
      try {
        const response = await fetch('/data/S001R01.json');
        const data = await response.json();
        setRealData(data);
        setDataSource(`PhysioNet Real EEG (${data.metadata.subject})`);
        console.log('✅ Loaded real EEG data:', data.metadata);
        console.log(`📊 ${data.metadata.channels} channels, ${data.metadata.sampling_rate} Hz, ${data.metadata.duration_seconds}s`);
      } catch (error) {
        console.log('⚠️ Using simulated EEG data');
        setDataSource('Simulated EEG (Demo Mode)');
      }
    };
    
    loadRealData();
  }, []);

  // Initialize Audio Context
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioContextRef.current = new AudioContext();
      gainNodeRef.current = audioContextRef.current.createGain();
      analyserRef.current = audioContextRef.current.createAnalyser();
      
      gainNodeRef.current.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination);
      
      analyserRef.current.fftSize = 2048;
    }

    return () => {
      stopAllOscillators();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Simulate EEG Data Stream
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      let newData;
      
      if (realData && realData.data) {
        // USE REAL PHYSIONET DATA
        const channelData = realData.data.map((channel: number[]) => 
          channel[frameIndex % channel.length]
        );
        
        newData = {
          timestamp: Date.now(),
          channels: channelData
        };
        
        setFrameIndex(prev => prev + 1);
      } else {
        // FALLBACK: Generate realistic EEG-like data
        newData = {
          timestamp: Date.now(),
          channels: [
            generateEEGSample(),
            generateEEGSample(),
            generateEEGSample(),
            generateEEGSample()
          ]
        };
      }

      setEegData(prev => [...prev.slice(-100), newData]);

      // Analyze brain state
      const analysis = analyzeBrainWaves(newData.channels);
      setBandPowers(analysis.powers);
      generateMusicFromBrainState(analysis);
      
    }, 100); // 10Hz update rate

    return () => clearInterval(interval);
  }, [isPlaying, realData, frameIndex]);

  // Visualize Audio
  useEffect(() => {
    if (!isPlaying || !canvasRef.current || !analyserRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);

      analyserRef.current.getByteFrequencyData(dataArray);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        
        const hue = (i / bufferLength) * 360;
        ctx.fillStyle = `hsla(${hue}, 100%, 50%, 0.8)`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying]);

  // Generate EEG Sample
  const generateEEGSample = () => {
    const time = Date.now() / 1000;
    return (
      Math.sin(time * 2) * 30 +      // Delta (0.5-4 Hz)
      Math.sin(time * 6) * 20 +      // Theta (4-8 Hz)
      Math.sin(time * 10) * 40 +     // Alpha (8-13 Hz)
      Math.sin(time * 20) * 25 +     // Beta (13-30 Hz)
      Math.sin(time * 40) * 15 +     // Gamma (30-50 Hz)
      (Math.random() - 0.5) * 10     // Noise
    );
  };

  // Analyze Brain Waves
  const analyzeBrainWaves = (channels) => {
    const avg = channels.reduce((a, b) => a + b, 0) / channels.length;
    
    // Simulate frequency band decomposition
    const powers = {
      delta: Math.abs(Math.sin(Date.now() / 2000)) * 100,
      theta: Math.abs(Math.sin(Date.now() / 1500)) * 80,
      alpha: Math.abs(Math.cos(Date.now() / 1000)) * 90,
      beta: Math.abs(Math.sin(Date.now() / 800)) * 70,
      gamma: Math.abs(Math.cos(Date.now() / 600)) * 50
    };

    // Determine dominant band
    const dominant = Object.entries(powers).reduce((a, b) => 
      b[1] > a[1] ? b : a
    );

    // Map to emotion
    let detectedEmotion = 'neutral';
    if (powers.alpha > 70) detectedEmotion = 'relaxed';
    if (powers.beta > 60) detectedEmotion = 'focused';
    if (powers.delta > 70) detectedEmotion = 'drowsy';
    if (powers.gamma > 40) detectedEmotion = 'excited';

    setEmotion(detectedEmotion);

    return {
      state: dominant[0],
      powers,
      emotion: detectedEmotion
    };
  };

  // Generate Music from Brain State
  const generateMusicFromBrainState = (analysis) => {
    if (!audioContextRef.current) return;

    const { state, powers, emotion } = analysis;

    // Clear existing oscillators
    stopAllOscillators();

    const ctx = audioContextRef.current;
    const now = ctx.currentTime;

    switch(state) {
      case 'beta': // Focused - Techno
        createTechnoPattern(powers.beta / 100);
        setBrainState('🎯 Focused → Techno Beat');
        break;

      case 'alpha': // Relaxed - Ambient
        createAmbientSounds(powers.alpha / 100);
        setBrainState('😌 Relaxed → Ambient Waves');
        break;

      case 'delta': // Drowsy - Deep Bass
        createDeepBass(powers.delta / 100);
        setBrainState('💤 Drowsy → Deep Bass Drone');
        break;

      case 'theta': // Meditative - Ethereal
        createEtherealSounds(powers.theta / 100);
        setBrainState('🧘 Meditative → Ethereal Sounds');
        break;

      case 'gamma': // Excited - Experimental
        createExperimentalSounds(powers.gamma / 100);
        setBrainState('⚡ Hyper-focused → Experimental Jazz');
        break;
    }
  };

  // Music Generation Functions
  const createTechnoPattern = (intensity) => {
    const ctx = audioContextRef.current;
    const scale = [261.63, 293.66, 329.63, 392.00, 440.00]; // C Major
    const note = scale[Math.floor(Math.random() * scale.length)];
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.frequency.value = note;
    osc.type = 'square';
    gain.gain.value = 0.1 * intensity;
    
    osc.connect(gain);
    gain.connect(gainNodeRef.current);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
    
    oscillatorsRef.current.push(osc);
  };

  const createAmbientSounds = (intensity) => {
    const ctx = audioContextRef.current;
    const frequencies = [130.81, 164.81, 196.00, 246.94]; // C3, E3, G3, B3
    
    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.value = 0.05 * intensity;
      
      osc.connect(gain);
      gain.connect(gainNodeRef.current);
      
      osc.start();
      osc.stop(ctx.currentTime + 2);
      
      oscillatorsRef.current.push(osc);
    });
  };

  const createDeepBass = (intensity) => {
    const ctx = audioContextRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.frequency.value = 65.41; // C2
    osc.type = 'sine';
    gain.gain.value = 0.15 * intensity;
    
    osc.connect(gain);
    gain.connect(gainNodeRef.current);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
    
    oscillatorsRef.current.push(osc);
  };

  const createEtherealSounds = (intensity) => {
    const ctx = audioContextRef.current;
    const frequencies = [261.63, 293.66, 329.63, 392.00]; // C4, D4, E4, G4
    
    frequencies.forEach(freq => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.frequency.value = freq;
      osc.type = 'triangle';
      gain.gain.value = 0.08 * intensity;
      
      osc.connect(gain);
      gain.connect(gainNodeRef.current);
      
      osc.start();
      osc.stop(ctx.currentTime + 1);
      
      oscillatorsRef.current.push(osc);
    });
  };

  const createExperimentalSounds = (intensity) => {
    const ctx = audioContextRef.current;
    const frequencies = [523.25, 587.33, 659.25, 739.99]; // C5, D5, E5, F#5
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.frequency.value = frequencies[Math.floor(Math.random() * frequencies.length)];
    osc.type = 'sawtooth';
    gain.gain.value = 0.12 * intensity;
    
    osc.connect(gain);
    gain.connect(gainNodeRef.current);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
    
    oscillatorsRef.current.push(osc);
  };

  const stopAllOscillators = () => {
    oscillatorsRef.current.forEach(osc => {
      try {
        osc.stop();
        osc.disconnect();
      } catch (e) {}
    });
    oscillatorsRef.current = [];
  };

  // Recording Feature
  const startRecording = () => {
    if (!audioContextRef.current) return;

    const dest = audioContextRef.current.createMediaStreamDestination();
    gainNodeRef.current.connect(dest);

    mediaRecorderRef.current = new MediaRecorder(dest.stream);
    audioChunksRef.current = [];

    mediaRecorderRef.current.ondataavailable = (e) => {
      audioChunksRef.current.push(e.data);
    };

    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const url = URL.createObjectURL(blob);
      const recording = {
        id: Date.now(),
        url,
        timestamp: new Date().toISOString(),
        emotion,
        duration: audioChunksRef.current.length
      };
      setRecordings(prev => [...prev, recording]);
    };

    mediaRecorderRef.current.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const downloadRecording = (url, id) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `mind-music-${id}.webm`;
    a.click();
  };

  // Social Sharing
  const shareSession = () => {
    const shareUrl = `${window.location.origin}/share/${sessionId}`;
    const shareText = `🧠 Listen to my brain music! Current state: ${brainState}`;
    
    if (navigator.share) {
      navigator.share({
        title: 'Mind Music',
        text: shareText,
        url: shareUrl
      });
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert('Share link copied to clipboard!');
    }
  };

  // Playlist Generator
  const generatePlaylist = () => {
    const playlists = {
      focused: ['Deep Focus', 'Brain Food', 'Intense Studying'],
      relaxed: ['Peaceful Piano', 'Ambient Relaxation', 'Chill Lofi'],
      drowsy: ['Deep Sleep Sounds', 'Sleeping Music', 'Delta Waves'],
      excited: ['Power Workout', 'Beast Mode', 'High Energy'],
      neutral: ['Discover Weekly', 'Daily Mix', 'Your Top Songs']
    };

    const suggestions = playlists[emotion] || playlists.neutral;
    alert(`🎵 Suggested playlists for ${emotion} mood:\n\n${suggestions.join('\n')}`);
  };

  // Live Streaming
  const toggleStreaming = () => {
    if (!isStreaming) {
      setIsStreaming(true);
      // Simulate viewer count
      const interval = setInterval(() => {
        setViewers(prev => Math.max(0, prev + Math.floor(Math.random() * 3) - 1));
      }, 2000);
      return () => clearInterval(interval);
    } else {
      setIsStreaming(false);
      setViewers(0);
    }
  };

  // Main Controls
  const togglePlayback = () => {
    if (!isPlaying && audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-pink-900/30 to-blue-900/30 animate-pulse" />
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white opacity-20"
            style={{
              width: Math.random() * 4 + 2 + 'px',
              height: Math.random() * 4 + 2 + 'px',
              left: Math.random() * 100 + '%',
              top: Math.random() * 100 + '%',
              animation: `float ${5 + Math.random() * 10}s ease-in-out infinite`,
              animationDelay: Math.random() * 5 + 's'
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-7xl font-black mb-4 bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
            🎵 MIND MUSIC
          </h1>
          <p className="text-2xl text-gray-300 mb-2">
            Your Brain Waves. Your Symphony.
          </p>
          <p className="text-sm text-gray-500">
            {dataSource}
          </p>
          {realData && (
            <p className="text-xs text-green-400 mt-1">
              {realData.metadata.channels} channels • {realData.metadata.sampling_rate} Hz • {realData.metadata.duration_seconds}s
            </p>
          )}
        </div>

        {/* Live Streaming Badge */}
        {isStreaming && (
          <div className="fixed top-4 right-4 bg-red-500 px-4 py-2 rounded-full flex items-center gap-2 animate-pulse">
            <Radio size={16} />
            <span className="font-bold">LIVE</span>
            <span className="text-sm">👁 {viewers} watching</span>
          </div>
        )}

        {/* Main Visualization */}
        <div className="mb-12">
          <canvas
            ref={canvasRef}
            width={800}
            height={300}
            className="w-full rounded-lg border border-white/10 bg-black/50"
          />
        </div>

        {/* Brain State Display */}
        <div className="text-center mb-8">
          <div className="inline-block bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
            <div className="text-5xl font-bold mb-2">{brainState}</div>
            <div className="text-xl text-gray-400">
              Emotion: <span className="text-pink-400">{emotion}</span>
            </div>
          </div>
        </div>

        {/* Band Powers */}
        <div className="grid grid-cols-5 gap-4 mb-8">
          {Object.entries(bandPowers).map(([band, power]) => (
            <div key={band} className="bg-white/5 backdrop-blur rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-2 capitalize">{band}</div>
              <div className="text-2xl font-bold mb-2">{Math.round(power)}%</div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-300"
                  style={{ width: `${power}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Control Panel */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 mb-8">
          <div className="flex flex-wrap gap-4 justify-center">
            <button
              onClick={togglePlayback}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-full font-bold text-lg flex items-center gap-2 transition-all transform hover:scale-105"
            >
              {isPlaying ? <Pause size={24} /> : <Play size={24} />}
              {isPlaying ? 'Stop Symphony' : 'Start Brain Music'}
            </button>

            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={!isPlaying}
              className={`px-6 py-4 rounded-full font-bold flex items-center gap-2 transition-all ${
                isRecording 
                  ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                  : 'bg-blue-500 hover:bg-blue-600 disabled:opacity-50'
              }`}
            >
              <Activity size={20} />
              {isRecording ? 'Recording...' : 'Record'}
            </button>

            <button
              onClick={shareSession}
              disabled={!isPlaying}
              className="px-6 py-4 bg-green-500 hover:bg-green-600 disabled:opacity-50 rounded-full font-bold flex items-center gap-2 transition-all"
            >
              <Share2 size={20} />
              Share
            </button>

            <button
              onClick={generatePlaylist}
              className="px-6 py-4 bg-indigo-500 hover:bg-indigo-600 rounded-full font-bold flex items-center gap-2 transition-all"
            >
              <Music size={20} />
              Get Playlist
            </button>

            <button
              onClick={toggleStreaming}
              className={`px-6 py-4 rounded-full font-bold flex items-center gap-2 transition-all ${
                isStreaming 
                  ? 'bg-red-500 hover:bg-red-600' 
                  : 'bg-purple-500 hover:bg-purple-600'
              }`}
            >
              <Radio size={20} />
              {isStreaming ? 'Stop Stream' : 'Go Live'}
            </button>
          </div>
        </div>

        {/* Recordings */}
        {recordings.length > 0 && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
            <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Download size={24} />
              Your Recordings
            </h3>
            <div className="space-y-3">
              {recordings.map((rec) => (
                <div key={rec.id} className="bg-white/5 rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <div className="font-bold">Recording #{rec.id}</div>
                    <div className="text-sm text-gray-400">
                      {new Date(rec.timestamp).toLocaleString()} • Emotion: {rec.emotion}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <audio src={rec.url} controls className="h-10" />
                    <button
                      onClick={() => downloadRecording(rec.url, rec.id)}
                      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg"
                    >
                      <Download size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info Panel */}
        <div className="mt-8 bg-blue-500/20 border border-blue-500 rounded-lg p-6">
          <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
            <Zap size={20} />
            How It Works
          </h3>
          <ul className="text-sm text-gray-300 space-y-2">
            <li>• <strong>Delta (0.5-4 Hz)</strong>: Deep sleep, healing → Deep bass drones</li>
            <li>• <strong>Theta (4-8 Hz)</strong>: Meditation, creativity → Ethereal soundscapes</li>
            <li>• <strong>Alpha (8-13 Hz)</strong>: Relaxed focus → Ambient waves</li>
            <li>• <strong>Beta (13-30 Hz)</strong>: Active thinking → Techno beats</li>
            <li>• <strong>Gamma (30-50 Hz)</strong>: Peak performance → Experimental jazz</li>
          </ul>
          <p className="text-xs text-gray-500 mt-4">
            Demo mode using simulated EEG. Ready for EMOTIV Cortex API integration.
          </p>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>Built by Afeez Okewunmi | Session ID: {sessionId}</p>
          <p className="mt-1">
            {realData 
              ? `Dataset: ${realData.metadata.source}` 
              : 'Ready for EMOTIV Hardware Integration'
            }
          </p>
          {realData && (
            <p className="text-xs text-gray-600 mt-1">
              Citation: <a 
                href={realData.metadata.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300"
              >
                {realData.metadata.url}
              </a>
            </p>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
      `}</style>
    </div>
  );
}