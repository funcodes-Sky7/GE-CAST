import os
import sqlite3
from datetime import datetime

UPLOADS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static", "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)

# 1. Generate High-Quality SVG Assets
SVG_ASSETS = {
    "samsung_galaxy.svg": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="1280" height="720">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#050814"/>
      <stop offset="50%" stop-color="#0a192f"/>
      <stop offset="100%" stop-color="#020c1b"/>
    </linearGradient>
    <linearGradient id="neon" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="50%" stop-color="#818cf8"/>
      <stop offset="100%" stop-color="#c084fc"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="15" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>
  <rect width="1280" height="720" fill="url(#bg)"/>
  
  <!-- Grid lines -->
  <g opacity="0.1" stroke="#38bdf8" stroke-width="1">
    <line x1="0" y1="180" x2="1280" y2="180"/>
    <line x1="0" y1="360" x2="1280" y2="360"/>
    <line x1="0" y1="540" x2="1280" y2="540"/>
    <line x1="320" y1="0" x2="320" y2="720"/>
    <line x1="640" y1="0" x2="640" y2="720"/>
    <line x1="960" y1="0" x2="960" y2="720"/>
  </g>

  <!-- Glowing Accents -->
  <circle cx="1020" cy="360" r="260" fill="#38bdf8" opacity="0.15" filter="url(#glow)"/>
  <circle cx="200" cy="150" r="180" fill="#818cf8" opacity="0.12" filter="url(#glow)"/>

  <!-- Phone Mockup Silhouette -->
  <rect x="880" y="100" width="260" height="520" rx="36" fill="#0f172a" stroke="url(#neon)" stroke-width="4"/>
  <rect x="900" y="125" width="220" height="470" rx="20" fill="#1e293b"/>
  <circle cx="1010" cy="150" r="6" fill="#38bdf8"/>
  <text x="1010" y="360" fill="#ffffff" font-size="28" font-family="system-ui, sans-serif" font-weight="700" text-anchor="middle">S25 ULTRA</text>
  <text x="1010" y="400" fill="#38bdf8" font-size="16" font-family="system-ui, sans-serif" font-weight="600" text-anchor="middle">GALAXY AI</text>

  <!-- Left Content -->
  <rect x="100" y="120" width="170" height="34" rx="17" fill="rgba(56, 189, 248, 0.15)" stroke="#38bdf8" stroke-width="1.5"/>
  <text x="185" y="143" fill="#38bdf8" font-size="14" font-family="system-ui, sans-serif" font-weight="700" text-anchor="middle" letter-spacing="2">CAMPAIGN A</text>

  <text x="100" y="240" fill="#ffffff" font-size="58" font-family="system-ui, sans-serif" font-weight="800">Samsung Galaxy</text>
  <text x="100" y="320" fill="url(#neon)" font-size="64" font-family="system-ui, sans-serif" font-weight="900">S25 Ultra</text>
  
  <text x="100" y="390" fill="#94a3b8" font-size="24" font-family="system-ui, sans-serif" font-weight="400">Welcome to the Era of Mobile AI</text>
  <text x="100" y="430" fill="#cbd5e1" font-size="18" font-family="system-ui, sans-serif">200MP Quad Telephoto · Snapdragon 8 Elite · Titanium Shield</text>

  <rect x="100" y="500" width="460" height="60" rx="12" fill="rgba(15, 23, 42, 0.8)" stroke="#334155" stroke-width="1.5"/>
  <text x="130" y="538" fill="#38bdf8" font-size="16" font-family="system-ui, sans-serif" font-weight="700">TARGET ZONES:</text>
  <text x="270" y="538" fill="#f8fafc" font-size="16" font-family="system-ui, sans-serif" font-weight="600">DELHI NCR &amp; MUMBAI METRO</text>
  
  <rect x="580" y="500" width="140" height="60" rx="12" fill="rgba(56, 189, 248, 0.15)" stroke="#38bdf8" stroke-width="1.5"/>
  <text x="650" y="538" fill="#38bdf8" font-size="16" font-family="system-ui, sans-serif" font-weight="800" text-anchor="middle">PRIORITY 8</text>
</svg>""",

    "coca_cola.svg": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="1280" height="720">
  <defs>
    <linearGradient id="cocabg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#8b0000"/>
      <stop offset="50%" stop-color="#e50914"/>
      <stop offset="100%" stop-color="#b80000"/>
    </linearGradient>
    <linearGradient id="wave" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="rgba(255,255,255,0.2)"/>
      <stop offset="50%" stop-color="rgba(255,255,255,0.6)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0.1)"/>
    </linearGradient>
  </defs>
  <rect width="1280" height="720" fill="url(#cocabg)"/>
  
  <!-- Dynamic Wave ribbon -->
  <path d="M-100,500 C300,300 600,650 1400,350 L1400,720 L-100,720 Z" fill="rgba(255,255,255,0.08)"/>
  <path d="M-100,550 C400,380 700,680 1400,420 L1400,720 L-100,720 Z" fill="rgba(255,255,255,0.15)"/>

  <!-- Left Content -->
  <rect x="100" y="120" width="170" height="34" rx="17" fill="rgba(255, 255, 255, 0.2)" stroke="#ffffff" stroke-width="1.5"/>
  <text x="185" y="143" fill="#ffffff" font-size="14" font-family="system-ui, sans-serif" font-weight="700" text-anchor="middle" letter-spacing="2">CAMPAIGN B</text>

  <text x="100" y="240" fill="#ffffff" font-size="64" font-family="Georgia, serif" font-weight="900" font-style="italic">Coca-Cola</text>
  <text x="100" y="320" fill="#ffe4e6" font-size="52" font-family="system-ui, sans-serif" font-weight="800">Real Magic Everywhere</text>
  
  <text x="100" y="390" fill="#ffffff" font-size="24" font-family="system-ui, sans-serif" font-weight="400">Refresh Your Journey Everyday</text>
  <text x="100" y="430" fill="#ffccd5" font-size="18" font-family="system-ui, sans-serif">Ice-cold refreshment available at all Delhi Metro &amp; Bus stops</text>

  <!-- Big Bottle Graphic Element -->
  <g transform="translate(940, 140)">
    <rect x="60" y="0" width="80" height="440" rx="40" fill="#ffffff" opacity="0.9"/>
    <rect x="70" y="160" width="60" height="120" rx="6" fill="#e50914"/>
    <text x="100" y="230" fill="#ffffff" font-size="18" font-family="Georgia, serif" font-weight="900" font-style="italic" text-anchor="middle" transform="rotate(-90 100 230)">Coke</text>
  </g>

  <rect x="100" y="500" width="400" height="60" rx="12" fill="rgba(0, 0, 0, 0.3)" stroke="rgba(255,255,255,0.4)" stroke-width="1.5"/>
  <text x="130" y="538" fill="#ffffff" font-size="16" font-family="system-ui, sans-serif" font-weight="700">TARGET ZONE:</text>
  <text x="260" y="538" fill="#ffffff" font-size="16" font-family="system-ui, sans-serif" font-weight="600">DELHI ONLY</text>
  
  <rect x="520" y="500" width="140" height="60" rx="12" fill="rgba(255, 255, 255, 0.25)" stroke="#ffffff" stroke-width="1.5"/>
  <text x="590" y="538" fill="#ffffff" font-size="16" font-family="system-ui, sans-serif" font-weight="800" text-anchor="middle">PRIORITY 6</text>
</svg>""",

    "delhi_tourism.svg": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="1280" height="720">
  <defs>
    <linearGradient id="tourbg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2d1b06"/>
      <stop offset="50%" stop-color="#78350f"/>
      <stop offset="100%" stop-color="#451a03"/>
    </linearGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#fde047"/>
      <stop offset="50%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#d97706"/>
    </linearGradient>
  </defs>
  <rect width="1280" height="720" fill="url(#tourbg)"/>
  
  <!-- Architectural Silhouette / Arch -->
  <path d="M780,720 L780,260 Q1000,100 1220,260 L1220,720 Z" fill="rgba(245, 158, 11, 0.12)"/>
  <path d="M830,720 L830,300 Q1000,160 1170,300 L1170,720 Z" fill="rgba(245, 158, 11, 0.18)"/>

  <!-- Left Content -->
  <rect x="100" y="120" width="170" height="34" rx="17" fill="rgba(245, 158, 11, 0.2)" stroke="#f59e0b" stroke-width="1.5"/>
  <text x="185" y="143" fill="#fbbf24" font-size="14" font-family="system-ui, sans-serif" font-weight="700" text-anchor="middle" letter-spacing="2">CAMPAIGN C</text>

  <text x="100" y="240" fill="#ffffff" font-size="54" font-family="Georgia, serif" font-weight="700">Incredible India</text>
  <text x="100" y="320" fill="url(#gold)" font-size="58" font-family="Georgia, serif" font-weight="900">Delhi &amp; Jaipur Heritage</text>
  
  <text x="100" y="390" fill="#fef3c7" font-size="24" font-family="system-ui, sans-serif" font-weight="400">Discover Royal Forts, Monuments &amp; Culture</text>
  <text x="100" y="430" fill="#fde68a" font-size="18" font-family="system-ui, sans-serif">From Red Fort to Hawa Mahal — Travel the Golden Triangle</text>

  <rect x="100" y="500" width="460" height="60" rx="12" fill="rgba(0, 0, 0, 0.4)" stroke="#b45309" stroke-width="1.5"/>
  <text x="130" y="538" fill="#f59e0b" font-size="16" font-family="system-ui, sans-serif" font-weight="700">TARGET ZONES:</text>
  <text x="270" y="538" fill="#ffffff" font-size="16" font-family="system-ui, sans-serif" font-weight="600">DELHI &amp; JAIPUR</text>
  
  <rect x="580" y="500" width="140" height="60" rx="12" fill="rgba(245, 158, 11, 0.2)" stroke="#f59e0b" stroke-width="1.5"/>
  <text x="650" y="538" fill="#fde047" font-size="16" font-family="system-ui, sans-serif" font-weight="800" text-anchor="middle">PRIORITY 4</text>
</svg>""",

    "mumbai_business.svg": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="1280" height="720">
  <defs>
    <linearGradient id="mumbaibg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#090d16"/>
      <stop offset="50%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
    <linearGradient id="emerald" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#10b981"/>
      <stop offset="50%" stop-color="#34d399"/>
      <stop offset="100%" stop-color="#6ee7b7"/>
    </linearGradient>
  </defs>
  <rect width="1280" height="720" fill="url(#mumbaibg)"/>
  
  <!-- Skyline bars -->
  <g opacity="0.25" fill="#34d399">
    <rect x="800" y="300" width="50" height="420" rx="4"/>
    <rect x="860" y="220" width="60" height="500" rx="4"/>
    <rect x="930" y="160" width="70" height="560" rx="4"/>
    <rect x="1010" y="250" width="55" height="470" rx="4"/>
    <rect x="1075" y="190" width="65" height="530" rx="4"/>
    <rect x="1150" y="280" width="60" height="440" rx="4"/>
  </g>

  <!-- Left Content -->
  <rect x="100" y="120" width="170" height="34" rx="17" fill="rgba(16, 185, 129, 0.15)" stroke="#10b981" stroke-width="1.5"/>
  <text x="185" y="143" fill="#34d399" font-size="14" font-family="system-ui, sans-serif" font-weight="700" text-anchor="middle" letter-spacing="2">CAMPAIGN D</text>

  <text x="100" y="240" fill="#ffffff" font-size="52" font-family="system-ui, sans-serif" font-weight="800">Mumbai Global</text>
  <text x="100" y="320" fill="url(#emerald)" font-size="58" font-family="system-ui, sans-serif" font-weight="900">Business Summit 2026</text>
  
  <text x="100" y="390" fill="#94a3b8" font-size="24" font-family="system-ui, sans-serif" font-weight="400">Connecting Capital, Leaders &amp; Innovation</text>
  <text x="100" y="430" fill="#e2e8f0" font-size="18" font-family="system-ui, sans-serif">Bandra-Kurla Complex (BKC) · March 25-28, 2026</text>

  <rect x="100" y="500" width="400" height="60" rx="12" fill="rgba(15, 23, 42, 0.8)" stroke="#334155" stroke-width="1.5"/>
  <text x="130" y="538" fill="#34d399" font-size="16" font-family="system-ui, sans-serif" font-weight="700">TARGET ZONE:</text>
  <text x="260" y="538" fill="#ffffff" font-size="16" font-family="system-ui, sans-serif" font-weight="600">MUMBAI ONLY</text>
  
  <rect x="520" y="500" width="140" height="60" rx="12" fill="rgba(16, 185, 129, 0.15)" stroke="#10b981" stroke-width="1.5"/>
  <text x="590" y="538" fill="#34d399" font-size="16" font-family="system-ui, sans-serif" font-weight="800" text-anchor="middle">PRIORITY 5</text>
</svg>"""
}

