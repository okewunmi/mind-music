/**
 * EEG Signal Processing Library
 * Implements standard signal processing for BCI applications
 */

export interface EEGSample {
  timestamp: number;
  channels: number[];
}

export interface BandPowers {
  delta: number;  // 0.5-4 Hz
  theta: number;  // 4-8 Hz
  alpha: number;  // 8-13 Hz
  beta: number;   // 13-30 Hz
  gamma: number;  // 30-50 Hz
}

export class EEGProcessor {
  private samplingRate: number;
  private windowSize: number;

  constructor(samplingRate: number = 256, windowSize: number = 256) {
    this.samplingRate = samplingRate;
    this.windowSize = windowSize;
  }

  /**
   * Calculate power spectral density using Welch's method
   */
  calculatePSD(signal: number[]): number[] {
    const fft = this.fft(signal);
    return fft.map(c => c.real * c.real + c.imag * c.imag);
  }

  /**
   * Extract frequency band powers
   */
  extractBandPowers(signal: number[]): BandPowers {
    const psd = this.calculatePSD(signal);
    const freqResolution = this.samplingRate / signal.length;

    const getBandPower = (lowHz: number, highHz: number): number => {
      const lowIdx = Math.floor(lowHz / freqResolution);
      const highIdx = Math.floor(highHz / freqResolution);
      const bandPower = psd.slice(lowIdx, highIdx).reduce((a, b) => a + b, 0);
      return bandPower / (highIdx - lowIdx);
    };

    return {
      delta: getBandPower(0.5, 4),
      theta: getBandPower(4, 8),
      alpha: getBandPower(8, 13),
      beta: getBandPower(13, 30),
      gamma: getBandPower(30, 50)
    };
  }

  /**
   * Apply bandpass filter
   */
  bandpassFilter(signal: number[], lowHz: number, highHz: number): number[] {
    // Simplified butterworth filter implementation
    const nyquist = this.samplingRate / 2;
    const low = lowHz / nyquist;
    const high = highHz / nyquist;

    // Apply simple moving average as demonstration
    const filtered: number[] = [];
    const windowSize = 5;

    for (let i = 0; i < signal.length; i++) {
      let sum = 0;
      let count = 0;
      for (let j = -windowSize; j <= windowSize; j++) {
        const idx = i + j;
        if (idx >= 0 && idx < signal.length) {
          sum += signal[idx];
          count++;
        }
      }
      filtered.push(sum / count);
    }

    return filtered;
  }

  /**
   * Simple FFT implementation (Cooley-Tukey algorithm)
   */
  private fft(signal: number[]): Complex[] {
    const n = signal.length;
    if (n === 1) return [{ real: signal[0], imag: 0 }];

    const even = this.fft(signal.filter((_, i) => i % 2 === 0));
    const odd = this.fft(signal.filter((_, i) => i % 2 === 1));

    const result: Complex[] = new Array(n);
    for (let k = 0; k < n / 2; k++) {
      const t = this.complexExp(-2 * Math.PI * k / n);
      const oddScaled = this.complexMul(t, odd[k]);
      
      result[k] = this.complexAdd(even[k], oddScaled);
      result[k + n / 2] = this.complexSub(even[k], oddScaled);
    }

    return result;
  }

  private complexExp(angle: number): Complex {
    return { real: Math.cos(angle), imag: Math.sin(angle) };
  }

  private complexMul(a: Complex, b: Complex): Complex {
    return {
      real: a.real * b.real - a.imag * b.imag,
      imag: a.real * b.imag + a.imag * b.real
    };
  }

  private complexAdd(a: Complex, b: Complex): Complex {
    return { real: a.real + b.real, imag: a.imag + b.imag };
  }

  private complexSub(a: Complex, b: Complex): Complex {
    return { real: a.real - b.real, imag: a.imag - b.imag };
  }
}

interface Complex {
  real: number;
  imag: number;
}

/**
 * Normalize band powers to 0-100 scale
 */
export function normalizeBandPowers(powers: BandPowers): BandPowers {
  const total = Object.values(powers).reduce((a, b) => a + b, 0);
  
  return {
    delta: (powers.delta / total) * 100,
    theta: (powers.theta / total) * 100,
    alpha: (powers.alpha / total) * 100,
    beta: (powers.beta / total) * 100,
    gamma: (powers.gamma / total) * 100
  };
}

/**
 * Classify mental state from band powers
 */
export function classifyMentalState(powers: BandPowers): {
  state: string;
  emotion: string;
  confidence: number;
} {
  const dominant = Object.entries(powers).reduce((a, b) => 
    b[1] > a[1] ? b : a
  );

  const stateMap: Record<string, { state: string; emotion: string }> = {
    delta: { state: 'drowsy', emotion: 'sleepy' },
    theta: { state: 'meditative', emotion: 'calm' },
    alpha: { state: 'relaxed', emotion: 'peaceful' },
    beta: { state: 'focused', emotion: 'alert' },
    gamma: { state: 'excited', emotion: 'energized' }
  };

  const classification = stateMap[dominant[0]] || stateMap.alpha;
  const confidence = (dominant[1] / 100) * 100;

  return {
    ...classification,
    confidence
  };
}