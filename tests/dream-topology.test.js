import test from 'node:test';
import assert from 'node:assert/strict';
import { CENTERS, CHANNELS, GATES } from '../src/lib/human-design/catalog.js';
import { CENTER_SHAPES, GATE_PATHS, GATE_CIRCLE_POSITIONS } from '../src/lib/human-design/bodygraph-geometry.js';
import {
  DREAM_CENTER_KEYS, DREAM_CENTER_ORDER, DREAM_REALMS, DREAM_REALM_ORDER,
  DREAM_REALM_OF_GATE, DREAM_PORTAL_GATES, DREAM_GATES, DREAM_CHANNELS,
  DREAM_PATH_GATES, DREAM_VIEW_BOX, DREAM_TOPOLOGY,
  DREAM_PORTAL_STUBS, DREAM_PORTAL_STUB_LENGTH, DREAM_ROTATION, DREAM_ROTATION_CENTER,
  dreamRealmOf, isDreamGate, isDreamPortal, dreamChannelKey, isDreamChannelKey
} from '../src/lib/human-design/dream-topology.js';
// dreamTypeOf lives in dream-chart.js, but "no Manifestor is reachable" is a
// topology fact, so it is proven here against the channel set.
import { dreamTypeOf } from '../src/lib/dream-chart.js';

/** The fifteen sleep gates, pinned. Provenance: THIRD_PARTY_NOTICES.md. */
const EXPECTED_DREAM_GATES = [1, 5, 8, 12, 15, 19, 20, 27, 28, 38, 42, 50, 53, 57, 62];
/** The six channels the sleep design can complete, as catalog gate pairs. */
const EXPECTED_CHANNEL_KEYS = ['1-8', '5-15', '20-57', '27-50', '28-38', '42-53'];
/**
 * The dream content box before rotation, as measured by
 * `node dev/measure-dream-viewbox.mjs` (five centre shapes, all fifteen
 * half-channel paths with the portals stubbed, the integration spans and every
 * gate circle at its largest ring). Content only — the renderer adds
 * BODYGRAPH_PAD on every side. Pinned here so a geometry change names the
 * number that moved instead of only failing the derived viewBox.
 */
const UPRIGHT_CONTENT = { x: 8.25, y: 350.14, w: 526.3, h: 946.13 };
/** src/bodygraph.js BODYGRAPH_PAD: padding the renderer adds on every side. */
const BODYGRAPH_PAD = 16;

/**
 * Absolute-coordinate path walker, copied from dev/measure-dream-viewbox.mjs so
 * this file stays self-contained. Returns the corner points in order; arc bulge
 * is ignored because every radius here is 5-6 units.
 */
function walk(d) {
  const pts = [];
  let x = 0, y = 0, sx = 0, sy = 0;
  const tokens = d.match(/[A-Za-z]|[-+]?[0-9]*[.]?[0-9]+/g) || [];
  let i = 0, cmd = null;
  const num = () => Number(tokens[i++]);
  const point = rel => { const nx = num(), ny = num(); x = rel ? x + nx : nx; y = rel ? y + ny : ny; pts.push([x, y]); };
  while (i < tokens.length) {
    if (/[A-Za-z]/.test(tokens[i])) cmd = tokens[i++];
    const rel = cmd === cmd.toLowerCase();
    switch (cmd.toUpperCase()) {
      case 'M': point(rel); sx = x; sy = y; cmd = rel ? 'l' : 'L'; break;
      case 'L': point(rel); break;
      case 'H': { const nx = num(); x = rel ? x + nx : nx; pts.push([x, y]); break; }
      case 'V': { const ny = num(); y = rel ? y + ny : ny; pts.push([x, y]); break; }
      case 'C': point(rel); point(rel); point(rel); break;
      case 'S': case 'Q': case 'T': point(rel); point(rel); break;
      case 'A': { num(); num(); num(); num(); num(); point(rel); break; }
      case 'Z': x = sx; y = sy; break;
      default: throw new Error(`Unhandled command ${cmd} in: ${d}`);
    }
  }
  return pts;
}

