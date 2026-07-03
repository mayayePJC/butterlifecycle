---
name: Lyrical Divergence
colors:
  surface: '#fcf9f2'
  surface-dim: '#dcdad3'
  surface-bright: '#fcf9f2'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3ec'
  surface-container: '#f1eee7'
  surface-container-high: '#ebe8e1'
  surface-container-highest: '#e5e2db'
  on-surface: '#1c1c18'
  on-surface-variant: '#444844'
  inverse-surface: '#31312c'
  inverse-on-surface: '#f3f0e9'
  outline: '#747873'
  outline-variant: '#c4c7c2'
  surface-tint: '#596059'
  primary: '#181f19'
  on-primary: '#ffffff'
  primary-container: '#2d342e'
  on-primary-container: '#959c94'
  inverse-primary: '#c1c8c0'
  secondary: '#695d4a'
  on-secondary: '#ffffff'
  secondary-container: '#f2e0c8'
  on-secondary-container: '#6f6350'
  tertiary: '#0f2116'
  on-tertiary: '#ffffff'
  tertiary-container: '#24362b'
  on-tertiary-container: '#8b9f90'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dde4db'
  primary-fixed-dim: '#c1c8c0'
  on-primary-fixed: '#161d18'
  on-primary-fixed-variant: '#414942'
  secondary-fixed: '#f2e0c8'
  secondary-fixed-dim: '#d5c4ad'
  on-secondary-fixed: '#231a0c'
  on-secondary-fixed-variant: '#504534'
  tertiary-fixed: '#d2e8d7'
  tertiary-fixed-dim: '#b7ccbc'
  on-tertiary-fixed: '#0d1f15'
  on-tertiary-fixed-variant: '#384b3f'
  background: '#fcf9f2'
  on-background: '#1c1c18'
  surface-variant: '#e5e2db'
  ink-black: '#1A1C1A'
  parchment: '#F4F1EA'
  moss-dim: '#4A5D50'
  withered-gold: '#8C7E6A'
  shadow-gray: '#D1CEC7'
  blood-ox: '#6B2D2D'
typography:
  narrative-title:
    fontFamily: Noto Serif
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: 0.05em
  narrative-body:
    fontFamily: Source Serif 4
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 32px
    letterSpacing: 0.01em
  inner-monologue:
    fontFamily: Source Serif 4
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 28px
  ui-label-lg:
    fontFamily: Work Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: 0.02em
  ui-label-sm:
    fontFamily: Work Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  status-number:
    fontFamily: Work Sans
    fontSize: 20px
    fontWeight: '300'
    lineHeight: 24px
  narrative-body-mobile:
    fontFamily: Source Serif 4
    fontSize: 17px
    fontWeight: '400'
    lineHeight: 30px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  page-margin: 2rem
  section-gap: 3rem
  element-gap: 1rem
  line-length-max: 65ch
  gutter: 1.5rem
---

## Brand & Style

The brand personality is **philosophical, immersive, and melancholic**, capturing the quiet gravity of life's "small deviations." It targets a contemplative audience looking for narrative depth rather than gamified dopamine hits. The UI must feel like a **modern digital manuscript**—breathable, deliberate, and high-fidelity.

### Design Style: Wabi-Sabi Minimalism
We employ a mix of **Minimalism** and **Tactile/Skeuomorphic** elements to create a "Turtle Soup" (lateral thinking puzzle) atmosphere. 
- **Spaciousness:** Generous whitespace (and "ink-space") to allow the weight of the text to settle.
- **Texture:** Subtle organic grain, parchment-like backgrounds, and ink-wash gradients that prevent the UI from feeling "clinical."
- **Atmospheric Depth:** Using soft blurs and muted layers to suggest a world that exists beyond the immediate text, evoking a sense of mystery and introspection.
- **Grounding:** While the narrative may veer into the surreal, the UI remains structured and reliable, grounding the user in the role of the observer/shaper.

## Colors

The palette is rooted in **Wabi-Sabi principles**: muted, earthy, and organic. It avoids pure blacks and whites to reduce eye strain during long reading sessions.

