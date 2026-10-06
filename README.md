<div align="center">

<img src="LOGOPMTG-cropped.png" alt="Politeknik Malaysia METrO Tasek Gelugor" height="90">

# PMTG Attendance System

**QR-based, location-verified attendance for events at Politeknik METrO Tasek Gelugor**

Built for **Hari Sukan Negara PMTG 2026**

[Live check-in page](https://ermxxn.github.io/PMTG_Attendance_System/checkin.html) · [QR display](https://ermxxn.github.io/PMTG_Attendance_System/display.html) · [Admin](https://ermxxn.github.io/PMTG_Attendance_System/admin.html)

</div>

---

## About

PMTG Attendance System replaces paper sign-in sheets at campus events. Students scan a QR code shown on a screen, fill in their details on their own phone, and their attendance is recorded, but only if they are physically at the venue. Organisers manage events, venues and attendance records from a PIN-protected admin dashboard and export the results as a PDF.

This project was designed and developed by **Ermaan Singh** ([@Ermxxn](https://github.com/Ermxxn)) for **Politeknik METrO Tasek Gelugor (PMTG)**.

## Features

**For students (`checkin.html`)**
- Mobile-first, fully responsive check-in form for phones, tablets and desktops
- Bilingual interface (Bahasa Malaysia and English)
- GPS location check against the event venue (geofence)
- Clear bilingual error messages and a confirmation screen that works as proof of attendance
- Automatic detection of whichever event is currently live

**For the projector or screen (`display.html`)**
- Large, always-visible QR code that never changes, so the same code works for every event
- Shows which event is currently live

**For organisers (`admin.html`)**
- PIN-protected dashboard with rate limiting (5 wrong attempts locks the IP for 15 minutes)
- Create events and switch which one is live; new events inherit the previous venue
- Interactive map (Leaflet and OpenStreetMap) to place the venue pin and set the geofence radius, with place search, a satellite view and "use my current location"
- Live attendance list with search, manual add and per-record delete
- Event history with the ability to view, export or delete past events
- One-click PDF export with the PMTG logo and a choice of sort order
- Responsive layout: sidebar on desktop, top tabs on tablet and bottom bar on phone, with tables that turn into cards on small screens

## How it works

```
Student phone ──scan QR──▶ checkin.html ──▶ Supabase Edge Function: check-in
                                  │                  (verifies GPS is inside the geofence,
                                  │                   blocks duplicate matric numbers)
                                  └──▶ super-responder (finds the live event)

Organiser ──PIN──▶ admin.html ──▶ Supabase Edge Function: admin
                                   (events, venue, attendance, history)
```

- The QR code always points to `checkin.html`. That page asks the backend which event is live, so no new QR code is needed per event.
- All sensitive logic (PIN check, geofence check, writes and deletes) runs in Supabase Edge Functions using the service-role key, which never reaches the browser.

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | Plain HTML, CSS and JavaScript (no build step) |
| Hosting | GitHub Pages |
| Backend | Supabase Edge Functions (Deno / TypeScript) |
| Database | Supabase Postgres |
| Maps | Leaflet with OpenStreetMap and Esri imagery |
| QR code | qrcodejs |
| PDF export | jsPDF and jsPDF-AutoTable |

## Project structure

```
PMTG_Attendance_System/
├── checkin.html           # Student check-in page
├── display.html           # QR code display for projector or screen
├── admin.html             # Organiser dashboard
├── LOGOPMTG.png           # Original institution logo
├── LOGOPMTG-cropped.png   # Trimmed logo used in headers and the PDF
├── favicon_io/            # Favicons
└── supabase/              # Edge Functions
```

## Credits

**Developed by Ermaan Singh** ([@Ermxxn](https://github.com/Ermxxn)) for **Politeknik METrO Tasek Gelugor (PMTG)**.

Third-party libraries: [Leaflet](https://leafletjs.com), [OpenStreetMap](https://www.openstreetmap.org/copyright), [qrcodejs](https://github.com/davidshimjs/qrcodejs), [jsPDF](https://github.com/parallax/jsPDF), [Supabase](https://supabase.com).

## License and usage

© 2026 Ermaan Singh. Built for PMTG. The Politeknik Malaysia and PMTG name and logo belong to their respective owners and are used here to identify the institution.
