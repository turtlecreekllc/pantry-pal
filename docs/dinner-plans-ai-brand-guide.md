# Dinner Plans AI — Brand Style Guide

> A comprehensive design system for Claude Code implementation

---

## Brand Overview

**Dinner Plans AI** is a friendly, approachable meal planning assistant that helps users organize their cooking journey. The brand personality is warm, helpful, and delightfully playful—like a cheerful sous chef who makes cooking feel fun rather than like a chore.

### Brand Personality
- **Friendly & Approachable**: Never intimidating, always welcoming
- **Playful & Warm**: Kawaii-inspired charm with substance
- **Helpful & Organized**: Efficient without being sterile
- **Encouraging**: Celebrates wins, supports through challenges

### Voice & Tone
- Conversational and warm, like chatting with a friend in the kitchen
- Uses cooking metaphors naturally ("Let's cook up a plan!")
- Celebrates small wins ("Nice! That's 3 meals planned 🎉")
- Encouraging when things go wrong ("No worries—let's remix that recipe!")

---

## Color Palette

### Primary Colors

```css
:root {
  /* Honey Gold — Primary brand color (the pot/mascot body) */
  --color-primary: #F5B84C;
  --color-primary-light: #FFD074;
  --color-primary-dark: #E5A23C;
  
  /* Warm Cream — Background, cards, surfaces */
  --color-cream: #FFF8F0;
  --color-cream-dark: #F5E6D8;
  
  /* Peach Blush — Secondary backgrounds, highlights */
  --color-peach: #F5D6B8;
  --color-peach-light: #FBE8D8;
}
```

### Accent Colors

```css
:root {
  /* Coral Red — Checkmarks, success states, CTAs */
  --color-coral: #E57373;
  --color-coral-light: #FFAB91;
  
  /* Chef White — Cards, clean surfaces, chef hat */
  --color-white: #FFFFFF;
  --color-off-white: #FEFEFE;
  
  /* Cocoa Brown — Text, outlines, borders */
  --color-brown: #3D2314;
  --color-brown-light: #5D4037;
  --color-brown-muted: #8D6E63;
}
```

### Semantic Colors

```css
:root {
  /* Success — Recipe saved, meal planned */
  --color-success: #81C784;
  --color-success-bg: #E8F5E9;
  
  /* Warning — Expiring ingredients, conflicts */
  --color-warning: #FFB74D;
  --color-warning-bg: #FFF3E0;
  
  /* Error — Validation, critical alerts */
  --color-error: #E57373;
  --color-error-bg: #FFEBEE;
  
  /* Info — Tips, suggestions */
  --color-info: #64B5F6;
  --color-info-bg: #E3F2FD;
}
```

### Color Usage Guidelines

| Element | Color | Variable |
|---------|-------|----------|
| App background | Warm Cream | `--color-cream` |
| Card backgrounds | White | `--color-white` |
| Primary buttons | Honey Gold | `--color-primary` |
| Primary text | Cocoa Brown | `--color-brown` |
| Secondary text | Muted Brown | `--color-brown-muted` |
| Active/Selected states | Coral Red | `--color-coral` |
| Borders & outlines | Cocoa Brown | `--color-brown` |
| Disabled elements | Peach (50% opacity) | `--color-peach` |

---

## Typography

### Font Stack

```css
:root {
  /* Primary — Friendly, rounded sans-serif */
  --font-primary: 'Nunito', 'SF Pro Rounded', system-ui, sans-serif;
  
  /* Display — For headlines, mascot speech */
  --font-display: 'Quicksand', 'Nunito', sans-serif;
  
  /* Mono — Recipe measurements, timers */
  --font-mono: 'JetBrains Mono', 'SF Mono', monospace;
}
```

### Type Scale

```css
:root {
  /* Mobile-first type scale */
  --text-xs: 0.75rem;     /* 12px — Captions, metadata */
  --text-sm: 0.875rem;    /* 14px — Secondary text, labels */
  --text-base: 1rem;      /* 16px — Body text */
  --text-lg: 1.125rem;    /* 18px — Emphasized body */
  --text-xl: 1.25rem;     /* 20px — Card titles */
  --text-2xl: 1.5rem;     /* 24px — Section headers */
  --text-3xl: 1.875rem;   /* 30px — Page titles */
  --text-4xl: 2.25rem;    /* 36px — Hero text */
  
  /* Line heights */
  --leading-tight: 1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.75;
  
  /* Font weights */
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;
}
```

### Typography Styles

