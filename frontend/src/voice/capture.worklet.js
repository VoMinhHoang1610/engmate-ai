/* global AudioWorkletProcessor, registerProcessor, sampleRate */
// Produce 100 ms PCM16 chunks at 16 kHz, independent of device sample rate.
class PcmCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.ratio = sampleRate / 16000;
    this.phase = 0;
    this.sum = 0;
    this.count = 0;
    this.buffer = new Int16Array(1600);
    this.index = 0;
    this.port.onmessage = () => {
      this.phase = this.sum = this.count = this.index = 0;
    };
  }
  process(inputs) {
    const samples = inputs[0]?.[0];
    if (!samples) return true;
    for (const sample of samples) {
      this.sum += sample;
      this.count++;
      this.phase++;
      if (this.phase >= this.ratio) {
        const value = Math.max(-1, Math.min(1, this.sum / this.count));
        this.buffer[this.index++] = Math.round(value * (value < 0 ? 32768 : 32767));
        this.phase -= this.ratio;
        this.sum = this.count = 0;
        if (this.index === this.buffer.length) {
          this.port.postMessage(this.buffer.buffer, [this.buffer.buffer]);
          this.buffer = new Int16Array(1600);
          this.index = 0;
        }
      }
    }
    return true;
  }
}
registerProcessor('engmate-pcm', PcmCapture);