for filename, content in SVG_ASSETS.items():
    path = os.path.join(UPLOADS_DIR, filename)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content.strip())
    print(f"[✓] Created SVG banner: {filename}")

# 2. Database Seeding for Acceptance Test Campaigns
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "geocast.db")
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# Ensure priority column exists
try:
    cursor.execute("ALTER TABLE campaigns ADD COLUMN priority INTEGER DEFAULT 5")
    conn.commit()
    print("[✓] Added priority column to campaigns table")
except sqlite3.OperationalError:
    pass

# Acceptance Test Campaigns
DEMO_CAMPAIGNS = [
    {
        "name": "Campaign A — Samsung Galaxy S25 Ultra",
        "description": "Galaxy AI flagship launch targeting premier commercial & transit corridors across Delhi and Mumbai.",
        "media_url": "/static/uploads/samsung_galaxy.svg",
        "zone_ids": "2,6,3,11",  # Delhi NCR (2), Delhi (6), Mumbai Metro (3), Mumbai (11)
        "device_types": "BUS,METRO,TRAIN,KIOSK,BILLBOARD,DIGITAL_SIGNAGE,LED_SCREEN",
        "priority": 8,
        "status": "active"
    },
    {
        "name": "Campaign B — Coca-Cola Refresh Everyday",
        "description": "High-impact summer hydration and refreshment campaign exclusive to Delhi transit and buses.",
        "media_url": "/static/uploads/coca_cola.svg",
        "zone_ids": "2,6",  # Delhi NCR (2), Delhi (6)
        "device_types": "BUS,METRO,TRAIN,KIOSK,BILLBOARD,DIGITAL_SIGNAGE,LED_SCREEN",
        "priority": 6,
        "status": "active"
    },
    {
        "name": "Campaign C — Delhi Tourism Incredible India",
        "description": "Heritage circuit showcase targeting commuters on Delhi and Jaipur arterial routes.",
        "media_url": "/static/uploads/delhi_tourism.svg",
        "zone_ids": "2,6,8",  # Delhi (2, 6) & Jaipur (8)
        "device_types": "BUS,METRO,TRAIN,KIOSK,BILLBOARD,DIGITAL_SIGNAGE,LED_SCREEN",
        "priority": 4,
        "status": "active"
    },
    {
        "name": "Campaign D — Mumbai Business Summit 2026",
        "description": "Elite corporate leadership summit at BKC targeting Mumbai financial district.",
        "media_url": "/static/uploads/mumbai_business.svg",
        "zone_ids": "3,11",  # Mumbai Metro (3), Mumbai (11)
        "device_types": "BUS,METRO,TRAIN,KIOSK,BILLBOARD,DIGITAL_SIGNAGE,LED_SCREEN",
        "priority": 5,
        "status": "active"
    }
]

