'use strict';

function mayPlayHidden(settings) { return settings.backgroundAudio === true && settings.speechEngine !== 'system'; }

class BackgroundAudioControls {
  constructor(plugin, media = globalThis.navigator?.mediaSession, Metadata = globalThis.MediaMetadata) {
    this.plugin = plugin; this.media = media; this.Metadata = Metadata; this.actions = [];
  }
  update() {
    const p = this.plugin, media = this.media;
    const active = p.queue?.items?.length && !['complete', 'error'].includes(p.queue.status);
    if (!media || !mayPlayHidden(p.settings) || !active) { this.dispose(); return; }
    if (!this.attached) {
      this.attached = true;
      if (this.Metadata) {
        this.metadata = new this.Metadata({ title: 'Cozy Read Aloud', artist: '', album: '' });
        media.metadata = this.metadata;
      }
      const handlers = {
        play: () => p.resumeReading(), pause: () => p.pauseReading(), stop: () => p.stopReading(),
        previoustrack: () => p.moveChunk(-1), nexttrack: () => p.moveChunk(1),
        seekbackward: data => p.seekAudioBy(-Math.max(1, Math.min(60, Number(data?.seekOffset) || 5))),
        seekforward: data => p.seekAudioBy(Math.max(1, Math.min(60, Number(data?.seekOffset) || 5))),
        seekto: data => { if (Number.isFinite(data?.seekTime)) p.seekAudioTo(data.seekTime); },
      };
      for (const [name, handler] of Object.entries(handlers)) {
        try { media.setActionHandler(name, handler); this.actions.push(name); } catch {}
      }
    }
    try {
      media.playbackState = p.pauseRequested ? 'paused' : 'playing';
      const audio = p.activeAudio;
      if (Number.isFinite(audio?.duration) && audio.duration > 0 && Number.isFinite(audio.currentTime)) {
        media.setPositionState?.({ duration: audio.duration, position: Math.max(0, Math.min(audio.duration, audio.currentTime)), playbackRate: audio.playbackRate || 1 });
      } else media.setPositionState?.();
    } catch {}
  }
  dispose() {
    if (!this.attached) return;
    // Do not clear another player's metadata after ownership has moved.
    if (!this.metadata || this.media.metadata === this.metadata) {
      for (const name of this.actions) { try { this.media.setActionHandler(name, null); } catch {} }
      try { this.media.metadata = null; this.media.playbackState = 'none'; this.media.setPositionState?.(); } catch {}
    }
    this.actions = []; this.attached = false;
  }
}
module.exports = { BackgroundAudioControls, mayPlayHidden };
