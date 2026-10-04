#!/usr/bin/env python3
"""Diagnostic only: add the missing common-pipeline ICRS -> J2000 bias.

Source must be the exact 0.5.1 commit. DE metadata comes from the actual
registered source header read by SharpDiagnostic; absent metadata means skip.
No production source, package upgrade, source routing, or HD mapping change.
"""
import argparse, hashlib
from pathlib import Path
p=argparse.ArgumentParser(); p.add_argument('source'); a=p.parse_args()
f=Path(a.source)/'Application/Bodies/CorrectionPipeline.cs'
expected='7fb74e3f26a2e361cf5223f09e4dcfbc271793715b3e4c8d0b4e689ba4ef63bb'
if hashlib.sha256(f.read_bytes()).hexdigest()!=expected:
    raise SystemExit('Refusing non-frozen/already patched CorrectionPipeline.cs')
text=f.read_text()
needle='        // ---- Step 8: precession J2000 → date (sweph.c#L2766-L2773) --------'
patch='        // DIAGNOSTIC ONLY. Mirror sweph.c 2.10.03:4052-4053 before precession.\n        // BodyState 0.5.1 lacks DE metadata. Harness injects the verified\n        // actual source reader Header DE number; unknown source metadata skips.\n        var diagnosticDeNumber = rawBody.Source switch\n        {\n            EphemerisSource.Jpl => AppContext.GetData("SharpDiagnostic.DeNumber.Jpl") is int jplDe ? jplDe : 0,\n            EphemerisSource.SwissEph => AppContext.GetData("SharpDiagnostic.DeNumber.SwissEph") is int swissDe ? swissDe : 0,\n            _ => 0, // Never apply to Moshier or unknown sources.\n        };\n        if ((flags & EphemerisFlags.Icrs) == 0 && diagnosticDeNumber >= 403)\n        {\n            CatalogFrameTransforms.IcrsBias(xx, inSpeed, backward: false, model: _models.FrameBias);\n        }\n\n'
assert text.count(needle)==1
text=text.replace(needle,patch+needle)
f.write_text(text)
print('Diagnostic patch applied; new SHA256='+hashlib.sha256(f.read_bytes()).hexdigest())
