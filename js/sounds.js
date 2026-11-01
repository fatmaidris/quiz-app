class SoundManager {
  constructor() {
    this.audioContext = null;
    this.enabled = true;
  }

  init() {
    try {
      if (!this.audioContext) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          this.audioContext = new AudioContextClass();
        }
      }

      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }
    } catch {}
  }

  playTone(frequency, duration, type = 'sine', volume = 0.25) {
    if (!this.enabled) return;

    try {
      this.init();
      if (!this.audioContext) return;

      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);

      gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, this.audioContext.currentTime + duration);

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + duration);
    } catch {}
  }

  playCorrect() {
    this.playTone(523.25, 0.12, 'sine', 0.25);
    setTimeout(() => this.playTone(659.25, 0.12, 'sine', 0.25), 100);
    setTimeout(() => this.playTone(783.99, 0.2, 'sine', 0.25), 200);
  }

  playWrong() {
    this.playTone(180, 0.3, 'sawtooth', 0.2);
  }

  playWarning() {
    this.playTone(600, 0.08, 'square', 0.12);
  }

  playTimeUp() {
    this.playTone(280, 0.2, 'sawtooth', 0.25);
    setTimeout(() => this.playTone(180, 0.3, 'sawtooth', 0.25), 180);
  }

  playComplete() {
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, 0.2, 'sine', 0.25), idx * 140);
    });
  }
}

export const soundManager = new SoundManager();
