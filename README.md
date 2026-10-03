# Ritika Kulkarni — Portfolio

Multi-page portfolio for Ritika Kulkarni (Platform Engineer – AUTOSAR Classic BSW),
built as a dependency-free static site: hand-written HTML, one stylesheet, and one script.
Visual system mirrored from [iamsudeep.in](https://iamsudeep.in/).

## Pages

| File | Contents |
| --- | --- |
| `index.html` | Hero, stack console, impact metrics, section links |
| `about.html` | Approach, four engineering principles, core strengths |
| `projects.html` | Five GitHub tooling projects with discipline filters |
| `experience.html` | Bosch timeline, skill groups, education & certifications |
| `contact.html` | Client-side compose form, contact details |

## Local preview

```bash
python3 -m http.server 4321 --bind 127.0.0.1
# open http://127.0.0.1:4321/
```

## Deploy to GitHub Pages

Profile: [github.com/ritika-kulkarni](https://github.com/ritika-kulkarni)

Live site (Vercel): https://ritika-kulkarni-portfolio.vercel.app

## Notes

- Public résumé contact details are intentionally visible.
- The contact form has no backend: it composes a `mailto:` link in the visitor's mail client.
- Portrait uses an RK monogram SVG; swap `assets/portrait.svg` for a photo when available.