now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

for camp in DEMO_CAMPAIGNS:
    cursor.execute("SELECT id FROM campaigns WHERE name = ?", (camp["name"],))
    existing = cursor.fetchone()
    if existing:
        cursor.execute("""
            UPDATE campaigns 
            SET description = ?, media_url = ?, zone_ids = ?, device_types = ?, priority = ?, status = ?, updated_at = ?
            WHERE id = ?
        """, (
            camp["description"], camp["media_url"], camp["zone_ids"], 
            camp["device_types"], camp["priority"], camp["status"], now_str, existing[0]
        ))
        print(f"[✓] Updated campaign: {camp['name']} (ID: {existing[0]}, Priority: {camp['priority']}, Zones: {camp['zone_ids']})")
    else:
        cursor.execute("""
            INSERT INTO campaigns (owner_user_id, name, description, media_url, zone_ids, device_types, priority, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            1, camp["name"], camp["description"], camp["media_url"], 
            camp["zone_ids"], camp["device_types"], camp["priority"], camp["status"], now_str, now_str
        ))
        new_id = cursor.lastrowid
        print(f"[✓] Inserted campaign: {camp['name']} (ID: {new_id}, Priority: {camp['priority']}, Zones: {camp['zone_ids']})")

conn.commit()

# Also ensure default fallback content exists in contents table
cursor.execute("SELECT id FROM contents WHERE title LIKE '%Fallback%' OR title LIKE '%Default%'")
fb = cursor.fetchone()
if not fb:
    cursor.execute("""
        INSERT INTO contents (title, description, file_url, media_type, duration, is_default, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        "GEOCAST Network Default Display",
        "Default system standby content for transit screens outside active zones",
        "/static/uploads/default_fallback.svg",
        "image",
        3,
        1,
        1,
        now_str
    ))
    conn.commit()
    print("[✓] Registered default fallback content in contents table")

print("\n--- Active Demo Campaigns in Database ---")
cursor.execute("SELECT id, name, zone_ids, priority, status, media_url FROM campaigns WHERE status = 'active'")
for row in cursor.fetchall():
    print(f"ID: {row[0]} | {row[1]} | Zones: {row[2]} | Priority: {row[3]} | Status: {row[4]}")

conn.close()
print("\n[✓] Demo seeding completed successfully!")