function boundsOf(pts) {
  const b = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const [x, y] of pts) {
    if (x < b.minX) b.minX = x;
    if (x > b.maxX) b.maxX = x;
    if (y < b.minY) b.minY = y;
    if (y > b.maxY) b.maxY = y;
  }
  return b;
}
const bboxDiagonal = b => Math.hypot(b.maxX - b.minX, b.maxY - b.minY);
const midpoint = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
/**
 * A half-channel bar arrives as four corners in the order [farA, nearB, nearC,
 * farD]: B and C sit at the gate circle, A and D are the far end. The midline
 * runs near(B,C) -> far(A,D) and carries the bar's direction.
 */
const barMidline = pts => ({
  near: midpoint(pts[1], pts[2]),
  far: midpoint(pts[0], pts[3]),
  width: Math.hypot(pts[2][0] - pts[1][0], pts[2][1] - pts[1][1])
});
const midlineVector = midline => [midline.far[0] - midline.near[0], midline.far[1] - midline.near[1]];
const midlineLength = midline => Math.hypot(...midlineVector(midline));
/** Smallest angle between two direction vectors, in degrees. */
function angleBetween(a, b) {
  const cross = a[0] * b[1] - a[1] * b[0];
  const dot = a[0] * b[0] + a[1] * b[1];
  return Math.abs(Math.atan2(cross, dot)) * 180 / Math.PI;
}
/** Bounding boxes intersect on both axes, i.e. the shapes can touch in plan. */
const boxesIntersect = (a, b) => !(
  a.maxX < b.minX || a.minX > b.maxX || a.maxY < b.minY || a.minY > b.maxY
);
/** How far one box reaches into the other on its thinnest overlapping axis. */
const overlapDepth = (a, b) => Math.min(
  Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX),
  Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY)
);

/** Shape key in bodygraph-geometry.js for each centre the sleep design drops. */
const REMOVED_SHAPE_KEYS = ['head', 'ajna', 'heart', 'solar'];
const SHAPE_KEY_OF_CENTER = { head: 'Head', ajna: 'Ajna', heart: 'Ego', solar: 'SolarPlexus' };

/** Motors come from the catalog, never from a hardcoded list. */
const MOTOR_CENTERS = Object.keys(CENTERS).filter(key => CENTERS[key].motor === true);
const REMOVED_CENTERS = Object.keys(CENTERS).filter(key => !DREAM_CENTER_KEYS.includes(key));

const sortedKeys = channels => channels.map(dreamChannelKey).sort();
const catalogChannel = key => CHANNELS.find(channel => dreamChannelKey(channel) === key);
/** Every subset of the retained centres: 2^5 = 32 possible definitions. */
const centerSubsets = keys => keys.reduce(
  (acc, key) => [...acc, ...acc.map(set => new Set([...set, key]))],
  [new Set()]
);

test('the sleep design keeps exactly fifteen gates', () => {
  assert.deepEqual([...DREAM_GATES], EXPECTED_DREAM_GATES);
  assert.equal(DREAM_GATES.length, 15);
  for (let i = 1; i < DREAM_GATES.length; ++i) {
    assert.ok(DREAM_GATES[i] > DREAM_GATES[i - 1], `DREAM_GATES not ascending at index ${i}`);
  }
  assert.ok(Object.isFrozen(DREAM_GATES));
  for (const gate of EXPECTED_DREAM_GATES) assert.equal(isDreamGate(gate), true, `gate ${gate}`);
  // Waking gates that sit in removed centres, or in retained centres but outside
  // the dream set, must all be rejected.
  for (const gate of [2, 4, 7, 10, 14, 30, 34, 44, 46, 51, 59, 61, 63, 64]) {
    assert.equal(isDreamGate(gate), false, `gate ${gate} is not a dream gate`);
  }
});

