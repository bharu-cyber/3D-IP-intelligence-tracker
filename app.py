import ipaddress
import os
import sqlite3
from datetime import datetime, timezone

import requests
from dotenv import load_dotenv
from flask import Flask, jsonify, render_template, request

load_dotenv()

app = Flask(__name__)
DB = os.getenv('DATABASE_PATH', 'ip_tracker.db')
IPINFO_TOKEN = os.getenv('IPINFO_TOKEN', '').strip()
TIMEOUT = int(os.getenv('IPINFO_TIMEOUT', '8'))


def db():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = db()
    conn.execute('''CREATE TABLE IF NOT EXISTS lookups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ip TEXT NOT NULL,
        country TEXT,
        region TEXT,
        city TEXT,
        timezone TEXT,
        org TEXT,
        hostname TEXT,
        asn TEXT,
        latitude REAL,
        longitude REAL,
        queried_at TEXT NOT NULL
    )''')
    conn.commit(); conn.close()


def parse_ip(value):
    try:
        return ipaddress.ip_address((value or '').strip())
    except ValueError:
        return None


def ip_class(ip):
    if ip.is_loopback: return 'LOOPBACK'
    if ip.is_private: return 'PRIVATE'
    if ip.is_reserved: return 'RESERVED'
    if ip.is_link_local: return 'LINK-LOCAL'
    if ip.is_multicast: return 'MULTICAST'
    if ip.is_unspecified: return 'UNSPECIFIED'
    return 'PUBLIC'


def upstream(ip):
    params = {'token': IPINFO_TOKEN} if IPINFO_TOKEN else {}
    r = requests.get(
        f'https://ipinfo.io/{ip}/json',
        params=params,
        timeout=TIMEOUT,
        headers={'User-Agent': 'IP-Tracker-3D-Educational/1.0'}
    )
    r.raise_for_status()
    data = r.json()
    if data.get('error'):
        raise RuntimeError(data['error'].get('message', 'IP lookup failed'))
    return data


def normalize(data, ip_obj):
    lat = lon = None
    if ',' in data.get('loc', ''):
        try:
            lat, lon = [float(x.strip()) for x in data['loc'].split(',', 1)]
        except ValueError:
            pass
    org = data.get('org', '')
    asn = org.split(' ', 1)[0] if org.startswith('AS') else ''
    return {
        'ip': data.get('ip', str(ip_obj)),
        'hostname': data.get('hostname') or '—',
        'city': data.get('city') or '—',
        'region': data.get('region') or '—',
        'country': data.get('country') or '—',
        'timezone': data.get('timezone') or '—',
        'org': org or '—',
        'asn': asn or '—',
        'latitude': lat,
        'longitude': lon,
        'type': ip_class(ip_obj),
        'global': ip_obj.is_global,
    }


def save(r):
    conn = db()
    conn.execute('''INSERT INTO lookups
        (ip,country,region,city,timezone,org,hostname,asn,latitude,longitude,queried_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)''', (
        r['ip'], r['country'], r['region'], r['city'], r['timezone'], r['org'],
        r['hostname'], r['asn'], r['latitude'], r['longitude'],
        datetime.now(timezone.utc).isoformat(timespec='seconds')
    ))
    conn.commit(); conn.close()


@app.get('/')
def home():
    conn = db()
    rows = conn.execute('SELECT * FROM lookups ORDER BY id DESC LIMIT 8').fetchall()
    conn.close()
    return render_template('index.html', history=rows)


@app.get('/api/lookup')
def api_lookup():
    raw = request.args.get('ip', '')
    ip_obj = parse_ip(raw)
    if not ip_obj:
        return jsonify({'error': 'Invalid IPv4 or IPv6 address'}), 400

    if not ip_obj.is_global:
        return jsonify({
            'ip': str(ip_obj), 'type': ip_class(ip_obj), 'global': False,
            'message': 'Non-global address. External geolocation was skipped.'
        })

    try:
        result = normalize(upstream(str(ip_obj)), ip_obj)
        save(result)
        return jsonify(result)
    except requests.RequestException:
        return jsonify({'error': 'Upstream IP intelligence service unavailable'}), 502
    except RuntimeError as exc:
        return jsonify({'error': str(exc)}), 502


@app.get('/api/history')
def api_history():
    conn = db()
    rows = conn.execute('SELECT * FROM lookups ORDER BY id DESC LIMIT 30').fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.get('/health')
def health():
    return jsonify({'status': 'ok'})


init_db()

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=int(os.getenv('PORT', '5000')), debug=False)