```css
/* Headlines — Quicksand, bold, cocoa brown */
.headline-1 {
  font-family: var(--font-display);
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  color: var(--color-brown);
  line-height: var(--leading-tight);
}

/* Body — Nunito, normal weight */
.body-text {
  font-family: var(--font-primary);
  font-size: var(--text-base);
  font-weight: var(--font-normal);
  color: var(--color-brown);
  line-height: var(--leading-normal);
}

/* Labels — Nunito, medium, slightly smaller */
.label {
  font-family: var(--font-primary);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-brown-muted);
  letter-spacing: 0.01em;
}
```

---

## Spacing & Layout

### Spacing Scale

```css
:root {
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-5: 1.25rem;   /* 20px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */
  --space-10: 2.5rem;   /* 40px */
  --space-12: 3rem;     /* 48px */
  --space-16: 4rem;     /* 64px */
}
```

### Border Radius

Rounded, friendly corners inspired by the mascot's soft shapes:

```css
:root {
  --radius-sm: 8px;     /* Small elements, tags */
  --radius-md: 12px;    /* Buttons, inputs */
  --radius-lg: 16px;    /* Cards, modals */
  --radius-xl: 24px;    /* Large cards, sheets */
  --radius-full: 9999px; /* Pills, avatars */
}
```

### Container Widths

```css
:root {
  --container-sm: 640px;
  --container-md: 768px;
  --container-lg: 1024px;
  --max-content-width: 428px; /* Mobile-optimized */
}
```

---

## Shadows & Elevation

Soft, warm shadows that feel like the gentle drop shadow under the mascot:

```css
:root {
  /* Subtle lift — Cards at rest */
  --shadow-sm: 0 2px 8px rgba(61, 35, 20, 0.08);
  
  /* Medium lift — Hovered cards, buttons */
  --shadow-md: 0 4px 16px rgba(61, 35, 20, 0.12);
  
  /* High lift — Modals, floating elements */
  --shadow-lg: 0 8px 32px rgba(61, 35, 20, 0.16);
  
  /* Pressed/inset — Active buttons */
  --shadow-inset: inset 0 2px 4px rgba(61, 35, 20, 0.1);
}
```

---

## Component Styles

### Buttons

```css
/* Primary Button — Honey gold with brown text */
.btn-primary {
  background: var(--color-primary);
  color: var(--color-brown);
  font-family: var(--font-primary);
  font-weight: var(--font-semibold);
  font-size: var(--text-base);
  padding: var(--space-3) var(--space-6);
  border-radius: var(--radius-md);
  border: 2px solid var(--color-brown);
  box-shadow: var(--shadow-sm);
  transition: all 0.2s ease;
}

.btn-primary:hover {
  background: var(--color-primary-light);
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.btn-primary:active {
  background: var(--color-primary-dark);
  box-shadow: var(--shadow-inset);
  transform: translateY(0);
}

/* Secondary Button — White with brown outline */
.btn-secondary {
  background: var(--color-white);
  color: var(--color-brown);
  font-family: var(--font-primary);
  font-weight: var(--font-semibold);
  padding: var(--space-3) var(--space-6);
  border-radius: var(--radius-md);
  border: 2px solid var(--color-brown);
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  background: var(--color-cream);
}

/* Coral CTA — For primary actions */
.btn-cta {
  background: var(--color-coral);
  color: var(--color-white);
  font-weight: var(--font-bold);
  border: 2px solid var(--color-brown);
  border-radius: var(--radius-md);
  padding: var(--space-4) var(--space-8);
}
```

### Cards

```css
/* Standard Card */
.card {
  background: var(--color-white);
  border: 2px solid var(--color-brown);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  box-shadow: var(--shadow-sm);
}

/* Recipe Card — With image area */
.card-recipe {
  background: var(--color-white);
  border: 2px solid var(--color-brown);
  border-radius: var(--radius-xl);
  overflow: hidden;
  box-shadow: var(--shadow-md);
}

.card-recipe-image {
  width: 100%;
  aspect-ratio: 16/10;
  object-fit: cover;
}

.card-recipe-content {
  padding: var(--space-4);
}

/* Meal Day Card */
.card-meal-day {
  background: var(--color-peach-light);
  border: 2px solid var(--color-brown);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
}

.card-meal-day.today {
  background: var(--color-primary);
  border-width: 3px;
}
```

### Input Fields