test('the six dream channels are the waking catalog objects, not a copied definition', () => {
  assert.equal(DREAM_CHANNELS.length, 6);
  assert.deepEqual(sortedKeys(DREAM_CHANNELS), [...EXPECTED_CHANNEL_KEYS].sort());
  for (const channel of DREAM_CHANNELS) {
    const key = dreamChannelKey(channel);
    const source = catalogChannel(key);
    assert.ok(source, `catalog has no channel ${key}`);
    // Reference identity: dream-topology filters CHANNELS, it does not re-declare it.
    assert.equal(channel, source, `dream channel ${key} is a copy, not the catalog object`);
    assert.deepEqual([...channel.gates], [...source.gates], key);
    assert.deepEqual([...channel.centers], [...source.centers], key);
    assert.deepEqual(
      { name: channel.name, theme: channel.theme, circuit: channel.circuit, subcircuit: channel.subcircuit },
      { name: source.name, theme: source.theme, circuit: source.circuit, subcircuit: source.subcircuit },
      key
    );
    assert.equal(channel.centers.length, 2, key);
    for (const center of channel.centers) {
      assert.ok(DREAM_CENTER_KEYS.includes(center), `${key} touches removed centre ${center}`);
    }
  }
  // The induced subgraph is complete: no waking channel with both gates in the
  // dream set was left out.
  const missed = CHANNELS.filter(channel => channel.gates.every(isDreamGate) && !DREAM_CHANNELS.includes(channel));
  assert.deepEqual(missed.map(dreamChannelKey), []);
  for (const key of EXPECTED_CHANNEL_KEYS) assert.equal(isDreamChannelKey(key), true, key);
  // 34-57 is a waking channel that merely touches one dream gate.
  assert.equal(isDreamChannelKey('34-57'), false);
  assert.equal(isDreamChannelKey('57-34'), false);
  // Keys are order-sensitive: they are the catalog's gate order, not sorted.
  assert.equal(isDreamChannelKey('53-42'), false);
  assert.equal(dreamChannelKey({ gates: [42, 53] }), '42-53');
});

test('every dream gate sits inside one of the five retained centres', () => {
  assert.deepEqual([...DREAM_CENTER_KEYS], ['throat', 'g', 'spleen', 'sacral', 'root']);
  assert.equal(DREAM_CENTER_KEYS.length, 5);
  for (const gate of DREAM_GATES) {
    const entry = GATES[gate];
    assert.ok(entry, `catalog has no gate ${gate}`);
    assert.ok(
      DREAM_CENTER_KEYS.includes(entry.center),
      `dream gate ${gate} lives in ${entry.center}, which the sleep design does not draw`
    );
  }
  // Cutting four centres must not orphan a single dream gate.
  assert.deepEqual(REMOVED_CENTERS.sort(), ['ajna', 'head', 'heart', 'solar']);
  for (const center of REMOVED_CENTERS) {
    const orphans = Object.keys(GATES).filter(gate => GATES[gate].center === center && isDreamGate(Number(gate)));
    assert.deepEqual(orphans, [], `centre ${center} still claims dream gates`);
  }
});

test('the three night fields partition the fifteen gates, five each', () => {
  assert.deepEqual([...DREAM_REALM_ORDER], ['light', 'earth', 'demon']);
  const seen = new Map();
  for (const realmId of DREAM_REALM_ORDER) {
    const realm = DREAM_REALMS[realmId];
    assert.equal(realm.id, realmId);
    assert.equal(realm.gates.length, 5, `${realmId} must hold five gates`);
    assert.equal(new Set(realm.gates).size, 5, `${realmId} repeats a gate`);
    for (const gate of realm.gates) {
      assert.ok(isDreamGate(gate), `${realmId} holds non-dream gate ${gate}`);
      assert.equal(seen.has(gate), false, `gate ${gate} appears in ${seen.get(gate)} and ${realmId}`);
      seen.set(gate, realmId);
      assert.equal(dreamRealmOf(gate), realmId, `dreamRealmOf(${gate})`);
      assert.equal(DREAM_REALM_OF_GATE[gate], realmId, `DREAM_REALM_OF_GATE[${gate}]`);
    }
  }
  // Exactly a partition: fifteen gates, no overlap, nothing left over.
  assert.equal(seen.size, 15);
  assert.deepEqual(Object.keys(DREAM_REALM_OF_GATE).map(Number).sort((a, b) => a - b), EXPECTED_DREAM_GATES);
  assert.deepEqual([...seen.keys()].sort((a, b) => a - b), EXPECTED_DREAM_GATES);
  for (const gate of [2, 34, 44, 64]) assert.equal(dreamRealmOf(gate), null, `gate ${gate} has no night field`);
});

