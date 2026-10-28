const CSS_NAMED_COLOURS = new Set(
  (
    'aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet ' +
    'brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan ' +
    'darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta ' +
    'darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue ' +
    'darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey ' +
    'dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray ' +
    'green greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender lavenderblush ' +
    'lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray ' +
    'lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray ' +
    'lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon ' +
    'mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue ' +
    'mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin ' +
    'navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen ' +
    'paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple ' +
    'rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna ' +
    'silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle ' +
    'tomato turquoise violet wheat white whitesmoke yellow yellowgreen transparent currentcolor'
  ).split(' '),
);

const HEX = '#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})';
const KEYWORD = '[a-zA-Z]+';
const FUNCTION = '(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix|light-dark|var)\\(.*\\)';
const UNSAFE = `[;{}<>\\\\"'\\t\\n\\r\\f\\v]|\\/\\*|\\*\\/|[uU][rR][lL]\\(`;
const SYS_COLOUR_REFERENCE = /--ohs-sys-color-([a-z][a-z0-9-]*)/g;

/**
 * The shape a brand pin must have: a hex value, a word, or a colour function such as `rgb()`,
 * `oklch()`, `color-mix()` or `var()`, with nothing that could end a declaration, open a comment or
 * load a resource (`; { } < > \ " '`, line breaks, `/*`, `*\/`, `url(`). Usable as a JSON Schema
 * `pattern`. {@link isThemeColourValue} also checks that a word is a CSS colour name.
 * @public
 */
export const THEME_COLOUR_PATTERN = new RegExp(
  `^(?!.*(?:${UNSAFE}))(?:${HEX}|${KEYWORD}|${FUNCTION})$`,
);

/**
 * Whether a value can be written as a brand pin: it matches {@link THEME_COLOUR_PATTERN}, and a
 * plain word is a CSS named colour, `transparent` or `currentcolor`, in any case.
 * @public
 */
export function isThemeColourValue(value: string): boolean {
  if (!THEME_COLOUR_PATTERN.test(value)) return false;
  return !/^[a-zA-Z]+$/.test(value) || CSS_NAMED_COLOURS.has(value.toLowerCase());
}

/** A brand pin that cannot resolve, by the colour role it pins. */
export interface ColourPinProblem {
  role: string;
  message: string;
}

function referencedRoles(value: string): string[] {
  return [...value.matchAll(SYS_COLOUR_REFERENCE)].map((match) => match[1]);
}

function cycleFrom(
  start: string,
  edges: ReadonlyMap<string, readonly string[]>,
): string[] | undefined {
  const walk = (role: string, path: readonly string[]): string[] | undefined => {
    for (const next of edges.get(role) ?? []) {
      if (next === start) return [...path, next];
      if (!path.includes(next)) {
        const found = walk(next, [...path, next]);
        if (found) return found;
      }
    }
    return undefined;
  };
  return walk(start, [start]);
}

/**
 * Pins in one scheme that refer back to their own role through `var(--ohs-sys-color-<role>)`,
 * directly or through other pins. Such a token is invalid when computed, so the control renders
 * with no colour. A reference to another role, as in `rgb(from var(--ohs-sys-color-primary) r g b
 * / 50%)` on `primary-hover`, is fine.
 * @public
 */
export function colourPinProblems(
  pins: Readonly<Partial<Record<string, string>>>,
): ColourPinProblem[] {
  const edges = new Map(
    Object.entries(pins).map(([role, value]) => [
      role,
      referencedRoles(value ?? '').filter(
        (target) => Object.hasOwn(pins, target) && pins[target] !== undefined,
      ),
    ]),
  );
  return [...edges.keys()].flatMap((role) => {
    const cycle = cycleFrom(role, edges);
    return cycle ? [{ role, message: `must not refer back to itself: ${cycle.join(' → ')}` }] : [];
  });
}