```css
/* Text Input */
.input {
  background: var(--color-white);
  border: 2px solid var(--color-brown-muted);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  font-family: var(--font-primary);
  font-size: var(--text-base);
  color: var(--color-brown);
  transition: all 0.2s ease;
}

.input:focus {
  border-color: var(--color-primary);
  outline: none;
  box-shadow: 0 0 0 3px rgba(245, 184, 76, 0.3);
}

.input::placeholder {
  color: var(--color-brown-muted);
  opacity: 0.6;
}

/* Search Input — Rounded with icon */
.input-search {
  background: var(--color-cream);
  border: 2px solid transparent;
  border-radius: var(--radius-full);
  padding: var(--space-3) var(--space-4) var(--space-3) var(--space-10);
}

.input-search:focus {
  background: var(--color-white);
  border-color: var(--color-primary);
}
```

### Tags & Chips

```css
/* Tag — Small labels for categories, ingredients */
.tag {
  display: inline-flex;
  align-items: center;
  background: var(--color-peach);
  color: var(--color-brown);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  border: 1.5px solid var(--color-brown);
}

/* Chip — Selectable/removable */
.chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  background: var(--color-white);
  color: var(--color-brown);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-full);
  border: 2px solid var(--color-brown);
}

.chip.selected {
  background: var(--color-primary);
}
```

### Checkboxes & Radio Buttons

```css
/* Custom Checkbox — Matches mascot clipboard style */
.checkbox {
  width: 24px;
  height: 24px;
  background: var(--color-white);
  border: 2px solid var(--color-brown);
  border-radius: var(--radius-sm);
  position: relative;
}

.checkbox:checked {
  background: var(--color-cream);
}

.checkbox:checked::after {
  content: '✓';
  color: var(--color-coral);
  font-weight: bold;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
```

### Navigation

```css
/* Bottom Tab Bar */
.tab-bar {
  background: var(--color-white);
  border-top: 2px solid var(--color-brown);
  padding: var(--space-2) var(--space-4);
  padding-bottom: env(safe-area-inset-bottom);
}

.tab-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  color: var(--color-brown-muted);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
}

.tab-item.active {
  color: var(--color-brown);
}

.tab-item.active .tab-icon {
  background: var(--color-primary);
  border-radius: var(--radius-full);
  padding: var(--space-2);
}
```

---

## Iconography

### Icon Style Guidelines

Icons should match the mascot's aesthetic:
- **Stroke width**: 2px (matches mascot outline)
- **Style**: Rounded/friendly, not sharp
- **Color**: `--color-brown` for default, `--color-coral` for active
- **Size**: 24px standard, 20px compact, 32px featured

### Recommended Icon Libraries

1. **Lucide Icons** (preferred) — Consistent 2px stroke, rounded caps
2. **Phosphor Icons** — "Regular" weight
3. **Heroicons** — "Outline" variant

### Custom Icon Treatment

```css
.icon {
  stroke: var(--color-brown);
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  fill: none;
}

.icon-filled {
  fill: var(--color-primary);
  stroke: var(--color-brown);
}

.icon-active {
  stroke: var(--color-coral);
}
```

---

## Illustration & Mascot Usage

### Mascot Appearances

The pot mascot (name suggestion: **"Potsworth"** or **"Chef Pot"**) should appear:

| Context | Size | Expression |
|---------|------|------------|
| Empty states | Large (120-160px) | Encouraging, waving |
| Success moments | Medium (80px) | Celebrating, sparkles |
| Loading states | Small (48px) | Stirring animation |
| Error states | Medium (80px) | Sympathetic, suggesting help |
| Onboarding | Large | Teaching, pointing |

### Mascot Don'ts
- ❌ Don't stretch or distort proportions
- ❌ Don't change the mascot's colors
- ❌ Don't add drop shadows beyond the original style
- ❌ Don't remove the outline stroke
- ❌ Don't use on busy/clashing backgrounds

### Empty State Pattern

```jsx
// Example empty state component structure
<EmptyState>
  <MascotIllustration variant="encouraging" size="large" />
  <Headline>No meals planned yet!</Headline>
  <Body>Let's cook up your first dinner plan together.</Body>
  <Button variant="primary">Start Planning</Button>
</EmptyState>
```

---

## Motion & Animation

### Timing & Easing

```css
:root {
  /* Durations */
  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --duration-slow: 400ms;
  
  /* Easings — Bouncy, playful feel */
  --ease-out: cubic-bezier(0.33, 1, 0.68, 1);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  --ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

### Interaction Animations

```css
/* Button press — Subtle squish */
.btn:active {
  transform: scale(0.97);
  transition: transform var(--duration-fast) var(--ease-out);
}

