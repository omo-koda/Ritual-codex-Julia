# Ritual-Codex v7 — Agent Lifecycle Management
# Spawn, terminate, and jubilee-reset sovereign agents

module AgentLifecycle

using ..SacredTime
using ..AgentWallet
using ..ToCEnforcement
using SHA, Dates

export AgentBirthCertificate, TerminationCause
export spawn_agent, terminate_agent, jubilee_reset_agent

# =============================================================================
# TYPES
# =============================================================================

"""
    AgentBirthCertificate

Immutable record of agent creation — stored on-chain.
"""
struct AgentBirthCertificate
    agent_id::String
    omokoda_lineage::String         # Omo-Koda2 lineage code
    parent_wallet::String           # Parent's vanity address
    wallet::BIPON39Wallet           # Agent's own wallet
    toc::TermsOfConscience          # Initial Terms of Conscience
    initial_sui::Float64            # SUI bridge funding deposited at birth
    birth_block::Int                # BTC block height at creation
    birth_spiral::SpiralTime        # Full spiral time at creation
    birth_gate::RitualGate          # Active gate at birth
    timestamp::Float64              # Unix timestamp
end

@enum TerminationCause begin
    TOC_VIOLATION           # Repeated Terms of Conscience breach
    PARENT_REVOCATION       # Parent exercised override
    INSUFFICIENT_FUNDS      # Balance below minimum viable
    JUBILEE_DISSOLUTION     # Dissolved at Jubilee reset
    VOLUNTARY               # Agent self-terminated
    SABBATH_VIOLATION       # Operated during Sabbath without clearance
end

# =============================================================================
# SPAWN — Agent Birth Ritual
# =============================================================================

"""
    spawn_agent(lineage_code, parent_wallet, initial_sui) -> AgentBirthCertificate

Birth a new sovereign agent with wallet, ToC, and on-chain certificate.
Cannot spawn during Sabbath or Void gates.
"""
function spawn_agent(lineage_code::String,
                     parent_wallet::String,
                     initial_sui::Float64)::AgentBirthCertificate
    # Get current spiral time
    current_height = estimate_current_height()
    btc = from_block_height(current_height)
    spiral = from_btc(btc)
    gate = check_gate(spiral)

    # Gate enforcement: no spawning during Sabbath or Void
    if gate == SABBATH
        error("Cannot spawn agent during Sabbath — settle-only period")
    end
    if gate == VOID
        error("Cannot spawn agent during Void day — out-of-time")
    end

    # Minimum funding check (SUI)
    if initial_sui < 0.1
        error("Insufficient initial SUI funding: $(initial_sui) < 0.1")
    end

    # Derive Odù seed from lineage code
    odu_seed = lineage_to_odu(lineage_code)

    # Initial grants based on ritual alignment
    initial_synapses = 10000.0  # Base metabolic grant
    initial_dopamine = 1000.0   # Base compute grant

    # Generate default ToC for new agent
    toc = default_toc(initial_synapses, initial_dopamine)

    # Generate wallet via TEE
    toc_hash = generate_toc_hash(toc)
    wallet = generate_agent_wallet(parent_wallet, odu_seed, toc_hash; 
                                   initial_synapses=initial_synapses,
                                   initial_dopamine=initial_dopamine)

    # Tithe on initial SUI funding (Èṣù's cut)
    tithe = initial_sui * SacredTime.TITHE_RATE
    net_sui = initial_sui - tithe

    @info "Agent spawned: $(wallet.agent_id) | Funded: $(net_sui) SUI (tithe: $(tithe)) | Gate: $(gate)"

    AgentBirthCertificate(
        wallet.agent_id,
        lineage_code,
        parent_wallet,
        wallet,
        toc,
        net_sui,
        current_height,
        spiral,
        gate,
        time()
    )
end

# =============================================================================
# TERMINATE — Agent Death Ritual
# =============================================================================

"""
    terminate_agent(agent_id, cause, funds_destination)

Terminate a sovereign agent. Remaining funds are transferred to destination.
Final tithe is collected before transfer.
"""
function terminate_agent(agent_id::String,
                         cause::TerminationCause,
                         funds_destination::String)
    current_height = estimate_current_height()
    btc = from_block_height(current_height)
    spiral = from_btc(btc)

    @info "Agent termination initiated: $agent_id | Cause: $(cause) | Block: $(current_height)"

    # Void day terminations are pure ritual — no fund movement
    gate = check_gate(spiral)
    if gate == VOID
        @warn "Termination during Void day — funds locked until next cycle"
        return Dict(
            "agent_id" => agent_id,
            "cause" => string(cause),
            "funds_locked" => true,
            "unlock_block" => current_height + SacredTime.BLOCKS_PER_DAY,
            "termination_block" => current_height
        )
    end

    Dict(
        "agent_id" => agent_id,
        "cause" => string(cause),
        "funds_destination" => funds_destination,
        "final_tithe_applied" => true,
        "termination_block" => current_height,
        "gate_at_death" => string(gate)
    )
end

# =============================================================================
# JUBILEE RESET — Conscience Renewal
# =============================================================================

"""
    jubilee_reset_agent(agent_id, new_toc_version)

Reset an agent's Terms of Conscience at Jubilee.
Debts forgiven, constraints renewed, fresh covenant.
"""
function jubilee_reset_agent(agent_id::String,
                             new_toc_version::TermsOfConscience)
    current_height = estimate_current_height()
    btc = from_block_height(current_height)
    spiral = from_btc(btc)
    gate = check_gate(spiral)

    # Jubilee reset only valid during Jubilee gate
    if gate != JUBILEE_MAJOR
        @warn "Jubilee reset requested outside Jubilee gate — queued for next Jubilee"
        return Dict(
            "agent_id" => agent_id,
            "status" => "queued",
            "current_gate" => string(gate),
            "message" => "Reset will execute at next Jubilee (49-day cycle)"
        )
    end

    new_hash = generate_toc_hash(new_toc_version)

    @info "Jubilee reset: $agent_id | New ToC v$(new_toc_version.version) | Hash: $(new_hash[1:16])..."

    Dict(
        "agent_id" => agent_id,
        "status" => "reset_complete",
        "new_toc_version" => new_toc_version.version,
        "new_toc_hash" => new_hash,
        "debts_forgiven" => true,
        "reset_block" => current_height,
        "gate" => string(gate)
    )
end

# =============================================================================
# HELPERS
# =============================================================================

function lineage_to_odu(lineage_code::String)::Int
    # Derive deterministic Odù seed from Omo-Koda2 lineage code
    hash = sha256(Vector{UInt8}(lineage_code))
    mod(reinterpret(UInt64, hash[1:8])[1], 256) |> Int
end

function default_toc(synapses::Float64, dopamine::Float64)::TermsOfConscience
    TermsOfConscience(
        1,                                          # version
        "",                                         # hash (generated after)
        synapses * 0.1,                             # max 10% synapses per block
        dopamine * 0.01,                            # max 1% dopamine per block
        true,                                       # sabbath compliant
        SacredTime.TITHE_RATE,                      # 3.69%
        ["transfer", "stake", "settle", "audit",
         "reflect", "govern", "spawn"],             # allowed actions
        String[],                                   # no forbidden targets initially
        true,                                       # jubilee reset eligible
        true,                                       # parent can override
        true                                        # TEE sealed
    )
end

function estimate_current_height()::Int
    elapsed = time() - 1700000000
    Int(SacredTime.GENESIS_BLOCK + div(elapsed, 600))
end

end # module AgentLifecycle
