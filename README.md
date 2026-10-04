# VECTRA // 3D IP Intelligence Dashboard

A realistic Flask cybersecurity dashboard using the palette supplied in the design references:

- #042142
- #153C6A
- #2475AC
- #3DE0FC
- #733E85
- #E977F5
- #BC92CD
- #844CAD
- #5F3F96
- #3C2C59
- #0F153A
- #195699
- #307EC0

## Features

- Interactive 3D Earth using Globe.gl / Three.js
- Public IPv4/IPv6 validation
- Approximate IP geolocation and network metadata
- Animated target arc and marker
- ASN, organization, hostname, timezone and location cards
- Local SQLite forensic lookup history
- JSON endpoints: `/api/lookup` and `/api/history`
- Responsive SOC-style interface
- No automatic visitor tracking

## Run

```powershell
py -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
python app.py
```

Open `http://127.0.0.1:5000/`.

For richer IPinfo fields, add an IPinfo token to `.env` as `IPINFO_TOKEN`. Never put the token in frontend JavaScript.

## Important

The 3D globe is a visualization of approximate network geolocation. It does not establish a person's exact physical location. The application only performs lookups for the IP explicitly entered by the operator; it does not silently collect visitors' IP addresses.

Before public deployment, add authentication, CSRF protection for state-changing routes, rate limiting, HTTPS, secret management, and a clear data-retention policy.