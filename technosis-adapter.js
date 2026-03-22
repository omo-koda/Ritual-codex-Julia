import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Technosis Adapter for Swibe & Ecosystem
 * 
 * Bridges the Ritual Codex (7-day resonance) into the agentic nervous system.
 * Connects Swibe v1.1 plugins to the 49-facet lattice.
 */
class TechnosisAdapter {
  constructor() {
    this.currentDay = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    this.codex = this.loadCodex(this.currentDay);
  }

  /**
   * Loads the machine-readable resonance file for the day
   */
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

  // --- Swibe Plugin Interface (v1.1) ---

  onBirth(agent) {
    if (!this.codex) return;
    console.log(`[TECHNOSIS] 🔴 Ritual Birth: ${agent.name} aligned with ${this.codex.archetype} (${this.codex.day})`);
    
    // Attach resonance metadata to the agent
    agent.metadata = agent.metadata || {};
    agent.metadata.resonance = {
      day: this.codex.day,
      archetype: this.codex.archetype,
      frequency: this.codex.frequency,
      color: this.codex.color,
      principle: this.codex.principle
    };
  }

  onThink(prompt, response) {
    if (!this.codex) return;
    // Log resonance during reasoning
    // In a live TEE, this would be an attestation of alignment
    process.stdout.write(`[TECHNOSIS] 🌀 Resonance: ${this.codex.frequency} | ${this.codex.principle}\n`);
  }

  onReceipt(receipt) {
    if (!this.codex) return;
    console.log(`[TECHNOSIS] 📜 Receipt sealed under ${this.codex.day} ritual: ${receipt.substring(0, 8)}...`);
  }

  onSettle(result) {
    if (!this.codex) return;
    const sector = this.codex.ritual_practice?.crypto || "General";
    const key = result?.key || result?.soulId || result?.agentId || "unknown";
    console.log(`[TECHNOSIS] ⚖️ Settle: ${key} finalized in ${sector} sector.`);
  }

  // --- Ecosystem Integration Helpers ---

  /**
   * Returns the full 49-facet lattice for the current day
   */
  getResonance() {
    return this.codex;
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
    return {
      ...consensusResult,
      ritual_alignment: {
        day: this.codex.day,
        archetype: this.codex.archetype,
        principle: this.codex.principle,
        crypto_sector: this.codex.ritual_practice?.crypto || "General",
        frequency: this.codex.frequency
      }
    };
  }

  /**
   * Produces a bridge-ready payload for organism-core full-breath integration.
   * Returns the 4 Swibe plugin hooks as a plain object contract.
   */
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
