import React, { useState, useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';

export default function VoiceAssistant({ onVoiceCommand }) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [recognition, setRecognition] = useState(null);

  useEffect(() => {
    // Check for browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false; // Stop after one phrase
      rec.interimResults = true;
      rec.lang = 'es-ES'; // Spanish locale

      rec.onresult = (event) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
        
        if (event.results[0].isFinal) {
           // Wait a second so the user can read the final text
           setTimeout(() => {
             onVoiceCommand(currentTranscript);
             setTranscript('');
             setIsListening(false);
           }, 800);
        }
      };

      rec.onerror = (event) => {
        console.error("Error en reconocimiento de voz:", event.error);
        setIsListening(false);
        setTranscript('Error de micrófono');
        setTimeout(() => setTranscript(''), 2000);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      setRecognition(rec);
    }
  }, [onVoiceCommand]);

  const toggleListening = () => {
    if (isListening) {
      recognition?.stop();
    } else {
      setTranscript('');
      try {
        recognition?.start();
        setIsListening(true);
      } catch (err) {
        console.error(err);
      }
    }
  };

  if (!recognition) return null; // Browser doesn't support Speech API

  return (
    <>
      <div 
        onClick={toggleListening}
        title="Asistente de Voz Táctico"
        style={{
          position: 'fixed',
          bottom: '80px', // Above bottom navigation
          right: '20px',
          width: '56px',
          height: '56px',
          borderRadius: '28px',
          backgroundColor: isListening ? 'var(--color-error)' : 'var(--color-primary)',
          color: '#fff',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          boxShadow: isListening ? '0 0 15px var(--color-error)' : '0 4px 10px rgba(0,0,0,0.3)',
          cursor: 'pointer',
          zIndex: 1000,
          transition: 'all 0.3s ease'
        }}
      >
        {isListening ? <MicOff size={28} /> : <Mic size={28} />}
      </div>
      
      {transcript && (
        <div style={{
          position: 'fixed',
          bottom: '150px',
          right: '20px',
          background: 'rgba(0,0,0,0.85)',
          padding: '12px 16px',
          borderRadius: '12px',
          color: '#fff',
          maxWidth: '280px',
          zIndex: 1000,
          backdropFilter: 'blur(10px)',
          border: '1px solid var(--color-primary)',
          fontSize: '0.9rem',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          pointerEvents: 'none'
        }}>
          <em>"{transcript}"</em>
        </div>
      )}
    </>
  );
}
