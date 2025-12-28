# Cameron Ely-Murdock Website Specification

## Overview
A cinematic, editorial-style personal website focusing on systems design and social infrastructure. The aesthetic is high-end, timeless, and organic—resembling an architectural portfolio or premium magazine.

## File Structure

```
/
├── CNAME                    # Domain configuration for GitHub Pages
├── README.md               # Repository documentation
├── spec.md                 # This specification file
├── index.html              # Homepage (Editorial overview)
├── rivr-social.html        # Flagship platform detail page
├── work.html               # Systems architecture services
├── thinking.html           # Philosophical frameworks
├── writing.html            # Essays and media
├── about.html              # Biography and background
├── contact.html            # Contact interface
└── style.css               # Global cinematic design system
```

## Design System

### Color Palette
- **Background:** `#080808` (Deep Charcoal/Soft Black)
- **Text Primary:** `#e0e0e0` (Soft White)
- **Text Secondary:** `#9ca3af` (Muted Grey)
- **Accent/Interaction:** `#ffffff` (Pure White)
- **Dividers:** `rgba(255,255,255,0.1)` (Subtle glass lines)

### Typography
- **Headlines (Display):** `Cormorant Garamond` (Serif)
  - Styles: Italic, Regular, 300/400/600 weights
  - Size: Massive scale (clamp 4rem - 9rem)
- **Body/UI:** `Manrope` (Sans-Serif)
  - Usage: Navigation, body text, meta tags
  - Size: 18px base

### Visual Language
- **Editorial Grids:** Asymmetrical layouts with wide negative space (typically 1fr 1fr split).
- **No Boxes:** Content floats freely without borders or card containers.
- **Lines:** Thin, subtle horizontal dividers separate major sections.
- **Imagery:** Currently text-heavy; designed to support high-contrast black & white photography.

---

## Page-by-Page Specification

### 1. Homepage (`index.html`)
- **Hero:** "And So It Is..." (Garamond Italic). Subtitle: "Systems Designer".
- **Mission:** Split grid. Left: "The Mission". Right: Narrative about broken coordination systems.
- **Selected Focus:** A list of 3 key areas (Rivr, Systems Design, The Thesis) using the `.work-item` component.
- **Footer:** Simple editorial footprint with email and GitHub links.

### 2. Rivr.Social (`rivr-social.html`)
- **Hero:** "Rivr.Social". Subtitle: "Infrastructure".
- **Concept:** Split grid explaining "Use, not feeds."
- **Principles:** A 4-column grid listing core tenets:
  - Local Sovereignty
  - Human Scale
  - Interoperability
  - Durability

### 3. Work (`work.html`)
- **Hero:** "System Architecture". Subtitle: "Services".
- **Approach:** Narrative on "viability with integrity."
- **Services List:** Numbered list (01-03) using `.work-item`:
  - Platform Design
  - Ontology
  - Economics

### 4. Thinking (`thinking.html`)
- **Hero:** "The Problem Space". Subtitle: "Frameworks".
- **Perspectives:** A vertical flow of core ideas:
  - Infrastructure vs Media
  - Respect Place
  - Repair Over Disruption

### 5. Writing (`writing.html`)
- **Hero:** "Ideas Under Pressure". Subtitle: "Media".
- **Content:** A list of content types (Essay, Talk, Podcast) using `.work-item` components. Currently placeholders for future content.

### 6. About (`about.html`)
- **Hero:** "The Builder". Subtitle: "Bio".
- **Narrative:** First-person background summary (Community organizing -> Systems design).
- **Quote:** "Systems shape behavior..."

### 7. Contact (`contact.html`)
- **Hero:** "Open Channels". Subtitle: "Connect".
- **Content:** Direct email link and location (Boulder, CO).
- **Tone:** "Serious collaborations that center the digital commons."

---

## Technical Components

### Navigation (`nav`)
- **Position:** Fixed top, full width.
- **Background:** Gradient fade (Black -> Transparent).
- **Items:** Rivr.Social, Work, Thinking, Writing, Contact.
- **Logo:** "Cameron Ely-Murdock" (Garamond Italic).

### The `.work-item` Component
Used for lists of services, articles, or projects.
- **Structure:** `Flex` or `Grid` row.
- **Meta:** Small sans-serif tag (e.g., "01", "Essay").
- **Title:** Large serif text.
- **Description:** Small sans-serif description below title.
- **Interaction:** Entire row is clickable; border brightens on hover.

### Responsive Behavior
- **Desktop (>900px):** 2-column editorial grids.
- **Mobile (<900px):**
  - Navigation menu hides (logo only).
  - Grids stack vertically.
  - Headlines scale down (15vw).
  - Padding reduces.

---

## Maintenance
- **Adding Content:** Duplicate the `.work-item` HTML block in the relevant section.
- **Images:** The design currently relies on typography and negative space. Images can be added within the "Right Column" of any `.editorial-grid`.
