# eventdim

A mobile-first design toy that frames an event image as a phone ticket screen. Think emulator, not counterfeit: it recreates the *look* of a ticket screen, and every render says it isn't a ticket.

- **Image in:** paste (Ctrl/⌘+V or the Paste button), drag and drop, or choose a file.
- **Details:** title, date & time, venue, ticket type, and 1–4 tickets per order (swipe or use the arrows).
- **Out:** a white, mobile ticket page: the image as a banner framing the top of the ticket card, with the purple eventdim mark in the top bar and in the middle of the QR code.
- **Top bar:** Search, Menu, and Profile are placeholders for now; tapping one shows a "not hooked up yet" toast.
- **Not a ticket:** the QR is a real, scannable code, but it only says `NOT A TICKET - eventdim demo <render id> <n>/<total>`. A small "eventdim sample · not valid for entry" line sits under the ticket, and a disclaimer runs at the bottom of the page.
- **Private:** images are downscaled in the browser and saved only to `localStorage` on your device. Nothing is uploaded.

## Files

| File | What it does |
| --- | --- |
| `index.html` | Markup, SVG sprite (logo mark and icons), editor and ticket views, disclaimer |
| `styles.css` | Design tokens (light only), layout, ticket card |
| `app.js` | Image input, form state, QR rendering, `#ticket` routing, persistence |
| `assets/mark.svg` | Favicon |

The QR encoder ([qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator), MIT) loads from jsDelivr. If that fails, the page draws a decorative pattern instead.

## Run locally

```powershell
python -m http.server 8765
```

Then open http://localhost:8765.

## Publish on GitHub Pages

1. Push to `main`.
2. On GitHub, open the repo's **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, select `main` and `/ (root)`, and click **Save**.
4. The site goes live at `https://<username>.github.io/eventdim/` within a minute or two.

## Disclaimer

eventdim is not affiliated with any ticketing service, venue, or event organizer, and its renders aren't valid for entry anywhere. Don't use it to get into events or to misrepresent ticket ownership. Event images belong to their owners.
