/**
 * Audio Synthesis Library
 * Generates music from brain state
 */

export interface AudioConfig {
  volume: number;
  effects: boolean;
  reverb: boolean;
}

export class BrainMusicSynthesizer {
  private audioContext: AudioContext;
  private masterGain: GainNode;
  private compressor: DynamicsCompressorNode;
  private analyser: AnalyserNode;
  private activeOscillators: OscillatorNode[] = [];

  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Setup audio chain
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 0.3;
    
    this.compressor = this.audioContext.createDynamicsCompressor();
    this.compressor.threshold.value = -50;
    this.compressor.knee.value = 40;
    this.compressor.ratio.value = 12;
    
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    
    // Connect chain
    this.masterGain.connect(this.compressor);
    this.compressor.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);
  }

  /**
   * Generate music based on brain state
   */
  generateMusic(state: string, intensity: number) {
    this.clearOscillators();

    const generators: Record<string, () => void> = {
      focused: () => this.generateTechno(intensity),
      relaxed: () => this.generateAmbient(intensity),
      drowsy: () => this.generateDeepBass(intensity),
      meditative: () => this.generateEthereal(intensity),
      excited: () => this.generateExperimental(intensity)
    };

    const generator = generators[state] || generators.relaxed;
    generator();
  }

  private generateTechno(intensity: number) {
    const scale = [261.63, 293.66, 329.63, 392.00, 440.00];
    const note = scale[Math.floor(Math.random() * scale.length)];
    
    this.createNote(note, 'square', 0.1 * intensity, 0.1);
  }

  private generateAmbient(intensity: number) {
    const chord = [130.81, 164.81, 196.00, 246.94];
    
    chord.forEach((freq, i) => {
      setTimeout(() => {
        this.createNote(freq, 'sine', 0.05 * intensity, 2.0);
      }, i * 100);
    });
  }

  private generateDeepBass(intensity: number) {
    this.createNote(65.41, 'sine', 0.15 * intensity, 0.5);
  }

  private generateEthereal(intensity: number) {
    const notes = [261.63, 293.66, 329.63, 392.00];
    
    notes.forEach(freq => {
      this.createNote(freq, 'triangle', 0.08 * intensity, 1.0);
    });
  }

  private generateExperimental(intensity: number) {
    const notes = [523.25, 587.33, 659.25, 739.99];
    const note = notes[Math.floor(Math.random() * notes.length)];
    
    this.createNote(note, 'sawtooth', 0.12 * intensity, 0.05);
  }

  private createNote(
    frequency: number,
    type: OscillatorType,
    volume: number,
    duration: number
  ) {
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    
    osc.frequency.value = frequency;
    osc.type = type;
    gain.gain.value = volume;
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    const now = this.audioContext.currentTime;
    osc.start(now);
    osc.stop(now + duration);
    
    this.activeOscillators.push(osc);
    
    // Clean up
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
      const idx = this.activeOscillators.indexOf(osc);
      if (idx > -1) this.activeOscillators.splice(idx, 1);
    };
  }

  private clearOscillators() {
    this.activeOscillators.forEach(osc => {
      try {
        osc.stop();
        osc.disconnect();
      } catch (e) {}
    });
    this.activeOscillators = [];
  }

  getAnalyser() {
    return this.analyser;
  }

  getDestination() {
    return this.audioContext.createMediaStreamDestination();
  }

  suspend() {
    return this.audioContext.suspend();
  }

  resume() {
    return this.audioContext.resume();
  }

  close() {
    this.clearOscillators();
    return this.audioContext.close();
  }
}