- **Primary (#2D342E):** A deep, "Evergreen Charcoal" used for primary text and core UI structural elements. It provides high contrast against parchment without the harshness of pure black.
- **Secondary (#8C7E6A):** "Withered Gold," used for secondary information, hints, and decorative flourishes that suggest age and wisdom.
- **Tertiary (#4A5D50):** "Moss Dim," used for interactive elements and signifying growth or "character momentum."
- **Neutral (#F4F1EA):** "Parchment," the foundation of the design. It provides a warm, paper-like surface that feels physical rather than digital.

**Named Colors:**
- `blood-ox`: Reserved for moments of high tension, ethical breaches, or significant "Reality Stress."
- `ink-black`: Used sparingly for the most "grounded" or heavy narrative headers.

## Typography

Typography is the heart of this system. We prioritize **Serif fonts** for all narrative content to evoke a literary feel, switching to **Sans-Serifs** only for functional UI labels to provide clarity and modern precision.

- **Narrative Hierarchy:** Uses `notoSerif` for its elegant Chinese and Latin character support. Headlines should feel like chapter titles—spaced and authoritative.
- **Body Text:** `sourceSerif4` is chosen for its exceptional readability at long lengths. Line height is intentionally generous (1.8x) to create a relaxed reading rhythm.
- **UI Elements:** Labels, buttons, and status indicators use `workSans` to distinguish "System" from "Story."
- **Chinese Character Considerations:** Ensure all serif fonts are paired with high-quality Mingti/Songti fallbacks (e.g., "Source Han Serif") for the narrative text to maintain the "ink-on-paper" aesthetic.

## Layout & Spacing

The layout follows a **Fixed-Width Content approach** within a fluid container. This ensures that narrative text never stretches too wide, maintaining an optimal "reading line length" of approximately 60–70 characters.

- **Vertical Rhythm:** A strict 8px grid governs spacing, but larger "emotional gaps" (48px+) are used between the story text and the user's choices to signify a moment of reflection.
- **Breakpoints:**
  - **Mobile (WeChat Mini-Program):** Centered single-column layout. 32px side margins. Cards are full-width or slightly inset.
  - **Tablet:** Increased margins (15% side padding). Content remains centered to maintain the book-like feel.
- **Atmospheric Margins:** We use "Safe Areas" not just for hardware, but for visual silence. The top 15% of the screen should remain relatively empty, reserved for subtle environmental gradients or weather effects (ink-wash mist).

## Elevation & Depth

Hierarchy is achieved through **Tonal Layers** and **Subtle Shadows** rather than aggressive elevation. 

- **Surface Levels:** 
  - **Base Layer:** The "Parchment" background. 
  - **Narrative Layer:** Cards or text blocks that sit slightly above the base with extremely soft, low-opacity (#2D342E at 5%) shadows with a large blur radius (20px+). 
  - **System Layer:** Overlays (like the character bottom sheet) use a **Backdrop Blur** (10px) to create a glass-like separation, suggesting the user is "looking through" the UI at the character's soul.
- **Ink-Wash Depth:** Depth is also conveyed through opacity. Older narrative segments fade slightly (70% opacity) as the user scrolls, while the current "beat" is at 100% opacity, drawing focus to the present.

## Shapes

The shape language is **Soft and Organic**. We avoid sharp, aggressive corners to keep the tone gentle and philosophical. 

- **Soft Edges:** A base radius of `0.25rem` (4px) is used for buttons and input fields to give them a refined, hand-clipped feel.
- **Narrative Cards:** Larger containers use `rounded-lg` (8px) to feel like separate "pages" or "cards of fate."
- **Status Indicators:** Elements like "Deviation" bars or "Self" indicators use organic, slightly irregular pill shapes rather than perfect geometric circles, mimicking ink drops or stones.

## Components

### Narrative Cards
The primary vehicle for the story. Cards should have no visible border, using only a subtle shift in background color (slightly darker parchment) and a soft shadow to define their boundaries. 

### Choices (Action Buttons)
- **Standard Choice:** Ghost-style buttons with a thin `secondary` color border and `primary` text.
- **Custom Input:** A minimalist underline field that expands when focused, removing all "app-like" container boxing.
- **"到此为止" (End Narrative):** A low-priority text link, styled with `withered-gold` and italicized, placed at the very bottom to avoid accidental clicks.

### Character Status (The "Hidden Tray")
A bottom-sheet component that uses **Glassmorphism**. It displays the "Six Selves" using abstract icons and soft-colored progress bars that look like watercolor strokes.

### Chips (Identity/Traits)
Small, pill-shaped tags with `moss-dim` backgrounds and `parchment` text. These represent "Inertia" and "Desire," appearing as fixed labels that define the character's essence.

### Transitions
All component appearances should use "Fade-and-Slide-Up" motions (duration: 400ms, easing: cubic-bezier(0.4, 0, 0.2, 1)) to mimic the turning of a page or the unfolding of a thought.