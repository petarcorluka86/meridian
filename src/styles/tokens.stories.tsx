import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Grid, Note, Section, Spec, Specs, Doc, Swatch, useRootTokens } from '@/stories/Showcase';

/**
 * The foundations, read back out of the live stylesheet rather than listed by
 * hand — so a token added to `tokens.css` and forgotten here cannot hide. What
 * no story groups shows up under Coverage.
 *
 * The scales are closed. Nine type levels, seven spacing steps, five radii, two
 * shadows, two control heights, four tones. A screen that needs a tenth of
 * anything is a change to `tokens.css` and to a primitive, deliberately.
 */
const meta = {
  title: 'Foundations/Tokens',
  parameters: { layout: 'padded' },
} satisfies Meta;

export default meta;

const SURFACES = ['--bg', '--surface', '--surface-sunken', '--surface-muted', '--field'];
const LINES = ['--line', '--line-strong'];
const FOREGROUND = ['--fg-strong', '--fg', '--fg-muted', '--fg-faint', '--fg-inverted'];
const SELECTED = ['--selected', '--selected-fg'];
const ACCENT = [
  '--accent',
  '--accent-hover',
  '--accent-border',
  '--accent-bg',
  '--accent-ink',
  '--accent-ink-hover',
  '--accent-fg',
  '--accent-ring',
];
const TONES = [
  ['--danger', '--danger-bg', '--danger-border', '--danger-solid'],
  ['--warning', '--warning-bg', '--warning-border'],
  ['--success', '--success-bg', '--success-border'],
  ['--info', '--info-bg', '--info-border'],
];
const CATEGORY = /^--cat-/;
const SPACE = [
  '--space-1',
  '--space-2',
  '--space-3',
  '--space-4',
  '--space-5',
  '--space-6',
  '--space-7',
];
const RADIUS = [
  '--radius-xs',
  '--radius-inner',
  '--radius-control',
  '--radius-card',
  '--radius-pill',
];
const CONTROL = ['--control-md', '--control-sm'];
const TYPE = [
  '--type-display',
  '--type-title',
  '--type-heading',
  '--type-subheading',
  '--type-body',
  '--type-small',
  '--type-label',
  '--type-micro',
  '--type-mono',
  '--type-diff',
];
const TRACKING = ['--tracking-display', '--tracking-title', '--tracking-micro'];
const ELEVATION = ['--shadow-lift', '--shadow-dialog', '--scrim'];
const MISC = ['--sans', '--mono', '--icon', '--ring', '--transition', '--clear'];

function Swatches({ tokens, names }: { tokens: ReadonlyMap<string, string>; names: string[] }) {
  return (
    <Grid>
      {names.map((name) => (
        <Swatch key={name} name={name} value={tokens.get(name) ?? ''} />
      ))}
    </Grid>
  );
}

export const Colour: StoryObj = {
  name: 'Colour',
  render: () => {
    const tokens = useRootTokens();
    const categories = [...tokens.keys()].filter((name) => CATEGORY.test(name));
    return (
      <Doc>
        <Section
          title="Surfaces"
          note="The app sits on a paper ground, not on white. A card is white on top of it and a card header is a shade sunk into it — that is where the depth comes from, since almost nothing here casts a shadow."
        >
          <Swatches tokens={tokens} names={SURFACES} />
        </Section>
        <Section
          title="Lines"
          note="Two weights: inside a card, and around one. There used to be three, and no rule for which went where."
        >
          <Swatches tokens={tokens} names={LINES} />
        </Section>
        <Section
          title="Foreground"
          note="Four steps named by weight of voice rather than by lightness. A number is strong, a label is muted, a placeholder is faint."
        >
          <Swatches tokens={tokens} names={FOREGROUND} />
        </Section>
        <Section
          title="Selected"
          note="A selected filter inverts to near-black, not to the accent: a selection is a state, and the accent is reserved for the thing that acts."
        >
          <Swatches tokens={tokens} names={SELECTED} />
        </Section>
        <Section
          title="Accent"
          note="One blue, and it means interactive. Nothing decorative is this colour. Two of it in the dark: a blue dark enough to carry white text cannot be read as text itself, so the fill and the ink part company on a dark ground and are the same colour on paper."
        >
          <Swatches tokens={tokens} names={ACCENT} />
        </Section>
        <Section
          title="Tones"
          note="Four meanings, three roles each — the text colour, the tint behind it, the line around it. Every pill, banner, rail and toast in the app picks one of these four and never invents a fifth."
        >
          {TONES.map((tone) => (
            <Swatches key={tone[0]} tokens={tokens} names={tone} />
          ))}
        </Section>
        <Section
          title="Category palette"
          note="Six fixed labels rather than four meanings, so they get their own scale. Recolouring a category is one edit here, in the same file as every other colour decision."
        >
          <Swatches tokens={tokens} names={categories} />
        </Section>
      </Doc>
    );
  },
};

