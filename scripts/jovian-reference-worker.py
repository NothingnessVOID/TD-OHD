"""Read-only oracle: run immutable research model in a separate native process.

The source checkout and runtime are validation inputs, never production imports.
No expected outputs or fixture clocks enter the calculation.
"""
import argparse
import json
import sys
from pathlib import Path

sys.dont_write_bytecode = True
p = argparse.ArgumentParser()
p.add_argument('--research-root', type=Path, required=True)
p.add_argument('--runtime', type=Path, required=True)
p.add_argument('--model', choices=['C1', 'C2', 'C4'], required=True)
a = p.parse_args()
sys.path.insert(0, str(a.research_root / 'docs/jovian-design-discriminator-suite/scripts'))
from research_models import Model, chart, utc_jd

m = Model(a.model, a.runtime)
results = {utc: chart(m, utc_jd(utc)) for utc in json.load(sys.stdin)}
print(json.dumps(results))