test('each portal belongs to its own field and carries no channel', () => {
  assert.deepEqual([...DREAM_PORTAL_GATES], [62, 12, 19]);
  for (const realmId of DREAM_REALM_ORDER) {
    const realm = DREAM_REALMS[realmId];
    assert.ok(isDreamPortal(realm.portal), `${realmId} portal ${realm.portal}`);
    assert.ok(realm.gates.includes(realm.portal), `${realmId} portal is not one of its own gates`);
    assert.equal(realm.gates[0], realm.portal, `${realmId} is entered through its portal`);
    assert.equal(dreamRealmOf(realm.portal), realmId);
  }
  for (const portal of DREAM_PORTAL_GATES) {
    const touched = DREAM_CHANNELS.filter(channel => channel.gates.includes(portal));
    assert.deepEqual(touched.map(dreamChannelKey), [], `portal ${portal} must have no channel`);
  }
  const portals = DREAM_GATES.filter(isDreamPortal);
  assert.deepEqual(portals, [12, 19, 62]);
  for (const gate of DREAM_GATES) assert.equal(isDreamPortal(gate), gate === 12 || gate === 19 || gate === 62, `gate ${gate}`);
});

test('all fifteen sleep gates draw a path: channelled gates keep the waking path, portals take a stub', () => {
  // The sleep design now draws something for every gate it keeps. Twelve gates
  // carry a channel, so they draw the original waking half-channel unchanged.
  assert.equal(DREAM_PATH_GATES.length, 15);
  assert.deepEqual([...DREAM_PATH_GATES], [...DREAM_GATES]);
  const channelled = DREAM_GATES.filter(gate => !isDreamPortal(gate));
  assert.equal(channelled.length, 12);
  for (const gate of channelled) {
    const carrying = DREAM_CHANNELS.filter(channel => channel.gates.includes(gate));
    assert.ok(carrying.length >= 1, `path gate ${gate} belongs to no dream channel`);
    for (const channel of carrying) {
      const partner = channel.gates.find(other => other !== gate);
      assert.ok(DREAM_PATH_GATES.includes(partner), `${gate}-${partner}: partner is not a path gate`);
    }
    // No override means the renderer draws GATE_PATHS[gate] verbatim.
    assert.equal(gate in DREAM_PORTAL_STUBS, false, `channelled gate ${gate} must keep its waking path`);
  }
  // The three portals also draw, but shortened: 12 and 19 by override, 62
  // because its waking path already has the stub length.
  for (const portal of DREAM_PORTAL_GATES) {
    assert.ok(DREAM_PATH_GATES.includes(portal), `portal ${portal} must draw a path`);
    assert.equal(DREAM_GATES.includes(portal), true, `portal ${portal}`);
  }
  assert.deepEqual(Object.keys(DREAM_PORTAL_STUBS).map(Number).sort((a, b) => a - b), [12, 19]);
  assert.equal(62 in DREAM_PORTAL_STUBS, false, 'gate 62 needs no override');
  // The overridden keys are exactly the portals that carry a channel somewhere else.
  for (const gate of Object.keys(DREAM_PORTAL_STUBS).map(Number)) {
    assert.ok(isDreamPortal(gate), `override for non-portal gate ${gate}`);
  }
  // The topology hands the renderer a Set; it must agree with the array export.
  assert.deepEqual([...DREAM_TOPOLOGY.pathGates].sort((a, b) => a - b), [...DREAM_PATH_GATES]);
});