/* Card hover — Gentle lift */
.card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  transition: all var(--duration-normal) var(--ease-out);
}

/* Checkbox check — Bouncy pop */
.checkbox:checked::after {
  animation: checkPop var(--duration-normal) var(--ease-bounce);
}

@keyframes checkPop {
  0% { transform: translate(-50%, -50%) scale(0); }
  50% { transform: translate(-50%, -50%) scale(1.2); }
  100% { transform: translate(-50%, -50%) scale(1); }
}
```

### Loading States

```css
/* Mascot stirring animation */
@keyframes stir {
  0%, 100% { transform: rotate(-15deg); }
  50% { transform: rotate(15deg); }
}

.mascot-loading {
  animation: stir 0.8s ease-in-out infinite;
}

/* Skeleton loading — Warm shimmer */
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.skeleton {
  background: linear-gradient(
    90deg,
    var(--color-cream) 25%,
    var(--color-peach-light) 50%,
    var(--color-cream) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
  border-radius: var(--radius-md);
}
```

---

## Dark Mode (Optional)

For future dark mode support, maintain warmth:

```css
[data-theme="dark"] {
  --color-cream: #2C2420;
  --color-cream-dark: #1E1816;
  --color-peach: #3D3028;
  --color-brown: #F5E6D8;
  --color-brown-light: #E8D4C4;
  --color-brown-muted: #A89080;
  --color-white: #2C2420;
  
  /* Keep accent colors vibrant */
  --color-primary: #F5B84C;
  --color-coral: #FF8A80;
}
```

---

## Accessibility

### Color Contrast
- All text meets WCAG AA standards (4.5:1 minimum)
- `--color-brown` on `--color-cream`: ~8.5:1 ✓
- `--color-brown` on `--color-primary`: ~5.2:1 ✓
- `--color-brown` on `--color-white`: ~10.5:1 ✓

### Touch Targets
- Minimum touch target: 44x44px
- Recommended button height: 48px
- Adequate spacing between tappable elements: 8px minimum

### Focus States
```css
*:focus-visible {
  outline: 3px solid var(--color-primary);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}
```

---

## Implementation Checklist for Claude Code

### Setup
- [ ] Install Nunito and Quicksand fonts from Google Fonts
- [ ] Configure CSS custom properties (variables) from this guide
- [ ] Set up Lucide Icons or Phosphor Icons
- [ ] Create base component styles (buttons, cards, inputs)

### Components to Build
- [ ] `Button` — Primary, secondary, CTA variants
- [ ] `Card` — Standard, recipe, meal-day variants
- [ ] `Input` — Text, search, textarea
- [ ] `Checkbox` / `Radio` — Custom styled
- [ ] `Tag` / `Chip` — For categories, ingredients
- [ ] `TabBar` — Bottom navigation
- [ ] `EmptyState` — With mascot illustration slot
- [ ] `Toast` — Success, warning, error variants
- [ ] `Modal` / `Sheet` — Bottom sheet preferred for mobile

### Patterns to Implement
- [ ] Loading skeletons with warm shimmer
- [ ] Pull-to-refresh with mascot animation
- [ ] Success celebrations (confetti or sparkles)
- [ ] Smooth page transitions
- [ ] Haptic feedback on key interactions (if native)

---

## Quick Reference: Tailwind Config

If using Tailwind CSS, extend with these values:

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        honey: {
          DEFAULT: '#F5B84C',
          light: '#FFD074',
          dark: '#E5A23C',
        },
        cream: {
          DEFAULT: '#FFF8F0',
          dark: '#F5E6D8',
        },
        peach: {
          DEFAULT: '#F5D6B8',
          light: '#FBE8D8',
        },
        coral: {
          DEFAULT: '#E57373',
          light: '#FFAB91',
        },
        cocoa: {
          DEFAULT: '#3D2314',
          light: '#5D4037',
          muted: '#8D6E63',
        },
      },
      fontFamily: {
        sans: ['Nunito', 'system-ui', 'sans-serif'],
        display: ['Quicksand', 'Nunito', 'sans-serif'],
      },
      borderRadius: {
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '24px',
      },
      boxShadow: {
        'soft': '0 2px 8px rgba(61, 35, 20, 0.08)',
        'medium': '0 4px 16px rgba(61, 35, 20, 0.12)',
        'lifted': '0 8px 32px rgba(61, 35, 20, 0.16)',
      },
    },
  },
};
```

---

*Last updated: December 2024*
*Version: 1.0*
