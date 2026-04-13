# Design System Specification: Urban Velocity

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Kinetic Editorial."** 

We are moving away from the static, boxy layouts of traditional tech and toward a high-motion, editorial experience that mirrors the energy of a sprawling metropolis. This system interprets the classic high-contrast "taxi" palette not as a utility, but as a premium signature. By utilizing extreme roundedness (16px+), expansive white space, and intentional asymmetry, we create a digital environment that feels fast, authoritative, and bespoke. We break the "template" look by treating the screen as a canvas of layered surfaces rather than a grid of containers.

---

## 2. Colors & Tonal Logic
Our palette is anchored by the high-visibility `primary_container` (#ffc800) and the authoritative depth of `on_background` (#1c1b1b).

*   **The "No-Line" Rule:** To achieve a high-end editorial feel, designers are **prohibited** from using 1px solid borders to define sections or containers. Boundaries must be established through color shifts. For example, a `surface_container_low` (#f6f3f2) section should sit against a `surface` (#fcf9f8) background to create a sophisticated, borderless transition.
*   **Surface Hierarchy & Nesting:** Treat the UI as a physical stack of premium materials. Use `surface_container_lowest` (#ffffff) for the most elevated interactive elements (like cards) and `surface_container_high` (#eae7e7) for recessed areas or background accents. This "tonal nesting" replaces the need for structural lines.
*   **The "Glass & Gradient" Rule:** Floating navigation or modal overlays should utilize Glassmorphism. Use a semi-transparent `surface` color with a `backdrop-filter: blur(20px)`. 
*   **Signature Textures:** For hero sections or high-impact CTAs, use a subtle linear gradient from `primary` (#755b00) to `primary_container` (#ffc800) at a 135-degree angle. This adds a "metallic" luster that prevents the yellow from looking flat or "toy-like."

---

## 3. Typography
We pair the geometric authority of **Montserrat** (for Headlines) with the high-legibility precision of **Inter** (for Body and UI).

*   **Display & Headlines:** Use `display-lg` (3.5rem) with tight letter-spacing (-0.02em) to create an editorial "impact" zone. The high contrast between the deep charcoal text and white backgrounds communicates professionalism.
*   **The Title Tier:** `title-lg` (1.375rem) serves as the primary gateway to content blocks. It should feel airy and never crowded.
*   **Body & Labels:** `body-lg` (1rem) is our workhorse. Ensure a line height of at least 1.6 for body text to maintain the "Editorial" breathing room. Use `label-md` in all-caps with increased letter-spacing (0.05em) when used on `primary_container` backgrounds for a "utility-chic" look.

---

## 4. Elevation & Depth
In this system, depth is a product of light and layering, not artificial outlines.

*   **The Layering Principle:** Stacking is our primary tool for hierarchy. A `surface_container_lowest` (#ffffff) card placed on a `surface_container_low` (#f6f3f2) background provides a soft, natural lift.
*   **Ambient Shadows:** When an element must "float" (like a FAB or a sticky header), use an Ambient Shadow. This is an extra-diffused shadow: `box-shadow: 0 20px 40px rgba(28, 27, 27, 0.06)`. The shadow color is a tinted version of our charcoal, never pure black, to simulate natural environmental light.
*   **The "Ghost Border" Fallback:** If a layout requires a container to stand out on a white background, use a "Ghost Border." Apply the `outline_variant` (#d2c5ab) at **15% opacity**. This creates a suggestion of a container without breaking the seamless aesthetic.
*   **Roundedness:** Adhere strictly to the `xl` (1.5rem/24px) radius for all major containers and `full` (9999px) for buttons. This extreme softness contrasts with the "sharp" high-contrast colors, creating a "Tech-Humanist" balance.

---

## 5. Components

### Buttons
*   **Primary:** `primary_container` (#ffc800) background with `on_primary_container` (#6e5500) text. Shape: `full` (Pill). 
*   **Secondary:** `secondary_container` (#e2dfde) background. These should feel "recessed" compared to the primary action.
*   **Tertiary:** No background. Use `primary` (#755b00) text with a bold weight.

### Input Fields
*   **Styling:** Use `surface_container_highest` (#e5e2e1) as a solid background fill with a `xl` corner radius. 
*   **Focus State:** Transition the background to `surface_container_lowest` and add a 2px `primary` ghost border (20% opacity). Forgo the traditional high-contrast focus ring.

### Cards & Lists
*   **The "No-Divider" Rule:** Explicitly forbid horizontal divider lines. Separate list items using the spacing scale (e.g., `spacing.4` or `1rem`) and subtle background alternates if necessary.
*   **Cards:** Always use `surface_container_lowest` (#ffffff). Padding should be generous, never dropping below `spacing.6` (1.5rem).

### Selection (Chips, Checkboxes, Radios)
*   **Chips:** Use `secondary_fixed` (#e5e2e1) for unselected states. Selected states should pop with `primary_container`.
*   **Checkboxes/Radios:** These should be oversized (24px) to match the `xl` roundedness of the system. Use `primary` for the "checked" state to ensure high visibility against white backgrounds.

---

## 6. Do's and Don'ts

### Do:
*   **Do** use asymmetrical layouts. Let a headline hang off the left margin while the body text is tucked into a container on the right.
*   **Do** use the `16` (4rem) spacing token to create massive "breathing zones" between unrelated content sections.
*   **Do** utilize "primary container" as a background for entire sections (e.g., a yellow footer) to break the monotony of white.

### Don't:
*   **Don't** use 1px black or grey borders. This is the quickest way to make this high-end system look like a generic template.
*   **Don't** use "Drop Shadows" with high opacity or small blur radii. It destroys the "Editorial" sophistication.
*   **Don't** crowd the yellow. The `primary_container` color is energetic; it needs significant white space around it to remain "Professional" and avoid becoming visually exhausting.
*   **Don't** use Inter for Display sizes if Montserrat is available; Inter is for reading, Montserrat is for "The Kinetic Editorial" statement.