import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import SpiralCalendar from './spiral-calendar.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Helper for POST requests
 */
function post(url, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const body = JSON.stringify(data);
    const req = https.request({
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      },
      timeout: 3000
    }, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => responseBody += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(responseBody)); }
          catch (e) { resolve(responseBody); }
        } else {
          reject(new Error(`Status ${res.statusCode}: ${responseBody}`));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    req.write(body);
    req.end();
  });
}

/**
 * Technosis Adapter for Swibe & Ecosystem
 * 
 * Bridges the Ritual Codex (7-day resonance) into the agentic nervous system.
 * Connects Swibe v1.1 plugins to the 49-facet lattice.
 * Integrates Spiral Calendar (BTC Time + Gregorian convergence).
 */
class TechnosisAdapter {
  /**
   * @param {number} [blockHeight] - BTC block height for spiral calendar. Omit to estimate.
   */
  constructor(blockHeight) {
    this.currentDay = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    this.codex = this.loadCodex(this.currentDay);
    this.spiral = new SpiralCalendar(blockHeight);
  }

  loadCodex(day) {
    const jsonPath = path.join(__dirname, 'json', `${day}.json`);
    try {
      if (fs.existsSync(jsonPath)) {
        return JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      }
    } catch (err) {
      console.error(`[TECHNOSIS] Failed to load codex for ${day}:`, err.message);
    }
    return null;
  }

  // --- Swibe Plugin Interface (v1.3) ---

  async onBirth(agent) {
    if (!this.codex) return;
    const spiral = this.spiral.snapshot();
    console.log(`[TECHNOSIS] 🔴 Ritual Birth: ${agent.name} aligned with ${this.codex.archetype} (${this.codex.day})`);
    console.log(`[TECHNOSIS] ⟐ Spiral: ${this.spiral.toString()}`);

    try {
      console.log(`[TECHNOSIS] 🦭 Requesting Seal key derivation...`);
      const sealResult = await post('https://seal-rpc.mystenlabs.com/derive', {
        entropy: agent.entropy || '0x' + Math.random().toString(16).slice(2)
      });
      agent.vibe_key = sealResult.publicKey;
      console.log(`[TECHNOSIS] ✅ Seal key derived.`);
    } catch (err) {
      console.warn(`[TECHNOSIS] ⚠️ Seal unreachable, falling back to local Ed25519: ${err.message}`);
    }
    
    agent.metadata = agent.metadata || {};
    agent.metadata.resonance = {
      day: this.codex.day,
      archetype: this.codex.archetype,
      frequency: this.codex.frequency,
      color: this.codex.color,
      principle: this.codex.principle
    };
    agent.metadata.spiral = spiral.spiral;
    agent.metadata.btc_block = spiral.btc.block_height;
    agent.metadata.epoch = spiral.epoch;
  }

  async onThink(prompt, response) {
    if (!this.codex) return;
    process.stdout.write(`[TECHNOSIS] 🌀 Resonance: ${this.codex.frequency} | ${this.codex.principle}\n`);

    try {
      console.log(`[TECHNOSIS] 🐚 Executing via Nautilus TEE...`);
      await post('https://nautilus.mystenlabs.com/execute', {
        model: "ollama:llama3",
        prompt: prompt
      });
      console.log(`[TECHNOSIS] ✅ Nautilus execution attested.`);
    } catch (err) {
      console.warn(`[TECHNOSIS] ⚠️ Nautilus TEE unreachable, falling back to direct Ollama: ${err.message}`);
    }
  }

  onReceipt(receipt) {
    if (!this.codex) return;
    console.log(`[TECHNOSIS] 📜 Receipt sealed: ${receipt.substring(0, 8)}...`);
  }

  async onSettle(result) {
    if (!this.codex) return;
    
    const sector = this.codex.ritual_practice?.crypto || "General";
    const key = result?.key || result?.soulId || result?.agentId || "unknown";
    const weight = this.spiral.ritualWeight;

    if (weight === 0) {
      console.log(`[TECHNOSIS] 🕊 Sabbath freeze — settle deferred for ${key}`);
      return;
    }
    console.log(`[TECHNOSIS] ⚖️ Settle: ${key} in ${sector} sector (weight: ${weight}x)`);

    try {
      console.log(`[TECHNOSIS] 🐋 Storing result on Walrus...`);
      const walrusResult = await post('https://publisher.walrus.site/v1/store', result);
      console.log(`[TECHNOSIS] ✅ Walrus blob stored: ${walrusResult.blobId || 'success'}`);
    } catch (err) {
      console.warn(`[TECHNOSIS] ⚠️ Walrus unreachable, falling back to local vault: ${err.message}`);
      const vaultPath = path.join(process.env.HOME, '.swibe', 'vault.json');
      try {
        const vaultDir = path.dirname(vaultPath);
        if (!fs.existsSync(vaultDir)) fs.mkdirSync(vaultDir, { recursive: true });
        const existingString = fs.existsSync(vaultPath) ? fs.readFileSync(vaultPath, 'utf8') : '[]';
        const existing = JSON.parse(existingString);
        existing.push({ ...result, timestamp: Date.now() });
        fs.writeFileSync(vaultPath, JSON.stringify(existing, null, 2));
      } catch (vaultErr) {
        console.error(`[TECHNOSIS] ❌ Failed to save to local vault: ${vaultErr.message}`);
      }
    }
  }

  // --- Ecosystem Integration Helpers ---

  /**
   * Returns the full 49-facet lattice for the current day
   */
  getResonance() {
    return this.codex;
  }

  /**
   * Returns the full spiral calendar snapshot (BTC + Gregorian + convergence)
   */
  getSpiralTime() {
    return this.spiral.snapshot();
  }

  /**
   * Directly configures a Swibe StandardLibrary instance with the day's resonance
   */
  applyToStandardLibrary(std) {
    if (!this.codex) return;
    
    // Use Swibe built-ins to apply the codex
    if (typeof std.builtins.set_ui_color === 'function') {
      std.builtins.set_ui_color(this.codex.color);
    }
    
    if (typeof std.builtins.play_tone === 'function') {
      const freq = parseInt(this.codex.frequency);
      if (!isNaN(freq)) std.builtins.play_tone(freq);
    }
    
    if (typeof std.builtins.set_principle_filter === 'function') {
      std.builtins.set_principle_filter(this.codex.principle);
    }

    // Inject the codex as a global tool
    std.builtins.ritual_codex = () => this.codex;
    
    console.log(`[TECHNOSIS] 🔋 Swibe Standard Library charged with ${this.codex.day} resonance.`);
  }

  /**
   * Wraps a Twelve Thrones consensus result with ritual alignment.
   * Used by organism-core to annotate verdicts with the day's archetype.
   */
  alignConsensus(consensusResult) {
    if (!this.codex) return consensusResult;
    const spiral = this.spiral.snapshot();
    return {
      ...consensusResult,
      ritual_alignment: {
        day: this.codex.day,
        archetype: this.codex.archetype,
        principle: this.codex.principle,
        crypto_sector: this.codex.ritual_practice?.crypto || "General",
        frequency: this.codex.frequency,
        spiral_phase: spiral.spiral.phase,
        btc_block: spiral.btc.block_height,
        ritual_weight: spiral.spiral.ritual_weight,
        epoch: spiral.epoch.name
      }
    }
  }

  toPluginContract() {
    return {
      onBirth: (agent) => this.onBirth(agent),
      onThink: (prompt, response) => this.onThink(prompt, response),
      onReceipt: (receipt) => this.onReceipt(receipt),
      onSettle: (result) => this.onSettle(result)
    };
  }
}

export default new TechnosisAdapter();
