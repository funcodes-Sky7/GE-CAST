import os
import sys

# Add project root to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.session import SessionLocal
from app.models.content import Content
from app.models.campaign import Campaign
from app.models.zone import Zone

def seed_acceptance_contents():
    db = SessionLocal()
    try:
        print("🌱 Seeding/Synchronizing Authoritative Content Records...")
        
        # Ensure default fallback content is marked is_default=True
        default_banner = db.query(Content).filter(
            (Content.title.ilike("%default%")) | (Content.file_url.ilike("%default%"))
        ).first()
        if default_banner:
            default_banner.is_default = True
            default_banner.is_active = True
            default_banner.priority = 1
            default_banner.zone_ids = None
            print(f"  ✓ Updated default fallback content: ID {default_banner.id} ({default_banner.title})")
        else:
            default_banner = Content(
                title="GEOCAST Network Default Broadcast",
                description="Global fallback announcement broadcast when outside active geofence coverage",
                file_url="/static/uploads/default_fallback.svg",
                media_type="image",
                file_size=1311,
                duration=3.0,
                is_active=True,
                is_default=True,
                priority=1,
                zone_ids=None
            )
            db.add(default_banner)
            db.flush()
            print(f"  ✓ Created default fallback content: ID {default_banner.id}")

        # Align campaigns if existing
        c7 = db.query(Campaign).filter(Campaign.id == 7).first()
        if c7:
            c7.zone_ids = "2,6"
            c7.name = "Delhi Ad A — Samsung Galaxy Showcase"
        c8 = db.query(Campaign).filter(Campaign.id == 8).first()
        if c8:
            c8.zone_ids = "2,6"
            c8.name = "Delhi Ad B — Coca-Cola Refresh"
        c9 = db.query(Campaign).filter(Campaign.id == 9).first()
        if c9:
            c9.zone_ids = "2,6"
            c9.name = "Delhi Ad C — Delhi Tourism"
        c10 = db.query(Campaign).filter(Campaign.id == 10).first()
        if c10:
            c10.zone_ids = "3,11"
            c10.name = "Mumbai Ad D — Mumbai Business Summit"

        # Deactivate old legacy seed items that were created before zone targeting
        legacy_titles = [
            "Chandigarh City Campaign", "Ambala Local Campaign", "Delhi Metro Campaign",
            "Agra Tourism Campaign", "Jaipur Tourism Campaign", "Lucknow City Campaign",
            "Ahmedabad Business Campaign", "Mumbai City Campaign", "Pune Technology Campaign",
            "Bengaluru Technology Campaign", "Chandigarh Heritage & Tourism",
            "Delhi NCR Capital Transit", "Mumbai Financial Capital Hub"
        ]
        for leg_title in legacy_titles:
            leg_items = db.query(Content).filter(Content.title == leg_title).all()
            for li in leg_items:
                li.is_active = False

        items = [
            {
                "title": "Delhi Ad A — Samsung Galaxy Showcase",
                "file_url": "/static/uploads/samsung_galaxy.svg",
                "zone_ids": "2,6",
                "priority": 8,
                "description": "Next-generation flagship device showcase across Delhi NCR",
                "campaign_id": 7
            },
            {
                "title": "Delhi Ad B — Coca-Cola Refresh",
                "file_url": "/static/uploads/coca_cola.svg",
                "zone_ids": "2,6",
                "priority": 6,
                "description": "Real Magic campaign targeting Delhi transit and bus commuters",
                "campaign_id": 8
            },
            {
                "title": "Delhi Ad C — Delhi Tourism",
                "file_url": "/static/uploads/delhi_tourism.svg",
                "zone_ids": "2,6",
                "priority": 4,
                "description": "Incredible India Capital Heritage and Cultural Attractions",
                "campaign_id": 9
            },
            {
                "title": "Mumbai Ad D — Mumbai Business Summit",
                "file_url": "/static/uploads/mumbai_business.svg",
                "zone_ids": "3,11",
                "priority": 7,
                "description": "Asia Premier Financial & Trade Conference at BKC Mumbai",
                "campaign_id": 10
            },
            {
                "title": "Mumbai Ad E — Mumbai Coastal Hub",
                "file_url": "/static/uploads/mumbai_coast.svg",
                "zone_ids": "3,11",
                "priority": 5,
                "description": "Marine Drive & Coastal Road Waterfront Promotion",
                "campaign_id": None
            },
            {
                "title": "Ad F — Multi-Zone Expressway",
                "file_url": "/static/uploads/delhi_metro.svg",
                "zone_ids": "2,6,3,11",
                "priority": 6,
                "description": "Inter-city transit commercial running simultaneously across Delhi and Mumbai",
                "campaign_id": None
            }
        ]

        for item in items:
            existing = db.query(Content).filter(
                (Content.title == item["title"]) | (Content.file_url == item["file_url"])
            ).first()
            if existing:
                existing.title = item["title"]
                existing.zone_ids = item["zone_ids"]
                existing.priority = item["priority"]
                existing.is_active = True
                existing.is_default = False
                existing.description = item["description"]
                existing.campaign_id = item["campaign_id"]
                print(f"  ✓ Synchronized Content ID {existing.id}: {existing.title} -> Zones [{existing.zone_ids}] (P{existing.priority})")
            else:
                new_c = Content(
                    title=item["title"],
                    file_url=item["file_url"],
                    media_type="image",
                    file_size=2500,
                    duration=3.0,
                    zone_ids=item["zone_ids"],
                    priority=item["priority"],
                    is_active=True,
                    is_default=False,
                    description=item["description"],
                    campaign_id=item["campaign_id"]
                )
                db.add(new_c)
                db.flush()
                print(f"  ✓ Created Content ID {new_c.id}: {new_c.title} -> Zones [{new_c.zone_ids}] (P{new_c.priority})")

        db.commit()
        print("✅ Content database seeding and synchronization completed successfully!")
    except Exception as e:
        db.rollback()
        print(f"❌ Error seeding content: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_acceptance_contents()
