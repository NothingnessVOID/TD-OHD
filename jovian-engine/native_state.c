/* Read-only build instrumentation. Does not modify historical Swiss state. */
#include <stdio.h>
#include "swephexp.h"
#include "sweph.h"
int jovian_runtime_de(void) { return swed.jpldenum; }
int jovian_planet_file_de(void) { return swed.fidat[0].sweph_denum; }
int jovian_moon_file_de(void) { return swed.fidat[1].sweph_denum; }