test('the portal stubs are short bars in the waking direction, not full half-channels', () => {
  const stubGates = Object.keys(DREAM_PORTAL_STUBS).map(Number);
  assert.deepEqual(stubGates.sort((a, b) => a - b), [12, 19]);
  assert.equal(typeof DREAM_PORTAL_STUB_LENGTH, 'number');
  assert.ok(DREAM_PORTAL_STUB_LENGTH > 0 && DREAM_PORTAL_STUB_LENGTH < 100, `stub length ${DREAM_PORTAL_STUB_LENGTH}`);

  for (const gate of stubGates) {
    const stubPath = DREAM_PORTAL_STUBS[gate];
    // A well-formed closed SVG path: the renderer only ever sets it as `d`.
    assert.equal(typeof stubPath, 'string', `gate ${gate} stub is not a string`);
    assert.match(stubPath, /^M[\d.,\-\s]+(?:L[\d.,\-\s]+)+Z$/i, `gate ${gate} stub is not a closed M/L path: ${stubPath}`);
    const stubPts = walk(stubPath);
    assert.equal(stubPts.length, 4, `gate ${gate} stub has ${stubPts.length} corners, expected 4`);
    assert.ok(stubPts.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y)), `gate ${gate} stub has a non-finite corner`);

    // Much shorter than the waking half-channel it replaces.
    const wakingBox = boundsOf(walk(GATE_PATHS[gate]));
    const stubBox = boundsOf(walk(stubPath));
    assert.ok(
      bboxDiagonal(stubBox) < bboxDiagonal(wakingBox) / 2,
      `gate ${gate} stub bbox diagonal ${bboxDiagonal(stubBox).toFixed(2)} is not clearly shorter than the waking ${bboxDiagonal(wakingBox).toFixed(2)}`
    );

    // The bar itself is `DREAM_PORTAL_STUB_LENGTH` long and keeps the catalog's
    // 17.4-unit width: only the length changed.
    const stubBar = barMidline(stubPts);
    const wakingBar = barMidline(walk(GATE_PATHS[gate]));
    assert.ok(
      Math.abs(midlineLength(stubBar) - DREAM_PORTAL_STUB_LENGTH) < 0.5,
      `gate ${gate} stub midline is ${midlineLength(stubBar).toFixed(2)} units, expected ${DREAM_PORTAL_STUB_LENGTH}`
    );
    assert.ok(
      Math.abs(stubBar.width - wakingBar.width) < 0.1,
      `gate ${gate} stub bar width ${stubBar.width.toFixed(2)} drifted from the waking ${wakingBar.width.toFixed(2)}`
    );

    // Same direction as the waking path, so the stub reads as that channel.
    const degrees = angleBetween(midlineVector(stubBar), midlineVector(wakingBar));
    assert.ok(degrees < 1, `gate ${gate} stub points ${degrees.toFixed(3)}deg away from the waking half-channel`);

    // The mouth still touches its gate circle: an endpoint within ~20 units of
    // the centre (circle radius 12.3), and not swallowed by it.
    const circle = GATE_CIRCLE_POSITIONS[gate];
    assert.ok(circle, `GATE_CIRCLE_POSITIONS has no entry for gate ${gate}`);
    const nearest = Math.min(...stubPts.map(([x, y]) => Math.hypot(x - circle.cx, y - circle.cy)));
    const radius = circle.r || 12.3;
    assert.ok(nearest <= radius + 20, `gate ${gate} stub ends ${nearest.toFixed(2)} units from its gate circle`);
    assert.ok(nearest >= radius - 5, `gate ${gate} stub ends ${nearest.toFixed(2)} units from the centre, inside the number`);
  }
});

