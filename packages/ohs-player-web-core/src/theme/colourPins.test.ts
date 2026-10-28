import { describe, expect, it } from 'vitest';
import { colourPinProblems, isThemeColourValue, THEME_COLOUR_PATTERN } from './colourPins';

describe('isThemeColourValue', () => {
  it.each([
    '#094F9A',
    '#fff',
    '#094F9A80',
    'rgb(9 79 154 / 50%)',
    'oklch(62% 0.12 250)',
    'color-mix(in srgb, #094F9A 60%, white)',
    'var(--ohs-ref-palette-primary40)',
    'rgb(from var(--ohs-sys-color-primary) r g b / 50%)',
    'teal',
    'RebeccaPurple',
    'transparent',
    'currentColor',
  ])('accepts %s', (value) => {
    expect(isThemeColourValue(value)).toBe(true);
  });

  it.each([
    'banana',
    'inherit',
    'initial',
    '#12345',
    '#fff; } body { display: none } :root {',
    'url(https://tracker.example/p.png)',
    'var(--missing, image-set("https://tracker.example/p.png" 1x))',
    'rgb(/*)',
    'var(--ohs-ref-palette-primary40, */)',
    'rgb(0 0 0)\n}',
    '',
  ])('rejects %j', (value) => {
    expect(isThemeColourValue(value)).toBe(false);
  });

  it('leaves the name check to the function, so the pattern stays a plain JSON Schema pattern', () => {
    expect(THEME_COLOUR_PATTERN.test('banana')).toBe(true);
    expect(THEME_COLOUR_PATTERN.flags).toBe('');
  });
});

describe('colourPinProblems', () => {
  it('finds nothing for plain values and references to other roles', () => {
    expect(
      colourPinProblems({
        primary: '#094F9A',
        'primary-hover': 'rgb(from var(--ohs-sys-color-primary) r g b / 90%)',
        'on-primary': 'var(--ohs-sys-color-surface)',
      }),
    ).toEqual([]);
  });

  it('flags a pin that refers to its own role', () => {
    expect(colourPinProblems({ primary: 'var(--ohs-sys-color-primary)' })).toEqual([
      { role: 'primary', message: 'must not refer back to itself: primary → primary' },
    ]);
  });

  it('flags every pin on a loop between roles', () => {
    expect(
      colourPinProblems({
        primary: 'var(--ohs-sys-color-secondary)',
        secondary: 'color-mix(in srgb, var(--ohs-sys-color-tertiary) 50%, white)',
        tertiary: 'var(--ohs-sys-color-primary)',
        error: 'var(--ohs-sys-color-primary)',
      }),
    ).toEqual([
      {
        role: 'primary',
        message: 'must not refer back to itself: primary → secondary → tertiary → primary',
      },
      {
        role: 'secondary',
        message: 'must not refer back to itself: secondary → tertiary → primary → secondary',
      },
      {
        role: 'tertiary',
        message: 'must not refer back to itself: tertiary → primary → secondary → tertiary',
      },
    ]);
  });

  it('ignores a reference to a role the scheme does not pin, and property names on Object', () => {
    expect(
      colourPinProblems({
        primary: 'var(--ohs-sys-color-secondary)',
        error: 'var(--ohs-sys-color-constructor)',
      }),
    ).toEqual([]);
  });
});
