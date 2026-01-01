'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function SharedSession() {
  const params = useParams();
  const [sessionData, setSessionData] = useState<any>(null);

  useEffect(() => {
    // Fetch shared session data
    const loadSession = async () => {
      try {
        const data = await window.Storage?.get(`session:${params.id}`);
        if (data) {
          setSessionData(JSON.parse(data.value));
        }
      } catch (error) {
        console.error('Failed to load session:', error);
      }
    };
    
    loadSession();
  }, [params.id]);

  if (!sessionData) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Loading Session...</h1>
          <p className="text-gray-400">Session ID: {params.id}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-5xl font-bold mb-8 text-center bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          🎵 Shared Mind Music Session
        </h1>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 mb-8">
          <h2 className="text-2xl font-bold mb-4">Session Info</h2>
          <div className="space-y-2 text-gray-300">
            <p><strong>Session ID:</strong> {params.id}</p>
            <p><strong>Brain State:</strong> {sessionData.brainState}</p>
            <p><strong>Emotion:</strong> {sessionData.emotion}</p>
            <p><strong>Timestamp:</strong> {new Date(sessionData.timestamp).toLocaleString()}</p>
          </div>
        </div>

        {sessionData.recording && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8">
            <h2 className="text-2xl font-bold mb-4">Recording</h2>
            <audio src={sessionData.recording} controls className="w-full" />
          </div>
        )}

        <div className="text-center mt-8">
          <a
            href="/"
            className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-full font-bold inline-block"
          >
            Create Your Own Brain Music →
          </a>
        </div>
      </div>
    </div>
  );
}