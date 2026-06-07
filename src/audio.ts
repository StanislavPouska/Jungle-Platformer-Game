/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class AudioSynthEngine {
  private ctx: AudioContext | null = null;
  private sfxVol: number = 0.5;
  private musicVol: number = 0.25;
  private drumOsc: OscillatorNode | null = null;
  private synthInterval: any = null;
  private isMusicPlaying: boolean = false;

  private initContext() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setVolumes(sfx: number, music: number) {
    this.sfxVol = sfx;
    this.musicVol = music;
  }

  // Play a simple 8-bit retro jump sound
  public playJump() {
    try {
      this.initContext();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(150, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(380, this.ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(this.sfxVol * 0.4, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.16);
    } catch (e) {
      console.warn('Audio play failed', e);
    }
  }

  // Play a powerful rubbery "Boing" when stepping on a springy toad
  public playToadBoing() {
    try {
      this.initContext();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const oscMod = this.ctx.createOscillator();
      const modGain = this.ctx.createGain();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      oscMod.type = 'sine';

      oscMod.frequency.value = 45; // Slow LFO modulation
      modGain.gain.value = 120;   // Power of sweep

      osc.frequency.setValueAtTime(80, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, this.ctx.currentTime + 0.3);

      oscMod.connect(modGain);
      modGain.connect(osc.frequency);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);

      gain.gain.setValueAtTime(this.sfxVol * 0.5, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);

      oscMod.start();
      osc.start();

      oscMod.stop(this.ctx.currentTime + 0.31);
      osc.stop(this.ctx.currentTime + 0.31);
    } catch (e) {
      console.warn('Toad sound failed', e);
    }
  }

  // Sparkling banana collection chime
  public playBananaChime() {
    try {
      this.initContext();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.type = 'sine';
      // Retro dual-tone
      osc.frequency.setValueAtTime(523.25, this.ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, this.ctx.currentTime + 0.08); // E5
      osc.frequency.exponentialRampToValueAtTime(1046.50, this.ctx.currentTime + 0.2); // C6

      gain.gain.setValueAtTime(this.sfxVol * 0.3, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.26);
    } catch (e) {
      console.warn('Banana sound failed', e);
    }
  }

  // Deep rumble and frequency dropdown for death/damage
  public playDeathSound() {
    try {
      this.initContext();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const noise = this.ctx.createOscillator(); // Or a custom square wave Sweep
      const gain = this.ctx.createGain();

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.type = 'square';
      osc.frequency.setValueAtTime(220, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.45);

      gain.gain.setValueAtTime(this.sfxVol * 0.5, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.51);
    } catch (e) {
      console.warn('Death sound failed', e);
    }
  }

  // Pentatonic retro level complete fanfare
  public playLevelSuccess() {
    try {
      this.initContext();
      if (!this.ctx) return;

      const notes = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25]; // C D E G A C
      const now = this.ctx.currentTime;

      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.type = 'triangle';
        osc.frequency.value = freq;

        const noteStart = now + idx * 0.1;
        gain.gain.setValueAtTime(0, now);
        gain.gain.setValueAtTime(this.sfxVol * 0.35, noteStart);
        gain.gain.exponentialRampToValueAtTime(0.01, noteStart + 0.25);

        osc.start(noteStart);
        osc.stop(noteStart + 0.3);
      });
    } catch (e) {
      console.warn('Success sound failed', e);
    }
  }

  // Custom rhythmic tribal jungle music loops using standard synthesizers
  public startJungleMusic() {
    if (this.isMusicPlaying) return;
    this.isMusicPlaying = true;
    this.initContext();

    let beatCount = 0;
    const playTick = () => {
      if (!this.isMusicPlaying || !this.ctx) return;
      
      const now = this.ctx.currentTime;

      try {
        // Tribal Bass Kick on 1 and 3
        if (beatCount % 4 === 0 || beatCount % 4 === 2) {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          
          osc.type = 'sine';
          osc.frequency.setValueAtTime(55, now);
          osc.frequency.exponentialRampToValueAtTime(10, now + 0.2);
          
          gain.gain.setValueAtTime(this.musicVol * 0.8, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
          
          osc.start(now);
          osc.stop(now + 0.22);
        }

        // Shaker/Rustle on every other eighth note
        if (beatCount % 2 === 1) {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(1000, now);
          
          gain.gain.setValueAtTime(this.musicVol * 0.1, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
          
          osc.start(now);
          osc.stop(now + 0.06);
        }

        // Jungle melody note (rhythmic tropical vibe)
        if (beatCount % 4 === 0 || beatCount % 8 === 3 || beatCount % 8 === 5) {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          
          osc.type = 'sine';
          // Warm woodblock/whistle tones
          const scale = [174.61, 196.00, 220.00, 261.63, 293.66, 349.23]; // F G A C D F
          const randNote = scale[(beatCount + Math.floor(Math.random() * 2)) % scale.length];
          
          osc.frequency.setValueAtTime(randNote * 2, now);
          
          gain.gain.setValueAtTime(this.musicVol * 0.15, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
          
          osc.start(now);
          osc.stop(now + 0.27);
        }

        beatCount = (beatCount + 1) % 16;
      } catch (err) {
        console.warn('Music tick error', err);
      }
      
      this.synthInterval = setTimeout(playTick, 200); // 120 BPM eight-notes
    };

    playTick();
  }

  public stopJungleMusic() {
    this.isMusicPlaying = false;
    if (this.synthInterval) {
      clearTimeout(this.synthInterval);
      this.synthInterval = null;
    }
  }
}

export const audioSynth = new AudioSynthEngine();
