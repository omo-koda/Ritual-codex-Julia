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
 * Omo-Koda2 Adapter
 * 
 * Orchestrates the 5-phase Agent Birth Process and ongoing ritual alignment.
 * Connects the Ritual Codex to the Omo-Koda2 dashboard and Steward.
 */
class OmoKodaAdapter {
  constructor(blockHeight) {
    this.currentDay = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    this.codex = this.loadCodex(this.currentDay);
    this.spiral = new SpiralCalendar(blockHeight);
    
    // Tokenomics Mapping
    this.tokens = {
      human: 'SUI',
      core: 'Synapses',
      compute: 'Dopamine'
    };
  }

  loadCodex(day) {
    const jsonPath = path.join(__dirname, 'json', `${day}.json`);
    try {
      if (fs.existsSync(jsonPath)) {
        return JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      }
    } catch (err) {
      console.error(`[OMO-KODA] Failed to load codex for ${day}:`, err.message);
    }
    return null;
  }

  // --- Omo-Koda2 Canonical Birth Process (Phase 3 Orchestration) ---

  /**
   * Applies temporal and ritual alignment to an agent being birthed.
   * This corresponds to Phase 3 of the locked canonical birth process.
   */
  async alignRitual(agent) {
    if (!this.codex) return agent;
    const spiral = this.spiral.snapshot();
    
    console.log(`[OMO-KODA] Phase 3: Ritual Alignment with ${this.codex.archetype} (${this.codex.day})`);
    
    agent.ritual_record = {
      birth_day: this.codex.day,
      archetype: this.codex.archetype,
      frequency: this.codex.frequency,
      color: this.codex.color,
      principle: this.codex.principle,
      spiral_phase: spiral.spiral.phase,
      btc_block: spiral.btc.block_height,
      ritual_weight: spiral.spiral.ritual_weight
    };

    return agent;
  }

  // --- Ecosystem Hooks (Birth, Think, Act) ---

  async onBirth(agentConfig) {
    console.log(`[OMO-KODA] Initiating Birth for ${agentConfig.name}...`);

    // Phases 1 & 2 are handled by BIPON39 and IfáScript services
    // Phase 3: Ritual Alignment (Current Module)
    const alignedAgent = await this.alignRitual(agentConfig);

    // Phases 4 & 5 proceed to SEAL and Steward
    return alignedAgent;
  }

  async onThink(prompt, agent) {
    if (!this.codex) return;
    process.stdout.write(`[OMO-KODA] 🌀 Resonance: ${this.codex.frequency} | ${this.codex.principle}\n`);
    
    // In Omo-Koda2, think calls are gated by the Steward and Nautilus TEE
    try {
      const result = await post('http://localhost:8888/steward/think', {
        agent_id: agent.id,
        prompt: prompt,
        resonance: this.codex.frequency
      });
      return result;
    } catch (err) {
      console.warn(`[OMO-KODA] ⚠️ Steward unreachable, using fallback local logic: ${err.message}`);
    }
  }

  async onAct(action, agent) {
    if (!this.codex) return;
    
    const weight = this.spiral.ritualWeight;
    if (weight === 0) {
      console.log(`[OMO-KODA] 🕊 Sabbath freeze — action deferred for ${agent.id}`);
      return { status: 'deferred', reason: 'sabbath' };
    }

    console.log(`[OMO-KODA] ⚖️ Action validation: ${action.type} (weight: ${weight}x)`);
    
    try {
      // Validate against Terms of Consciousness (ToC) via Steward
      return await post('http://localhost:8888/steward/act', {
        agent_id: agent.id,
        action: action,
        btc_block: this.spiral.snapshot().btc.block_height
      });
    } catch (err) {
      console.error(`[OMO-KODA] ❌ Steward validation failed: ${err.message}`);
      return { status: 'denied', reason: 'steward_error' };
    }
  }

  // --- Helpers ---

  getResonance() {
    return this.codex;
  }

  getSpiralTime() {
    return this.spiral.snapshot();
  }
}

export default new OmoKodaAdapter();
