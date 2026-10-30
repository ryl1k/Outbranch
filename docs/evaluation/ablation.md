# Qloo ablation

Reproducible comparison of LLM-only and Qloo-enhanced opportunity generation on the same confirmed brand profile, claims and constraints. Run with `scripts/ablation.ts`; see the script header for method and data-handling notes.

**Method.** Both arms use the same model, prompt and brand evidence; the only difference is whether Qloo relationships and cultural insights are included. Named entities are extracted from every opportunity with the same extractor. An entity is *verified* when its normalized name appears among the Qloo affinity results collected for the brand (conservative: spelling variants count as unverified). *Novel* means absent from the confirmed brand profile. The blind review is a model judgement and is reported separately from measured metrics.

## Liquid Death — 2026-10-22

Generation model: `claude-sonnet-5-5`. Qloo affinities available for verification: 60.

| Metric (measured) | Qloo-enhanced | LLM-only |
|---|---|---|
| Opportunities generated | 7 | 8 |
| Named entities proposed | 32 | 48 |
| Entities verified as Qloo audience affinities | 21 (66%) | 1 (2%) |
| Opportunities with ≥1 verified cultural link | 7 | 1 |
| Entities new to the brand profile | 28 (88%) | 39 (81%) |
| Distinct verified cultural domains | 4 | 1 |

| Blind review (model judgement, 1–5) | Qloo-enhanced | LLM-only |
|---|---|---|
| specificity | 4 | 3 |
| evidence | 3 | 3 |
| nonObviousness | 4 | 3 |
| commercialClarity | 4 | 4 |

Reviewer preference: **Qloo-enhanced**. Model judgement (blind, order randomised). Not a measured outcome.
### Interpretation and limitations

- **What the measured gap shows.** Almost none of the cultural associations the LLM-only arm proposed are reported by Qloo as affinities of the brand's audience. Without Qloo, the model's cultural claims are mostly unverifiable; with Qloo, every opportunity is anchored to at least one verifiable taste relationship across several domains.
- **What it does not show.** The verification metric is partly circular, because the Qloo arm saw the affinity list it is checked against. It measures *groundedness*, not commercial success. Neither arm's ideas have been validated in market, and cultural affinity does not predict revenue.
- **Novelty** is similar in both arms; Qloo does not make ideas more numerous, it makes their cultural premise checkable.
- **The blind review** is a single model judgement on one brand, so treat it as indicative only. Run the script on more brands before generalising.