test('the portal stubs stop short of the centres the sleep design removes', () => {
  for (const gate of [12, 19]) {
    const stubBox = boundsOf(walk(DREAM_PORTAL_STUBS[gate]));
    for (const centerKey of REMOVED_SHAPE_KEYS) {
      const shape = CENTER_SHAPES[SHAPE_KEY_OF_CENTER[centerKey]];
      assert.ok(shape, `CENTER_SHAPES has no geometry for ${SHAPE_KEY_OF_CENTER[centerKey]}`);
      const centerBox = boundsOf(walk(shape.path));
      assert.equal(
        boxesIntersect(stubBox, centerBox), false,
        `gate ${gate} stub reaches removed centre ${centerKey} (overlap depth ${overlapDepth(stubBox, centerBox).toFixed(2)})`
      );
    }
  }
  // Gate 62 is the known exception: its waking path is already stub length and
  // nicks the Ajna by ~5 units. Tolerated, but it must stay a nick.
  const gate62 = boundsOf(walk(GATE_PATHS[62]));
  assert.equal(62 in DREAM_PORTAL_STUBS, false, 'gate 62 is expected to keep its waking path');
  const ajna = boundsOf(walk(CENTER_SHAPES.Ajna.path));
  assert.equal(boxesIntersect(gate62, ajna), true, 'gate 62 no longer touches the Ajna — re-measure the viewBox');
  const depth = overlapDepth(gate62, ajna);
  assert.ok(depth > 0 && depth < 10, `gate 62 overlaps the Ajna by ${depth.toFixed(2)} units, expected a small nick`);
  // Gate 62 must still clear the other three removed centres.
  for (const centerKey of REMOVED_SHAPE_KEYS.filter(key => key !== 'ajna')) {
    const centerBox = boundsOf(walk(CENTER_SHAPES[SHAPE_KEY_OF_CENTER[centerKey]].path));
    assert.equal(boxesIntersect(gate62, centerBox), false, `gate 62 path reaches removed centre ${centerKey}`);
  }
});

test('no dream channel joins the Throat to a motor, so a Manifestor is structurally impossible', () => {
  assert.ok(MOTOR_CENTERS.length > 0, 'catalog declares no motor centre');
  assert.equal(MOTOR_CENTERS.includes('throat'), false, 'the Throat is not a motor');
  assert.deepEqual(MOTOR_CENTERS.filter(key => DREAM_CENTER_KEYS.includes(key)).sort(), ['root', 'sacral']);
  for (const channel of DREAM_CHANNELS) {
    const touchesThroat = channel.centers.includes('throat');
    const touchesMotor = channel.centers.some(center => MOTOR_CENTERS.includes(center));
    assert.equal(
      touchesThroat && touchesMotor, false,
      `${dreamChannelKey(channel)} connects the Throat to a motor and would manifest`
    );
  }
  // Exhaustive over every definition the retained centres can produce.
  const subsets = centerSubsets([...DREAM_CENTER_KEYS]);
  assert.equal(subsets.length, 32);
  for (const subset of subsets) {
    const type = dreamTypeOf(subset);
    assert.ok(
      ['generator', 'projector', 'reflector'].includes(type),
      `dreamTypeOf([${[...subset]}]) returned ${type}`
    );
    assert.notEqual(type, 'manifestor');
    assert.notEqual(type, 'manifesting-generator');
  }
});