export const Space: StoryObj = {
  name: 'Space',
  render: () => {
    const tokens = useRootTokens();
    return (
      <Doc>
        <Section
          title="Seven steps on a 4px grid"
          note="Every gap, padding and margin in the app is one of these, picked by step number. There used to be seventeen gap values, which is the same as having none."
        >
          <Specs>
            {SPACE.map((name) => (
              <Spec key={name} label={`${name} · ${tokens.get(name) ?? ''}`}>
                <span
                  className="showcase-space"
                  style={{
                    display: 'inline-block',
                    width: `var(${name})`,
                    height: 'var(--space-5)',
                    background: 'var(--accent-bg)',
                    borderLeft: '1px solid var(--accent-border)',
                    borderRight: '1px solid var(--accent-border)',
                  }}
                />
              </Spec>
            ))}
          </Specs>
        </Section>
        <Section
          title="Control heights"
          note="A button, a select and a chip standing in a row line up without anybody nudging padding, because they take their height from these two rather than from whatever their text needed."
        >
          <Specs>
            {CONTROL.map((name) => (
              <Spec key={name} label={`${name} · ${tokens.get(name) ?? ''}`}>
                <span
                  style={{
                    display: 'inline-block',
                    width: 'var(--space-7)',
                    height: `var(${name})`,
                    background: 'var(--surface)',
                    border: '1px solid var(--line-strong)',
                    borderRadius: 'var(--radius-control)',
                  }}
                />
              </Spec>
            ))}
          </Specs>
        </Section>
      </Doc>
    );
  },
};

export const Shape: StoryObj = {
  name: 'Shape and elevation',
  render: () => {
    const tokens = useRootTokens();
    return (
      <Doc>
        <Section
          title="Five radii, and that is all of them"
          note="A card, a control, something inside a control, a hairline detail, and a pill. Six further radii used to be written out as literals in the component modules; none survived."
        >
          <Specs>
            {RADIUS.map((name) => (
              <Spec key={name} label={`${name} · ${tokens.get(name) ?? ''}`}>
                <span
                  style={{
                    display: 'inline-block',
                    width: 'calc(var(--space-7) + var(--space-5))',
                    height: 'var(--space-6)',
                    background: 'var(--surface)',
                    border: '1px solid var(--line-strong)',
                    borderRadius: `var(${name})`,
                  }}
                />
              </Spec>
            ))}
          </Specs>
        </Section>
        <Section
          title="Two shadows"
          note="The first is almost nothing: a 1px hint under a control so it reads as raised off the card. The second belongs to the dialog alone. Depth otherwise comes from the sunken header and the line."
        >
          <Specs>
            {ELEVATION.map((name) => (
              <Spec key={name} label={`${name}\n${tokens.get(name) ?? ''}`}>
                <span
                  style={{
                    display: 'inline-block',
                    width: 'calc(var(--space-7) * 2)',
                    height: 'var(--space-6)',
                    background: name === '--scrim' ? `var(${name})` : 'var(--surface)',
                    border: '1px solid var(--line-strong)',
                    borderRadius: 'var(--radius-control)',
                    boxShadow: name === '--scrim' ? undefined : `var(${name})`,
                  }}
                />
              </Spec>
            ))}
          </Specs>
        </Section>
      </Doc>
    );
  },
};

export const TypeScale: StoryObj = {
  name: 'Type scale',
  render: () => {
    const tokens = useRootTokens();
    return (
      <Doc>
        <Section
          title="Nine levels, as whole font shorthands"
          note="A rule is font: var(--type-label), so it cannot get the line-height wrong. Tracking cannot live in the shorthand, so the three levels that need it have a companion token and Text pairs them — see Foundations / Type for the rendered scale."
        >
          <Specs>
            {TYPE.map((name) => (
              <Spec key={name} label={`${name}\n${tokens.get(name)?.split(',')[0] ?? ''}`}>
                <span style={{ font: `var(${name})`, color: 'var(--fg-strong)' }}>
                  The slow work
                </span>
              </Spec>
            ))}
          </Specs>
        </Section>
        <Section title="Tracking">
          <Specs>
            {TRACKING.map((name) => (
              <Spec key={name} label={`${name} · ${tokens.get(name) ?? ''}`}>
                <span
                  style={{
                    font: 'var(--type-heading)',
                    letterSpacing: `var(${name})`,
                    color: 'var(--fg-strong)',
                  }}
                >
                  Meridian
                </span>
              </Spec>
            ))}
          </Specs>
        </Section>
      </Doc>
    );
  },
};

export const Coverage: StoryObj = {
  name: 'Coverage',
  render: () => {
    const tokens = useRootTokens();
    const claimed = new Set([
      ...SURFACES,
      ...LINES,
      ...FOREGROUND,
      ...SELECTED,
      ...ACCENT,
      ...TONES.flat(),
      ...SPACE,
      ...RADIUS,
      ...CONTROL,
      ...TYPE,
      ...TRACKING,
      ...ELEVATION,
      ...MISC,
    ]);
    const ungrouped = [...tokens.keys()].filter(
      (name) => !claimed.has(name) && !CATEGORY.test(name),
    );
    return (
      <Doc>
        <Section
          title={`${tokens.size} tokens, and that is the whole system`}
          note="Read out of the live stylesheet rather than listed by hand, so a token added to tokens.css and forgotten here cannot hide — it lands below. There is no second layer: the alias file the unmigrated screens used is gone, along with the last of them."
        >
          {ungrouped.length === 0 ? (
            <Note>Every token is grouped by a story above.</Note>
          ) : (
            <Grid>
              {ungrouped.map((name) => (
                <Swatch key={name} name={name} value={tokens.get(name) ?? ''} />
              ))}
            </Grid>
          )}
        </Section>
      </Doc>
    );
  },
};
