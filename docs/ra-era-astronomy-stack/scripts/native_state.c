/* Research instrumentation only: read metadata, never change Swiss state. */
#include <stdio.h>
#include "swephexp.h"
#include "sweph.h"
int audit_runtime_de(void) { return swed.jpldenum; }
int audit_planet_file_de(void) { return swed.fidat[0].sweph_denum; }
int audit_moon_file_de(void) { return swed.fidat[1].sweph_denum; }