test('the dream viewBox is the upright content, padded and rotated a quarter turn', () => {
  for (const key of ['x', 'y', 'w', 'h']) {
    const value = DREAM_VIEW_BOX[key];
    assert.equal(typeof value, 'number', key);
    assert.ok(Number.isFinite(value), `${key} is not finite: ${value}`);
  }
  assert.ok(DREAM_VIEW_BOX.w > 0, `w is not positive: ${DREAM_VIEW_BOX.w}`);
  assert.ok(DREAM_VIEW_BOX.h > 0, `h is not positive: ${DREAM_VIEW_BOX.h}`);
  // Read sideways: the drawn box is landscape. A rotation that was applied to
  // the geometry but not to the viewBox lands below 1 and fails here.
  const ratio = DREAM_VIEW_BOX.w / DREAM_VIEW_BOX.h;
  assert.ok(ratio >= 1.6 && ratio <= 1.9, `aspect ratio ${ratio.toFixed(4)} outside 1.6-1.9`);
  // Rotation transposes the padded content box, so it neither grows nor shrinks:
  // (w + 2*PAD) * (h + 2*PAD) of the upright box equals w * h of the rotated one.
  const paddedUpright = (UPRIGHT_CONTENT.w + BODYGRAPH_PAD * 2) * (UPRIGHT_CONTENT.h + BODYGRAPH_PAD * 2);
  const rotatedArea = DREAM_VIEW_BOX.w * DREAM_VIEW_BOX.h;
  const error = Math.abs(rotatedArea - paddedUpright) / paddedUpright;
  assert.ok(error < 0.01, `rotated area ${rotatedArea.toFixed(1)} is ${(error * 100).toFixed(2)}% off the padded upright ${paddedUpright.toFixed(1)}`);
  // The transpose must actually swap the sides, not just preserve the area.
  assert.ok(Math.abs(DREAM_VIEW_BOX.w - (UPRIGHT_CONTENT.h + BODYGRAPH_PAD * 2)) < 0.5, `w ${DREAM_VIEW_BOX.w} is not the padded upright height`);
  assert.ok(Math.abs(DREAM_VIEW_BOX.h - (UPRIGHT_CONTENT.w + BODYGRAPH_PAD * 2)) < 0.5, `h ${DREAM_VIEW_BOX.h} is not the padded upright width`);
  assert.ok(Object.isFrozen(DREAM_VIEW_BOX));
});

test('the rotation is a quarter turn about the padded upright centre', () => {
  assert.equal(DREAM_ROTATION, 90);
  assert.equal(DREAM_TOPOLOGY.rotate, DREAM_ROTATION);
  for (const key of ['x', 'y']) {
    assert.equal(typeof DREAM_ROTATION_CENTER[key], 'number', `rotateCenter.${key}`);
    assert.ok(Number.isFinite(DREAM_ROTATION_CENTER[key]), `rotateCenter.${key} is not finite`);
  }
  // The pivot is the centre of the *padded* upright box: rotating about the
  // content centre instead would leave the drawn graph off-centre in the SVG.
  const expectedX = UPRIGHT_CONTENT.x - BODYGRAPH_PAD + (UPRIGHT_CONTENT.w + BODYGRAPH_PAD * 2) / 2;
  const expectedY = UPRIGHT_CONTENT.y - BODYGRAPH_PAD + (UPRIGHT_CONTENT.h + BODYGRAPH_PAD * 2) / 2;
  assert.ok(Math.abs(DREAM_ROTATION_CENTER.x - expectedX) < 0.01, `rotateCenter.x ${DREAM_ROTATION_CENTER.x}, expected ${expectedX}`);
  assert.ok(Math.abs(DREAM_ROTATION_CENTER.y - expectedY) < 0.01, `rotateCenter.y ${DREAM_ROTATION_CENTER.y}, expected ${expectedY}`);
  assert.equal(DREAM_TOPOLOGY.rotateCenter, DREAM_ROTATION_CENTER);
  // Rotating about that pivot maps the padded upright box onto DREAM_VIEW_BOX,
  // which is what lets the renderer swap width and height without re-measuring.
  // The pivot is the centre of both boxes: rotation moves the box, not its centre.
  assert.ok(Math.abs((DREAM_VIEW_BOX.x + DREAM_VIEW_BOX.w / 2) - DREAM_ROTATION_CENTER.x) < 0.02, 'rotated box is not centred on the pivot in x');
  assert.ok(Math.abs((DREAM_VIEW_BOX.y + DREAM_VIEW_BOX.h / 2) - DREAM_ROTATION_CENTER.y) < 0.02, 'rotated box is not centred on the pivot in y');
  const paddedX = UPRIGHT_CONTENT.x - BODYGRAPH_PAD;
  const paddedY = UPRIGHT_CONTENT.y - BODYGRAPH_PAD;
  assert.ok(Math.abs((paddedX + (UPRIGHT_CONTENT.w + BODYGRAPH_PAD * 2) / 2) - DREAM_ROTATION_CENTER.x) < 0.02, 'padding did not centre the upright box on the pivot in x');
  assert.ok(Math.abs((paddedY + (UPRIGHT_CONTENT.h + BODYGRAPH_PAD * 2) / 2) - DREAM_ROTATION_CENTER.y) < 0.02, 'padding did not centre the upright box on the pivot in y');
  // The rotated box is the padded upright box with its sides swapped.
  assert.ok(Math.abs((DREAM_VIEW_BOX.x + DREAM_VIEW_BOX.w) - (DREAM_ROTATION_CENTER.x + (UPRIGHT_CONTENT.h + BODYGRAPH_PAD * 2) / 2)) < 0.02, 'rotated right edge');
  assert.ok(Math.abs((DREAM_VIEW_BOX.y + DREAM_VIEW_BOX.h) - (DREAM_ROTATION_CENTER.y + (UPRIGHT_CONTENT.w + BODYGRAPH_PAD * 2) / 2)) < 0.02, 'rotated bottom edge');
  assert.ok(Object.isFrozen(DREAM_ROTATION_CENTER));
});

