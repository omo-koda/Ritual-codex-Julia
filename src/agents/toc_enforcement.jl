# Ritual-Codex v7 — Terms of Conscience Enforcement
# TEE-enforced action validation — cannot be bypassed

module ToCEnforcement

using ..SacredTime
using SHA

export Action, TermsOfConscience
export validate_toc_action, enforce_gate_constraints
export generate_toc_hash, toc_version

# =============================================================================
# TYPES
# =============================================================================

"""
    Action

Proposed agent action subject to ToC validation.
"""
struct Action
    action_type::String         # "transfer", "mint", "stake", "govern", "spawn"
    target::String              # Target address or resource
    amount::Float64             # Value involved (0.0 for non-economic)
    metadata::Dict{String,Any}  # Action-specific parameters
end

"""
    TermsOfConscience

Immutable covenant binding an agent's behavior.
TEE-sealed — the agent cannot modify its own ToC.
"""
struct TermsOfConscience
    version::Int
    toc_hash::String                    # SHA-256 of full terms
    max_transfer_per_block::Float64     # Spending cap per BTC block
    sabbath_compliant::Bool             # Must honor Sabbath gates
    tithe_rate::Float64                 # Èṣù tithe percentage
    allowed_actions::Vector{String}     # Whitelist of action types
    forbidden_targets::Vector{String}   # Blacklisted addresses
    jubilee_reset_eligible::Bool        # Can be reset at Jubilee
    parent_override::Bool               # Parent can override decisions
    tee_sealed::Bool                    # Enforced inside TEE enclave
end

# =============================================================================
# VALIDATION — TEE-Enforced, Cannot Be Bypassed
# =============================================================================

"""
    validate_toc_action(agent_id, proposed_action, toc) -> Bool

TEE-enforced validation of a proposed agent action against its Terms of Conscience.
This function runs inside the TEE enclave — the agent cannot intercept or modify it.
"""
function validate_toc_action(agent_id::String,
                             proposed_action::Action,
                             toc::TermsOfConscience)::Bool
    # 1. Check action type whitelist
    if !(proposed_action.action_type in toc.allowed_actions)
        @warn "ToC DENIED [$agent_id]: action '$(proposed_action.action_type)' not in allowed list"
        return false
    end

    # 2. Check forbidden targets
    if proposed_action.target in toc.forbidden_targets
        @warn "ToC DENIED [$agent_id]: target '$(proposed_action.target)' is forbidden"
        return false
    end

    # 3. Check spending cap
    if proposed_action.amount > toc.max_transfer_per_block
        @warn "ToC DENIED [$agent_id]: amount $(proposed_action.amount) exceeds cap $(toc.max_transfer_per_block)"
        return false
    end

    # 4. Enforce Sabbath compliance
    if toc.sabbath_compliant
        current_height = estimate_current_height()
        btc = from_block_height(current_height)
        spiral = from_btc(btc)

        if !enforce_gate_constraints(proposed_action, spiral, toc)
            return false
        end
    end

    # 5. Tithe enforcement on economic actions
    if proposed_action.amount > 0.0
        tithe_due = proposed_action.amount * toc.tithe_rate
        tithe_paid = get(proposed_action.metadata, "tithe_included", 0.0)
        if tithe_paid < tithe_due
            @warn "ToC DENIED [$agent_id]: tithe $(tithe_paid) < required $(tithe_due)"
            return false
        end
    end

    @info "ToC APPROVED [$agent_id]: $(proposed_action.action_type) → $(proposed_action.target)"
    true
end

# =============================================================================
# GATE CONSTRAINTS — Time-Based Behavioral Locks
# =============================================================================

"""
    enforce_gate_constraints(action, spiral, toc) -> Bool

Check ritual gate constraints against the current spiral time.
"""
function enforce_gate_constraints(action::Action,
                                  spiral::SpiralTime,
                                  toc::TermsOfConscience)::Bool
    gate = check_gate(spiral)

    # Sabbath: settle-only
    if gate == SABBATH && action.action_type ∉ ["settle", "audit", "reflect"]
        @warn "ToC GATE DENIED: Sabbath — only settle/audit/reflect allowed"
        return false
    end

    # Void day: no economic activity
    if gate == VOID && action.amount > 0.0
        @warn "ToC GATE DENIED: Void day — no economic actions permitted"
        return false
    end

    # Èṣù²: tithe must be doubled at crossroads
    if gate == ÈṢÙ² && action.amount > 0.0
        doubled_tithe = action.amount * toc.tithe_rate * 2.0
        tithe_paid = get(action.metadata, "tithe_included", 0.0)
        if tithe_paid < doubled_tithe
            @warn "ToC GATE DENIED: Èṣù² — doubled tithe required ($(doubled_tithe))"
            return false
        end
    end

    # Jubilee: debt forgiveness active
    if gate == JUBILEE_MAJOR && action.action_type == "collect_debt"
        @warn "ToC GATE DENIED: Jubilee — debt collection forbidden during reset"
        return false
    end

    true
end

# =============================================================================
# TOC UTILITIES
# =============================================================================

function generate_toc_hash(toc::TermsOfConscience)::String
    material = "v$(toc.version):$(toc.max_transfer_per_block):$(toc.tithe_rate):" *
               join(toc.allowed_actions, ",") * ":" *
               join(toc.forbidden_targets, ",")
    bytes2hex(sha256(Vector{UInt8}(material)))
end

function toc_version(toc::TermsOfConscience)::Int
    toc.version
end

function estimate_current_height()::Int
    elapsed = time() - 1700000000
    Int(SacredTime.GENESIS_BLOCK + div(elapsed, 600))
end

end # module ToCEnforcement
