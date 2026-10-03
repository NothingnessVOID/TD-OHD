# Upstream status

Checked 2026-10-04 using a fresh clone and `git ls-remote origin HEAD` of [CReizner/SharpAstrology.SwissEph](https://github.com/CReizner/SharpAstrology.SwissEph). Both resolve to `342a57997c1b987e7949acc98897c8b73d05939a`, v0.5.1. There are no later commits on the advertised default branch to supersede the four local fixes.

| Fix | Status | Verification |
| --- | --- | --- |
| UTC / UT1 | NEEDS FIX | Baseline clock JD differs from swe_utc_to_jd UT1 |
| ICRS frame bias | NEEDS FIX | Baseline CorrectionPipeline lacks bias; ICRS negative control is unchanged |
| Moon Earth refetch | NEEDS FIX | Baseline emission Moon is lifted with reception Earth |
| True Node apparent | NEEDS FIX | Baseline omits retarded raw Moon and adapter forces TRUEPOS |

**ALREADY FIXED UPSTREAM: none.** This is a default-branch check, not a claim about unpublished work or every upstream issue/PR. Recheck HEAD and relevant open proposals before human submission.

The package dependency version and library csproj remain upstream originals. No TD runtime dependency floor or product projects are copied. Tests reference only this astronomy library and its normal Base dependency.