test('the renderer contract carries the portal overrides and the rotation', () => {
  assert.equal(DREAM_TOPOLOGY.pathOverrides, DREAM_PORTAL_STUBS);
  for (const key of Object.keys(DREAM_TOPOLOGY.pathOverrides).map(Number)) {
    assert.ok(DREAM_PORTAL_GATES.includes(key), `pathOverrides key ${key} is not a dream portal`);
    assert.ok(DREAM_TOPOLOGY.pathGates.has(key), `pathOverrides key ${key} draws no path`);
  }
  // Every override is a portal, and the portals that need one are all present.
  assert.deepEqual(
    Object.keys(DREAM_TOPOLOGY.pathOverrides).map(Number).sort((a, b) => a - b),
    [12, 19]
  );
});

test('DREAM_TOPOLOGY satisfies the renderBodygraph topology contract', () => {
  for (const key of ['id', 'viewBox', 'centerOrder', 'gates', 'pathGates', 'pathOverrides', 'rotate', 'rotateCenter']) {
    assert.ok(key in DREAM_TOPOLOGY, `topology is missing ${key}`);
  }
  assert.equal(DREAM_TOPOLOGY.id, 'dream');
  assert.equal(DREAM_TOPOLOGY.viewBox, DREAM_VIEW_BOX);
  assert.deepEqual([...DREAM_TOPOLOGY.centerOrder], [...DREAM_CENTER_ORDER]);
  assert.deepEqual([...DREAM_CENTER_ORDER], ['Throat', 'G', 'Spleen', 'Sacral', 'Root']);
  assert.ok(DREAM_TOPOLOGY.gates instanceof Set, 'topology.gates must be a Set');
  assert.ok(DREAM_TOPOLOGY.pathGates instanceof Set, 'topology.pathGates must be a Set');
  assert.deepEqual([...DREAM_TOPOLOGY.gates].sort((a, b) => a - b), EXPECTED_DREAM_GATES);
  for (const shapeKey of DREAM_TOPOLOGY.centerOrder) {
    assert.ok(CENTER_SHAPES[shapeKey], `CENTER_SHAPES has no geometry for ${shapeKey}`);
    assert.equal(typeof CENTER_SHAPES[shapeKey].path, 'string', shapeKey);
    assert.ok(CENTER_SHAPES[shapeKey].center, `${shapeKey} has no anchor point`);
  }
  // The reduced topology narrows geometry only: every drawn path gate is a drawn gate.
  for (const gate of DREAM_TOPOLOGY.pathGates) assert.equal(DREAM_TOPOLOGY.gates.has(gate), true, `gate ${gate}`);
  assert.ok(Object.isFrozen(DREAM_TOPOLOGY));
});
